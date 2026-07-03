import { BarChart3, Bell, MessageSquare, ShieldAlert, Smartphone, Star, Users } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { countRows } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type UserCreatedAt = {
  created_at: string;
};

function normalizeYear(year?: string) {
  const parsed = Number.parseInt(year ?? "", 10);
  const currentYear = new Date().getFullYear();
  if (!Number.isFinite(parsed) || parsed < 2020 || parsed > currentYear + 1) {
    return currentYear;
  }

  return parsed;
}

async function getAvailableUserYears(selectedYear: number) {
  const supabase = createSupabaseAdminClient();
  const [{ data: firstUser }, { data: latestUser }] = await Promise.all([
    supabase.from("users").select("created_at").order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("users").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const firstYear = (firstUser as UserCreatedAt | null)?.created_at
    ? new Date((firstUser as UserCreatedAt).created_at).getFullYear()
    : selectedYear;
  const latestYear = (latestUser as UserCreatedAt | null)?.created_at
    ? new Date((latestUser as UserCreatedAt).created_at).getFullYear()
    : selectedYear;
  const startYear = Math.min(firstYear, selectedYear);
  const endYear = Math.max(latestYear, selectedYear);

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => endYear - index);
}

async function getNewUsersByMonth(year: number) {
  const counts = await Promise.all(
    months.map((month, index) => {
      const start = new Date(Date.UTC(year, index, 1)).toISOString();
      const end = new Date(Date.UTC(year, index + 1, 1)).toISOString();

      return countRows("users", (query) => query.gte("created_at", start).lt("created_at", end));
    })
  );

  return months.map((month, index) => ({
    count: counts[index],
    month
  }));
}

export default async function StatisticsAdminPage({ searchParams }: { searchParams?: Promise<{ year?: string }> }) {
  const session = await requireAdmin();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedYear = normalizeYear(resolvedSearchParams.year);
  const [
    totalUsers,
    proUsers,
    openTickets,
    resolvedTickets,
    pendingDeletions,
    featureRequests,
    announcements,
    availableYears,
    monthlyUsers
  ] = await Promise.all([
    countRows("users"),
    countRows("user_subscription_metadata", (query) => query.eq("is_pro", true)),
    countRows("support_tickets", (query) => query.in("status", ["open", "reviewing"])),
    countRows("support_tickets", (query) => query.in("status", ["resolved", "closed"])),
    countRows("account_deletion_requests", (query) => query.in("status", ["pending", "processing"])),
    countRows("feature_requests"),
    countRows("app_announcements", (query) => query.eq("is_active", true)),
    getAvailableUserYears(selectedYear),
    getNewUsersByMonth(selectedYear)
  ]);
  const maxMonthlyUsers = Math.max(...monthlyUsers.map((item) => item.count), 1);
  const totalNewUsersForYear = monthlyUsers.reduce((sum, item) => sum + item.count, 0);

  return (
    <AdminShell session={session}>
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">Statistics</h1>
        <p className="mt-2 text-muted-foreground">Operational counters. Platform and version distributions are ready for app event data once the mobile app starts sending it.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={totalUsers} />
        <StatCard icon={Star} label="Pro users" value={proUsers} />
        <StatCard icon={MessageSquare} label="Open tickets" value={openTickets} />
        <StatCard icon={BarChart3} label="Resolved tickets" value={resolvedTickets} />
        <StatCard icon={ShieldAlert} label="Pending deletion requests" value={pendingDeletions} />
        <StatCard icon={Bell} label="Active announcements" value={announcements} />
        <StatCard icon={Smartphone} label="Feature requests" value={featureRequests} />
      </div>
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">New users by month</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalNewUsersForYear} new users in {selectedYear}.
            </p>
          </div>
          <form className="flex items-end gap-2" action="/admin/statistics">
            <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
              Year
              <Select className="w-36" defaultValue={String(selectedYear)} name="year">
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
            </label>
            <Button type="submit" variant="outline">Apply</Button>
          </form>
        </div>

        <div className="mt-6 overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-12 items-end gap-3 border-b pb-3">
            {monthlyUsers.map((item) => {
              const height = item.count ? Math.max(12, Math.round((item.count / maxMonthlyUsers) * 190)) : 8;

              return (
                <div className="grid gap-2 text-center" key={item.month}>
                  <p className="text-xs font-bold text-muted-foreground">{item.count}</p>
                  <div className="flex h-52 items-end justify-center rounded-md bg-muted/45 px-2 py-2">
                    <div
                      aria-label={`${item.count} new users in ${item.month} ${selectedYear}`}
                      className="w-full rounded-md bg-primary shadow-sm"
                      style={{ height }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">{item.month}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
    </AdminShell>
  );
}
