import { CalendarDays, Lightbulb, MessageSquare, ShieldAlert, Star, Users } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { countRows, listRows } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

type Ticket = { id: string; subject?: string; status?: string; created_at?: string; type?: string };

export default async function AdminOverviewPage() {
  const session = await requireAdmin();
  const [users, proUsers, openTickets, resolvedTickets, pendingDeletions, featureRequests, recentTickets] = await Promise.all([
    countRows("users"),
    countRows("user_subscription_metadata", (query) => query.eq("is_pro", true)),
    countRows("support_tickets", (query) => query.in("status", ["open", "reviewing"])),
    countRows("support_tickets", (query) => query.in("status", ["resolved", "closed"])),
    countRows("account_deletion_requests", (query) => query.in("status", ["pending", "processing"])),
    countRows("feature_requests"),
    listRows<Ticket>("support_tickets", "created_at", 5)
  ]);

  return (
    <AdminShell session={session}>
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-black">Overview</h1>
        <p className="mt-2 text-muted-foreground">Operational pulse for Vet Tech Companion.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Users} label="Total users" value={users} />
        <StatCard icon={Star} label="Pro users" value={proUsers} />
        <StatCard icon={MessageSquare} label="Open tickets" value={openTickets} />
        <StatCard icon={CalendarDays} label="Resolved tickets" value={resolvedTickets} />
        <StatCard icon={ShieldAlert} label="Pending deletions" value={pendingDeletions} />
        <StatCard icon={Lightbulb} label="Feature requests" value={featureRequests} />
      </div>
      <Card className="p-6">
        <h2 className="text-xl font-black">Recent support tickets</h2>
        <div className="mt-4 grid gap-3">
          {recentTickets.map((ticket) => (
            <div className="rounded-md border bg-background p-4" key={ticket.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-black">{ticket.subject || ticket.type || "Support ticket"}</p>
                <p className="text-xs font-bold text-muted-foreground">{formatDate(ticket.created_at)}</p>
              </div>
              <p className="mt-1 text-sm font-bold text-primary">{ticket.status}</p>
            </div>
          ))}
          {!recentTickets.length ? <p className="text-muted-foreground">No tickets available yet.</p> : null}
        </div>
      </Card>
    </div>
    </AdminShell>
  );
}
