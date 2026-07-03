import { AdminShell } from "@/components/admin/admin-shell";
import { SupportTicketsWorkspace, type SupportTicketRecord } from "@/components/admin/support-tickets-workspace";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type UserProfile = {
  email?: string | null;
  first_name?: string | null;
  id: string;
  last_name?: string | null;
  name?: string | null;
};

export default async function SupportAdminPage() {
  const session = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { data: ticketRows } = await supabase
    .from("support_tickets")
    .select("*")
    .or("type.is.null,type.neq.suggestion")
    .order("created_at", { ascending: false })
    .limit(250);

  const tickets = (ticketRows ?? []) as SupportTicketRecord[];
  const userIds = Array.from(new Set(tickets.map((ticket) => ticket.user_id).filter(Boolean))) as string[];
  let userProfilesById = new Map<string, UserProfile>();

  if (userIds.length) {
    const { data: userProfiles } = await supabase
      .from("users")
      .select("id, name, first_name, last_name, email")
      .in("id", userIds);

    userProfilesById = new Map((userProfiles ?? []).map((profile) => [profile.id, profile as UserProfile]));
  }

  const ticketsWithProfiles = tickets.map((ticket) => {
    const profile = ticket.user_id ? userProfilesById.get(ticket.user_id) : null;

    return {
      ...ticket,
      profile_email: profile?.email ?? null,
      user_first_name: profile?.first_name ?? null,
      user_last_name: profile?.last_name ?? null,
      user_name: profile?.name ?? null
    };
  });

  return (
    <AdminShell session={session}>
      <div className="grid gap-6">
        <div>
          <h1 className="text-3xl font-black">Support Tickets</h1>
          <p className="mt-2 text-muted-foreground">Review support requests, filter by workflow state, and respond from one place.</p>
        </div>
        <SupportTicketsWorkspace tickets={ticketsWithProfiles} />
      </div>
    </AdminShell>
  );
}
