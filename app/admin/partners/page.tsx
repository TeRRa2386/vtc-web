import Link from "next/link";
import { ArrowRight, MousePointerClick, Plus, UsersRound } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { PartnerForm } from "@/components/admin/partner-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { countRows, listRows } from "@/lib/admin-data";
import { buildReferralUrl, type PartnerRecord } from "@/lib/referrals";
import { requireAdmin } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

function statusTone(status?: string | null) {
  if (status === "active") return "success";
  if (status === "paused") return "warning";
  return "default";
}

export default async function PartnersAdminPage() {
  const session = await requireAdmin();
  const [partners, totalClicks, totalAttributedUsers] = await Promise.all([
    listRows<PartnerRecord>("partners", "created_at", 100),
    countRows("partner_link_clicks"),
    countRows("user_partner_attributions")
  ]);

  return (
    <AdminShell session={session}>
      <div className="grid gap-6">
        <div>
          <h1 className="text-3xl font-black">Partners</h1>
          <p className="mt-2 text-muted-foreground">Manage referral partners, tracking links, and attribution foundations.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm font-black text-primary">Partners</p>
            <p className="mt-2 text-3xl font-black">{partners.length}</p>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-black text-primary"><MousePointerClick size={16} />Link visits</p>
            <p className="mt-2 text-3xl font-black">{totalClicks}</p>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-black text-primary"><UsersRound size={16} />Attributed users</p>
            <p className="mt-2 text-3xl font-black">{totalAttributedUsers}</p>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Plus size={20} />New partner</h2>
          <PartnerForm />
        </Card>

        <div className="grid gap-4">
          {partners.map((partner) => (
            <Card className="p-5" key={partner.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={statusTone(partner.status)}>{partner.status ?? "active"}</Badge>
                    <Badge>{partner.android_referrer_code}</Badge>
                  </div>
                  <h2 className="mt-3 text-2xl font-black">{partner.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">{partner.group_name || "No group name"}</p>
                  <p className="mt-2 break-all text-sm text-muted-foreground">{buildReferralUrl(partner.slug)}</p>
                  <p className="mt-2 text-xs font-bold text-muted-foreground">Created {formatDate(partner.created_at)}</p>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/admin/partners/${partner.slug}`}>
                    Open dashboard
                    <ArrowRight size={17} />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
          {!partners.length ? (
            <Card className="p-8 text-center text-muted-foreground">
              No partners yet. Create the first one above after running the Phase 1 SQL.
            </Card>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
