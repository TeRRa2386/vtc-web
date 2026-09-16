import { CheckCircle2, CircleDollarSign, Clock3, ExternalLink, HandCoins, Info, LinkIcon, UsersRound } from "lucide-react";

import { PartnerCopyButton } from "@/components/partner/partner-copy-button";
import { PartnerShell } from "@/components/partner/partner-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { currency, getPartnerPortalData } from "@/lib/partner-portal";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requirePartnerAccess } from "@/lib/supabase/partner";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ month?: string }>;
};

function statusTone(status?: string | null) {
  if (status === "paid") return "success";
  if (status === "pending") return "warning";
  return "default";
}

function SourceSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default async function PartnerPortalDashboardPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const access = await requirePartnerAccess(slug);
  const supabase = createSupabaseAdminClient();
  const data = await getPartnerPortalData(supabase, access.partnerId, query.month);

  return (
    <PartnerShell access={access}>
      <div className="grid gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Partner Portal</h1>
            <p className="mt-2 text-muted-foreground">Referral performance and earnings for {data.partner.name}.</p>
          </div>
          <Badge tone={data.partner.status === "active" ? "success" : data.partner.status === "paused" ? "warning" : "default"}>
            {data.partner.status}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-black text-primary"><HandCoins size={16} />Current Month</p>
            <p className="mt-2 text-3xl font-black">{currency(data.currentMonthCommission)}</p>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-black text-primary"><Clock3 size={16} />Pending Commission</p>
            <p className="mt-2 text-3xl font-black">{currency(data.pendingCommission)}</p>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-black text-primary"><CircleDollarSign size={16} />Lifetime Earned</p>
            <p className="mt-2 text-3xl font-black">{currency(data.lifetimeCommission)}</p>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-black text-primary"><CheckCircle2 size={16} />Total Paid</p>
            <p className="mt-2 text-3xl font-black">{currency(data.paidLifetime)}</p>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <h2 className="text-xl font-black">Referral performance</h2>
            <div className="mt-4 grid gap-3">
              <SourceSummary label="Total attributed users" value={String(data.referralSummary.totalAttributedUsers)} />
              <SourceSummary label="Paying referred customers" value={String(data.referralSummary.payingReferredCustomers)} />
              <SourceSummary label="Active paying customers" value={String(data.referralSummary.activePayingCustomers)} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-xl font-black">Android</h2>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">Verified via Google Play Install Referrer.</p>
            <div className="mt-4 grid gap-3">
              <SourceSummary label="Attributed users" value={String(data.platformBreakdown.android.attributedUsers)} />
              <SourceSummary label="Paying users" value={String(data.platformBreakdown.android.payingUsers)} />
              <SourceSummary label="Commission" value={currency(data.platformBreakdown.android.commission)} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-xl font-black">iOS</h2>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">Verified via Partner Referral Code.</p>
            <div className="mt-4 grid gap-3">
              <SourceSummary label="Attributed users" value={String(data.platformBreakdown.ios.attributedUsers)} />
              <SourceSummary label="Paying users" value={String(data.platformBreakdown.ios.payingUsers)} />
              <SourceSummary label="Commission" value={currency(data.platformBreakdown.ios.commission)} />
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden" id="monthly-earnings">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
            <div>
              <h2 className="text-xl font-black">Monthly earnings</h2>
              <p className="mt-1 text-sm text-muted-foreground">Amounts are read from the commission ledger and payout records.</p>
            </div>
            <form>
              <div className="flex gap-2">
                <Select className="min-w-48" defaultValue={data.selectedMonth.value} name="month">
                  {data.availableMonths.map((month) => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </Select>
                <button className="min-h-10 rounded-md border bg-card px-4 py-2 text-sm font-bold hover:bg-muted" type="submit">
                  View
                </button>
              </div>
            </form>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-5">
            <SourceSummary label="Monthly commissions" value={currency(data.selectedMonth.monthly)} />
            <SourceSummary label="Annual commissions" value={currency(data.selectedMonth.annual)} />
            <SourceSummary label="Adjustments" value={currency(data.selectedMonth.adjustments)} />
            <SourceSummary label="Net earned" value={currency(data.selectedMonth.net)} />
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-bold uppercase text-muted-foreground">Payout status</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(data.selectedMonth.payout.status)}>{data.selectedMonth.payout.status}</Badge>
                {data.selectedMonth.payout.paidAt ? (
                  <span className="text-xs font-semibold text-muted-foreground">Paid {formatDate(data.selectedMonth.payout.paidAt)}</span>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-black">Commission detail</h2>
            <p className="mt-1 text-sm text-muted-foreground">Customer identifiers are masked and personal data is not shown.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Platform</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.transactions.map((row) => (
                  <tr className="bg-background align-top" key={`${row.customer}-${row.date}-${row.amount}-${row.description}`}>
                    <td className="px-5 py-4 font-black">{row.customer}</td>
                    <td className="px-5 py-4">{row.platform}</td>
                    <td className="px-5 py-4">{row.planType}</td>
                    <td className="px-5 py-4">{row.paymentLabel}</td>
                    <td className="px-5 py-4">{row.date}</td>
                    <td className="px-5 py-4 font-black text-primary">{currency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.transactions.length ? (
              <div className="p-8 text-center text-muted-foreground">No commission activity for this month yet.</div>
            ) : null}
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="border-b p-5">
              <h2 className="text-xl font-black">Customer commission progress</h2>
              <p className="mt-1 text-sm text-muted-foreground">Progress is based on the first paid commission model.</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {data.progress.map((row) => (
                <div className="grid gap-2 border-b p-5 last:border-b-0 sm:grid-cols-5" key={row.customer}>
                  <p className="font-black">{row.customer}</p>
                  <p>{row.planType}</p>
                  <p>{row.progressLabel}</p>
                  <p>{currency(row.currentCommission)}</p>
                  <p className="text-sm text-muted-foreground">{row.status} - {row.eligibleUntil}</p>
                </div>
              ))}
              {!data.progress.length ? <div className="p-8 text-center text-muted-foreground">No paying referred customers yet.</div> : null}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b p-5">
              <h2 className="text-xl font-black">Payout history</h2>
              <p className="mt-1 text-sm text-muted-foreground">Paid periods keep their finalized historical amount.</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {data.payoutHistory.map((row) => (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5 last:border-b-0" key={row.value}>
                  <div>
                    <p className="font-black">{row.label}</p>
                    {row.paidAt ? <p className="text-xs font-semibold text-muted-foreground">Paid {formatDate(row.paidAt)}</p> : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-black">{currency(row.amount)}</p>
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </div>
                </div>
              ))}
              {!data.payoutHistory.length ? <div className="p-8 text-center text-muted-foreground">No payout history yet.</div> : null}
            </div>
          </Card>
        </div>

        <Card className="p-5" id="referral-tools">
          <h2 className="flex items-center gap-2 text-xl font-black"><LinkIcon size={19} />Referral tools</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <p className="break-all"><span className="font-black text-primary">Partner Referral Link:</span> {data.partner.referralUrl}</p>
            <p><span className="font-black text-primary">Referral Code:</span> {data.partner.referralCode}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <PartnerCopyButton label="Copy Link" value={data.partner.referralUrl} />
            <PartnerCopyButton label="Copy Code" value={data.partner.referralCode} />
            <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-bold hover:bg-muted" href={data.partner.referralUrl} rel="noreferrer" target="_blank">
              Open Link
              <ExternalLink size={16} />
            </a>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-xl font-black"><Info size={19} />Apple Campaign Performance</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Not yet available. Apple Campaign Analytics will remain separate from verified individual referral commissions.
          </p>
        </Card>
      </div>
    </PartnerShell>
  );
}
