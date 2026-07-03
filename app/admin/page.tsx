import { Database, MessageSquare, ShieldAlert } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { countRows, listRows } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type Ticket = { id: string; subject?: string; status?: string; created_at?: string; type?: string };
type AppVersionInfo = {
  latestVersion: string;
  minimumRequiredVersion: string;
  platform: "ios" | "android";
};
type ContentInfo = {
  count: number;
  label: string;
  table: string;
  version: number | string;
};
type ContentVersionRow = {
  content_type: string;
  version: number;
};

const contentSections = [
  { label: "Drugs", showCount: true, table: "drugs", versionKey: "drugs" },
  { label: "Diseases", showCount: true, table: "diseases", versionKey: "diseases" },
  { label: "Vaccines", showCount: true, table: "vaccines", versionKey: "vaccines" },
  { label: "Emergencies", showCount: true, table: "emergency_cards", versionKey: "emergency_cards" },
  { label: "Normal values", showCount: false, table: "normal_values", versionKey: "normal_values" }
];

function statusTone(status?: string | null) {
  if (status === "resolved" || status === "closed") return "success";
  if (status === "reviewing") return "warning";
  return "info";
}

async function getContentInfo(): Promise<ContentInfo[]> {
  const supabase = createSupabaseAdminClient();
  const { data: versions, error } = await supabase
    .from("content_versions")
    .select("content_type, version");

  if (error && process.env.NODE_ENV !== "production") {
    console.info("Content versions unavailable:", error.message);
  }

  const versionsByType = new Map(
    ((versions ?? []) as ContentVersionRow[]).map((item) => [item.content_type, item.version])
  );

  return Promise.all(
    contentSections.map(async (section) => {
      const count = section.showCount ? await countRows(section.table) : 0;

      return {
        count,
        label: section.label,
        table: section.table,
        version: versionsByType.get(section.versionKey) ?? "unavailable"
      };
    })
  );
}

async function getAppVersions(): Promise<AppVersionInfo[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_versions")
    .select("platform, latest_version, minimum_required_version")
    .in("platform", ["ios", "android"])
    .order("platform", { ascending: false });

  if (error && process.env.NODE_ENV !== "production") {
    console.info("App versions unavailable:", error.message);
  }

  return ((data ?? []) as Array<{
    latest_version: string;
    minimum_required_version: string;
    platform: "ios" | "android";
  }>).map((row) => ({
    latestVersion: row.latest_version,
    minimumRequiredVersion: row.minimum_required_version,
    platform: row.platform
  }));
}

export default async function AdminOverviewPage() {
  const session = await requireAdmin();
  const [openTickets, pendingDeletions, recentTickets, contentInfo, appVersions] = await Promise.all([
    countRows("support_tickets", (query) => query.in("status", ["open", "reviewing"])),
    countRows("account_deletion_requests", (query) => query.in("status", ["pending", "processing"])),
    listRows<Ticket>("support_tickets", "created_at", 3),
    getContentInfo(),
    getAppVersions()
  ]);

  return (
    <AdminShell session={session}>
    <div className="grid gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Overview</h1>
          <p className="mt-2 text-muted-foreground">Operational pulse for Vet Tech Companion.</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 text-right shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">App version</p>
          <div className="mt-2 grid gap-1">
            {appVersions.map((version) => (
              <p className="text-sm font-black" key={version.platform}>
                {version.platform.toUpperCase()} {version.latestVersion}
              </p>
            ))}
            {!appVersions.length ? (
              <p className="text-sm font-semibold text-muted-foreground">Unavailable</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="grid gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black">Last 3 tickets</h2>
                <p className="text-sm text-muted-foreground">Newest support requests at a glance.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {recentTickets.map((ticket) => (
                <div className="grid gap-2 rounded-md border bg-background p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center" key={ticket.id}>
                  <p className="truncate font-semibold">{ticket.subject || ticket.type || "Support ticket"}</p>
                  <Badge tone={statusTone(ticket.status)}>{ticket.status ?? "open"}</Badge>
                  <p className="text-xs text-muted-foreground">{formatDate(ticket.created_at)}</p>
                </div>
              ))}
              {!recentTickets.length ? <p className="text-muted-foreground">No tickets available yet.</p> : null}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black">Database info</h2>
                <p className="text-sm text-muted-foreground">Reference content counts and deployed versions.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {contentInfo.map((item) => (
                <div className="grid gap-2 rounded-md border bg-background p-4 sm:grid-cols-[170px_1fr_auto]" key={item.table}>
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.table === "normal_values" ? "Reference ranges" : `${item.count} items`}
                  </p>
                  <p className="text-sm font-semibold text-primary">version {item.version}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="grid content-start gap-4">
          <Card className="p-5">
            <p className="text-sm font-semibold text-muted-foreground">Open tickets</p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <MessageSquare className="text-primary" size={22} />
              <p className="text-3xl font-black">{openTickets}</p>
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold text-muted-foreground">Pending deletions</p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <ShieldAlert className="text-primary" size={22} />
              <p className="text-3xl font-black">{pendingDeletions}</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
    </AdminShell>
  );
}
