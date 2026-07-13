import { AdminShell } from "@/components/admin/admin-shell";
import { UsersWorkspace, type UserRow } from "@/components/admin/users-workspace";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

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
  const users: UserRow[] = ((profiles as Profile[] | null) ?? []).map((profile) => {
    const sub = subscriptionMap.get(profile.id);

    return {
      created_at: profile.created_at,
      email: profile.email,
      id: profile.id,
      is_pro: sub?.is_pro ?? false,
      last_sign_in_at: lastSignInMap.get(profile.id),
      plan: sub?.plan,
      role: profile.role,
      subscription_status: sub?.status
    };
  });

  return (
    <AdminShell session={session}>
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">Users</h1>
        <p className="mt-2 text-muted-foreground">Limited account overview for support and operations.</p>
      </div>
      <UsersWorkspace users={users} />
    </div>
    </AdminShell>
  );
}
