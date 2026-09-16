import { HandCoins, ReceiptText, WalletCards } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { CommissionReprocessButton } from "@/components/admin/commission-reprocess-button";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getBusinessPayoutPeriod, maskCustomerId } from "@/lib/commissions";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type PartnerRow = { id: string; name: string; slug: string };
type CommissionRow = {
  commission_amount: number | string;
  commission_type: string;
  effective_at: string | null;
  id: string;
  partner_id: string;
  plan_type: string | null;
  platform: string | null;
  source_transaction_id: string | null;
  status: string | null;
  user_id: string;
};
type PayoutRow = {
  net_amount: number | string | null;
  partner_id: string;
  status: string | null;
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(value);
}

function amount(row: Pick<CommissionRow, "commission_amount">) {
  return Number(row.commission_amount ?? 0);
}

function statusTone(status?: string | null) {
  if (status === "posted") return "success";
  if (status === "void") return "danger";
  return "default";
}

export default async function CommissionsAdminPage() {
  const session = await requireAdmin("admin");
  const supabase = createSupabaseAdminClient();
  const currentPeriod = getBusinessPayoutPeriod(new Date().toISOString());
  const [{ data: partners }, { data: commissions }, { data: payouts }] = await Promise.all([
    supabase.from("partners").select("id, name, slug").order("name", { ascending: true }),
    supabase
      .from("partner_commission_events")
      .select("id, partner_id, user_id, commission_type, commission_amount, plan_type, platform, source_transaction_id, effective_at, status")
      .neq("status", "void")
      .order("effective_at", { ascending: false })
      .limit(250),
    supabase.from("partner_payouts").select("partner_id, net_amount, status")
  ]);

  const partnerRows = (partners ?? []) as PartnerRow[];
  const commissionRows = (commissions ?? []) as CommissionRow[];
  const payoutRows = (payouts ?? []) as PayoutRow[];
  const paidLifetime = payoutRows.filter((payout) => payout.status === "paid").reduce((sum, payout) => sum + Number(payout.net_amount ?? 0), 0);
  const lifetimeCommission = commissionRows.reduce((sum, row) => sum + amount(row), 0);
  const currentMonthRows = commissionRows.filter((row) => {
    if (!row.effective_at) return false;
    const period = getBusinessPayoutPeriod(row.effective_at);
    return period.year === currentPeriod.year && period.month === currentPeriod.month;
  });
  const currentMonthCommission = currentMonthRows.reduce((sum, row) => sum + amount(row), 0);

  const partnerSummaries = partnerRows.map((partner) => {
    const rows = commissionRows.filter((row) => row.partner_id === partner.id);
    const currentRows = currentMonthRows.filter((row) => row.partner_id === partner.id);
    const paidRows = payoutRows.filter((row) => row.partner_id === partner.id && row.status === "paid");
    const paid = paidRows.reduce((sum, payout) => sum + Number(payout.net_amount ?? 0), 0);
    const lifetime = rows.reduce((sum, row) => sum + amount(row), 0);
    const current = currentRows.reduce((sum, row) => sum + amount(row), 0);

    return { current, lifetime, paid, partner, pending: lifetime - paid };
  });

  return (
    <AdminShell session={session}>
      <div className="grid gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Partner Commissions</h1>
            <p className="mt-2 text-muted-foreground">Auditable commission ledger generated from production RevenueCat transactions.</p>
          </div>
          <CommissionReprocessButton />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={HandCoins} label="Current month" value={currency(currentMonthCommission)} />
          <StatCard icon={ReceiptText} label="Pending ledger" value={currency(lifetimeCommission - paidLifetime)} />
          <StatCard icon={WalletCards} label="Paid lifetime" value={currency(paidLifetime)} />
          <StatCard icon={HandCoins} label="Lifetime commission" value={currency(lifetimeCommission)} />
        </div>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-black">Partner totals</h2>
            <p className="mt-1 text-sm text-muted-foreground">Current month remains dynamic until a payout period is manually finalized later.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Partner</th>
                  <th className="px-5 py-3">Current Month</th>
                  <th className="px-5 py-3">Pending</th>
                  <th className="px-5 py-3">Paid Lifetime</th>
                  <th className="px-5 py-3">Lifetime</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {partnerSummaries.map((summary) => (
                  <tr className="bg-background" key={summary.partner.id}>
                    <td className="px-5 py-4 font-black">{summary.partner.name}</td>
                    <td className="px-5 py-4">{currency(summary.current)}</td>
                    <td className="px-5 py-4">{currency(summary.pending)}</td>
                    <td className="px-5 py-4">{currency(summary.paid)}</td>
                    <td className="px-5 py-4">{currency(summary.lifetime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-black">Latest ledger events</h2>
            <p className="mt-1 text-sm text-muted-foreground">Customer IDs are masked for admin support and audit use.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Platform</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Transaction</th>
                  <th className="px-5 py-3">Effective</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {commissionRows.slice(0, 100).map((row) => (
                  <tr className="bg-background align-top" key={row.id}>
                    <td className="px-5 py-4 font-black">{maskCustomerId(row.user_id)}</td>
                    <td className="px-5 py-4">{row.commission_type}</td>
                    <td className="px-5 py-4">{row.platform ?? "unknown"}</td>
                    <td className="px-5 py-4">{row.plan_type ?? "-"}</td>
                    <td className="break-all px-5 py-4 text-xs text-muted-foreground">{row.source_transaction_id ?? "-"}</td>
                    <td className="px-5 py-4">{formatDate(row.effective_at)}</td>
                    <td className="px-5 py-4 font-black text-primary">{currency(amount(row))}</td>
                    <td className="px-5 py-4"><Badge tone={statusTone(row.status)}>{row.status ?? "posted"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!commissionRows.length ? <div className="p-8 text-center text-muted-foreground">No commission ledger events yet.</div> : null}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}