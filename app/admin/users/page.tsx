import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type Profile = {
  id: string;
  email?: string;
  created_at?: string;
  role?: string;
};

type Subscription = {
  user_id: string;
  is_pro?: boolean;
  plan?: string;
  status?: string;
};

export default async function UsersAdminPage() {
  const session = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const [{ data: profiles }, { data: subscriptions }, { data: authUsers }] = await Promise.all([
    supabase.from("users").select("id,email,created_at,role").limit(100),
    supabase.from("user_subscription_metadata").select("user_id,is_pro,plan,status").limit(1000),
    supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
  ]);

  const subscriptionMap = new Map((subscriptions as Subscription[] | null)?.map((item) => [item.user_id, item]) ?? []);
  const lastSignInMap = new Map(authUsers.users.map((user) => [user.id, user.last_sign_in_at]));

  return (
    <AdminShell session={session}>
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">Users</h1>
        <p className="mt-2 text-muted-foreground">Limited account overview for support and operations.</p>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs font-black uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Last sign-in</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Subscription</th>
              </tr>
            </thead>
            <tbody>
              {(profiles as Profile[] | null)?.map((profile) => {
                const sub = subscriptionMap.get(profile.id);
                return (
                  <tr className="border-t" key={profile.id}>
                    <td className="px-4 py-3 font-bold">{profile.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(profile.created_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(lastSignInMap.get(profile.id))}</td>
                    <td className="px-4 py-3">{profile.role}</td>
                    <td className="px-4 py-3">
                      <Badge tone={sub?.is_pro ? "success" : "default"}>{sub?.is_pro ? `Pro ${sub.plan ?? ""}` : "Free"}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
    </AdminShell>
  );
}
