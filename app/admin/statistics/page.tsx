import { BarChart3, Bell, MessageSquare, ShieldAlert, Smartphone, Star, Users } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { countRows } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/supabase/admin";

export default async function StatisticsAdminPage() {
  const session = await requireAdmin();
  const [totalUsers, proUsers, openTickets, resolvedTickets, pendingDeletions, featureRequests, announcements] = await Promise.all([
    countRows("users"),
    countRows("user_subscription_metadata", (query) => query.eq("is_pro", true)),
    countRows("support_tickets", (query) => query.in("status", ["open", "reviewing"])),
    countRows("support_tickets", (query) => query.in("status", ["resolved", "closed"])),
    countRows("account_deletion_requests", (query) => query.in("status", ["pending", "processing"])),
    countRows("feature_requests"),
    countRows("app_announcements", (query) => query.eq("is_active", true))
  ]);

  return (
    <AdminShell session={session}>
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">Statistics</h1>
        <p className="mt-2 text-muted-foreground">Operational counters. Platform and version distributions are ready for app event data once the mobile app starts sending it.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Users} label="Total users" value={totalUsers} />
        <StatCard icon={Star} label="Pro users" value={proUsers} />
        <StatCard icon={MessageSquare} label="Open tickets" value={openTickets} />
        <StatCard icon={BarChart3} label="Resolved tickets" value={resolvedTickets} />
        <StatCard icon={ShieldAlert} label="Pending deletion requests" value={pendingDeletions} />
        <StatCard icon={Bell} label="Active announcements" value={announcements} />
        <StatCard icon={Smartphone} label="Feature requests" value={featureRequests} />
      </div>
    </div>
    </AdminShell>
  );
}
