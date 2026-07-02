import { StatusForm } from "@/components/admin/status-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listRows } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

type Ticket = {
  id: string;
  user_email?: string;
  type?: string;
  category?: string;
  priority?: string;
  subject?: string;
  message?: string;
  status?: string;
  internal_notes?: string;
  created_at?: string;
};

export default async function SupportAdminPage() {
  const session = await requireAdmin();
  const tickets = await listRows<Ticket>("support_tickets", "created_at", 100);

  return (
    <AdminShell session={session}>
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">Support Tickets</h1>
        <p className="mt-2 text-muted-foreground">Review support requests, update statuses, and add internal notes.</p>
      </div>
      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <Card className="grid gap-5 p-5 xl:grid-cols-[1fr_320px]" key={ticket.id}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">{ticket.status ?? "open"}</Badge>
                <Badge>{ticket.priority ?? "normal"}</Badge>
                <Badge>{ticket.category ?? ticket.type ?? "support"}</Badge>
              </div>
              <h2 className="mt-3 text-xl font-black">{ticket.subject || "Support request"}</h2>
              <p className="mt-1 text-sm font-bold text-muted-foreground">{ticket.user_email} · {formatDate(ticket.created_at)}</p>
              <p className="mt-4 whitespace-pre-wrap leading-7 text-muted-foreground">{ticket.message}</p>
              {ticket.internal_notes ? <p className="mt-4 rounded-md bg-muted p-3 text-sm font-semibold">{ticket.internal_notes}</p> : null}
            </div>
            <StatusForm endpoint="/api/admin/support-tickets" id={ticket.id} statuses={["reviewing", "resolved", "closed", "open"]} />
          </Card>
        ))}
        {!tickets.length ? <Card className="p-6 text-muted-foreground">No support tickets found.</Card> : null}
      </div>
    </div>
    </AdminShell>
  );
}
