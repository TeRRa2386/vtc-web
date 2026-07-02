import { StatusForm } from "@/components/admin/status-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listRows } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

type FeatureRequest = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  internal_notes?: string;
  user_email?: string;
  created_at?: string;
};

export default async function FeatureRequestsAdminPage() {
  const session = await requireAdmin();
  const requests = await listRows<FeatureRequest>("feature_requests", "created_at", 100);

  return (
    <AdminShell session={session}>
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">Feature Requests</h1>
        <p className="mt-2 text-muted-foreground">Review suggestions and track product planning status.</p>
      </div>
      <div className="grid gap-4">
        {requests.map((request) => (
          <Card className="grid gap-5 p-5 xl:grid-cols-[1fr_320px]" key={request.id}>
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="info">{request.status ?? "new"}</Badge>
                <Badge>{request.category ?? "uncategorized"}</Badge>
              </div>
              <h2 className="mt-3 text-xl font-black">{request.title || "Feature request"}</h2>
              <p className="mt-1 text-sm font-bold text-muted-foreground">{request.user_email ?? "Unknown user"} · {formatDate(request.created_at)}</p>
              <p className="mt-4 whitespace-pre-wrap leading-7 text-muted-foreground">{request.description}</p>
              {request.internal_notes ? <p className="mt-4 rounded-md bg-muted p-3 text-sm font-semibold">{request.internal_notes}</p> : null}
            </div>
            <StatusForm endpoint="/api/admin/feature-requests" id={request.id} statuses={["reviewing", "planned", "in_progress", "released", "rejected", "new"]} />
          </Card>
        ))}
        {!requests.length ? <Card className="p-6 text-muted-foreground">No feature requests found.</Card> : null}
      </div>
    </div>
    </AdminShell>
  );
}
