import { StatusForm } from "@/components/admin/status-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listRows } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

type Request = {
  id: string;
  user_email?: string;
  reason?: string;
  status?: string;
  internal_notes?: string;
  requested_at?: string;
};

export default async function DeletionsAdminPage() {
  const session = await requireAdmin();
  const requests = await listRows<Request>("account_deletion_requests", "requested_at", 100);

  return (
    <AdminShell session={session}>
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">Account Deletion Requests</h1>
        <p className="mt-2 text-muted-foreground">Track deletion reviews. Permanent deletion requires separate explicit confirmation logic.</p>
      </div>
      <div className="grid gap-4">
        {requests.map((request) => (
          <Card className="grid gap-5 p-5 xl:grid-cols-[1fr_320px]" key={request.id}>
            <div>
              <Badge tone={request.status === "completed" ? "success" : request.status === "rejected" ? "danger" : "warning"}>
                {request.status ?? "pending"}
              </Badge>
              <h2 className="mt-3 text-xl font-black">{request.user_email}</h2>
              <p className="mt-1 text-sm font-bold text-muted-foreground">Requested {formatDate(request.requested_at)}</p>
              <p className="mt-4 whitespace-pre-wrap leading-7 text-muted-foreground">{request.reason || "No reason provided."}</p>
              {request.internal_notes ? <p className="mt-4 rounded-md bg-muted p-3 text-sm font-semibold">{request.internal_notes}</p> : null}
            </div>
            <StatusForm endpoint="/api/admin/account-deletions" id={request.id} statuses={["processing", "completed", "rejected", "pending"]} />
          </Card>
        ))}
        {!requests.length ? <Card className="p-6 text-muted-foreground">No account deletion requests found.</Card> : null}
      </div>
    </div>
    </AdminShell>
  );
}
