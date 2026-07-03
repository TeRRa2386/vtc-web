import {
  AccountDeletionsWorkspace,
  type AccountDeletionRequestRecord
} from "@/components/admin/account-deletions-workspace";
import { AdminShell } from "@/components/admin/admin-shell";
import { listRows } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/supabase/admin";

export default async function DeletionsAdminPage() {
  const session = await requireAdmin();
  const requests = await listRows<AccountDeletionRequestRecord>("account_deletion_requests", "requested_at", 100);

  return (
    <AdminShell session={session}>
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">Account Deletion Requests</h1>
        <p className="mt-2 text-muted-foreground">
          Accept requests, allow a 5-day cancellation window, then permanently delete the account and associated app data.
        </p>
      </div>
      <AccountDeletionsWorkspace requests={requests} />
    </div>
    </AdminShell>
  );
}
