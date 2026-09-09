import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MousePointerClick, ReceiptText, UsersRound, WalletCards } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { CopyReferralButton } from "@/components/admin/copy-referral-button";
import { PartnerSettingsModal } from "@/components/admin/partner-settings-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildAppStoreCampaignUrl,
  buildGooglePlayReferralUrl,
  buildReferralUrl,
  type PartnerRecord
} from "@/lib/referrals";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type ClickRecord = {
  click_id?: string | null;
  created_at?: string | null;
  destination?: string | null;
  platform_detected?: string | null;
};

type AttributionRecord = {
  attribution_confidence?: string | null;
  attributed_at?: string | null;
  commission_model?: string | null;
  platform?: string | null;
  source?: string | null;
  user_id?: string | null;
};

type CommissionRecord = {
  commission_amount?: number | string | null;
  commission_type?: string | null;
  created_at?: string | null;
  payout_period_month?: number | null;
  payout_period_year?: number | null;
  plan_type?: string | null;
  status?: string | null;
  transaction_date?: string | null;
};

async function safeCount(table: string, partnerId: string) {
  const supabase = createSupabaseAdminClient();
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("partner_id", partnerId);
  return count ?? 0;
}

async function safeRows<T>(table: string, partnerId: string, orderColumn: string, limit: number) {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq("partner_id", partnerId)
      .order(orderColumn, { ascending: false })
      .limit(limit);
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

function maskedCustomer(userId?: string | null) {
  if (!userId) return "Customer unknown";
  return `Customer #${userId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export default async function PartnerAdminDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { data: partner } = await supabase.from("partners").select("*").eq("slug", slug).maybeSingle();

  if (!partner) {
    notFound();
  }

  const typedPartner = partner as PartnerRecord;
  const [linkVisits, attributedUsers, commissionEvents, recentClicks, recentAttributions, recentCommissions] = await Promise.all([
    safeCount("partner_link_clicks", typedPartner.id),
    safeCount("user_partner_attributions", typedPartner.id),
    safeCount("partner_commission_events", typedPartner.id),
    safeRows<ClickRecord>("partner_link_clicks", typedPartner.id, "created_at", 10),
    safeRows<AttributionRecord>("user_partner_attributions", typedPartner.id, "attributed_at", 10),
    safeRows<CommissionRecord>("partner_commission_events", typedPartner.id, "transaction_date", 10)
  ]);

  const referralUrl = buildReferralUrl(typedPartner.slug);
  const googleUrl = buildGooglePlayReferralUrl(typedPartner);
  const appStoreUrl = buildAppStoreCampaignUrl(typedPartner);

  return (
    <AdminShell session={session}>
      <div className="grid gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/admin/partners"><ArrowLeft size={16} />Back to partners</Link>
            </Button>
            <h1 className="mt-3 text-3xl font-black">{typedPartner.name}</h1>
            <p className="mt-2 text-muted-foreground">Referral dashboard foundation and partner configuration.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={typedPartner.status === "active" ? "success" : typedPartner.status === "paused" ? "warning" : "default"}>
              {typedPartner.status ?? "active"}
            </Badge>
            <PartnerSettingsModal partner={typedPartner} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-5"><p className="flex items-center gap-2 text-sm font-black text-primary"><MousePointerClick size={16} />Link visits</p><p className="mt-2 text-3xl font-black">{linkVisits}</p></Card>
          <Card className="p-5"><p className="flex items-center gap-2 text-sm font-black text-primary"><UsersRound size={16} />Attributed users</p><p className="mt-2 text-3xl font-black">{attributedUsers}</p></Card>
          <Card className="p-5"><p className="flex items-center gap-2 text-sm font-black text-primary"><ReceiptText size={16} />Commission events</p><p className="mt-2 text-3xl font-black">{commissionEvents}</p></Card>
          <Card className="p-5"><p className="flex items-center gap-2 text-sm font-black text-primary"><WalletCards size={16} />Payout model</p><p className="mt-2 text-lg font-black">Manual monthly</p></Card>
        </div>

        <Card className="p-5">
          <h2 className="text-xl font-black">Referral links</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <p className="break-all"><span className="font-black text-primary">Public:</span> {referralUrl}</p>
            <p className="break-all"><span className="font-black text-primary">Google Play:</span> {googleUrl}</p>
            <p className="break-all"><span className="font-black text-primary">App Store:</span> {appStoreUrl}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <CopyReferralButton value={referralUrl} />
            <Button asChild variant="outline"><a href={referralUrl} rel="noreferrer" target="_blank">Open /r link<ExternalLink size={16} /></a></Button>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-5">
            <h2 className="text-lg font-black">Recent visits</h2>
            <div className="mt-4 max-h-[252px] overflow-y-auto pr-2 grid gap-3 text-sm">
              {recentClicks.map((click) => (
                <div className="rounded-md border bg-background p-3" key={click.click_id}>
                  <p className="font-black">{click.platform_detected ?? "unknown"}</p>
                  <p className="break-all text-xs text-muted-foreground">{click.click_id}</p>
                  <p className="text-xs font-bold text-muted-foreground">{formatDate(click.created_at)}</p>
                </div>
              ))}
              {!recentClicks.length ? <p className="text-muted-foreground">No visits recorded yet.</p> : null}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-black">Recent attributions</h2>
            <div className="mt-4 max-h-[252px] overflow-y-auto pr-2 grid gap-3 text-sm">
              {recentAttributions.map((attribution) => (
                <div className="rounded-md border bg-background p-3" key={attribution.user_id}>
                  <p className="font-black">{maskedCustomer(attribution.user_id)}</p>
                  <p className="text-xs text-muted-foreground">{attribution.platform} - {attribution.source} - {attribution.attribution_confidence}</p>
                  <p className="text-xs font-bold text-muted-foreground">{formatDate(attribution.attributed_at)}</p>
                </div>
              ))}
              {!recentAttributions.length ? <p className="text-muted-foreground">No users attributed yet.</p> : null}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-black">Recent commission ledger</h2>
            <div className="mt-4 max-h-[252px] overflow-y-auto pr-2 grid gap-3 text-sm">
              {recentCommissions.map((event) => (
                <div className="rounded-md border bg-background p-3" key={`${event.commission_type}-${event.transaction_date}`}>
                  <p className="font-black">{event.plan_type} - {event.commission_type}</p>
                  <p className="text-xs text-muted-foreground">{event.payout_period_month}/{event.payout_period_year} - {event.status}</p>
                  <p className="text-sm font-black text-primary">${Number(event.commission_amount ?? 0).toFixed(2)}</p>
                  <p className="text-xs font-bold text-muted-foreground">{formatDate(event.transaction_date)}</p>
                </div>
              ))}
              {!recentCommissions.length ? <p className="text-muted-foreground">No commission events yet.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
