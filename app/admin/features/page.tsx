import { AdminShell } from "@/components/admin/admin-shell";
import { FeatureRequestsWorkspace, type FeatureRequestRecord } from "@/components/admin/feature-requests-workspace";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type SuggestionTicket = {
  created_at?: string;
  id: string;
  internal_notes?: string;
  message?: string;
  response_seen_at?: string;
  status?: string;
  subject?: string;
  technician_name?: string;
  technician_response?: string;
  technician_response_at?: string;
  updated_at?: string;
  user_email?: string;
  user_id?: string;
};

type UserProfile = {
  email?: string | null;
  first_name?: string | null;
  id: string;
  last_name?: string | null;
  name?: string | null;
};

export default async function FeatureRequestsAdminPage() {
  const session = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { data: suggestionRows } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("type", "suggestion")
    .order("created_at", { ascending: false })
    .limit(150);

  const suggestionTickets = (suggestionRows ?? []) as SuggestionTicket[];
  const userIds = Array.from(new Set(suggestionTickets.map((ticket) => ticket.user_id).filter(Boolean))) as string[];
  let userProfilesById = new Map<string, UserProfile>();

  if (userIds.length) {
    const { data: userProfiles } = await supabase
      .from("users")
      .select("id, name, first_name, last_name, email")
      .in("id", userIds);

    userProfilesById = new Map((userProfiles ?? []).map((profile) => [profile.id, profile as UserProfile]));
  }

  function profileFields(userId?: string | null) {
    const profile = userId ? userProfilesById.get(userId) : null;

    return {
      profile_email: profile?.email ?? null,
      user_first_name: profile?.first_name ?? null,
      user_last_name: profile?.last_name ?? null,
      user_name: profile?.name ?? null
    };
  }

  const requests: FeatureRequestRecord[] = suggestionTickets.map((ticket) => ({
    created_at: ticket.created_at,
    description: ticket.message,
    id: ticket.id,
    internal_notes: ticket.internal_notes,
    response_seen_at: ticket.response_seen_at,
    status: ticket.status,
    technician_name: ticket.technician_name,
    technician_response: ticket.technician_response,
    technician_response_at: ticket.technician_response_at,
    title: ticket.subject,
    updated_at: ticket.updated_at,
    user_email: ticket.user_email,
    user_id: ticket.user_id,
    ...profileFields(ticket.user_id)
  }));

  return (
    <AdminShell session={session}>
      <div className="grid gap-6">
        <div>
          <h1 className="text-3xl font-black">Feature Requests</h1>
          <p className="mt-2 text-muted-foreground">Review suggestions and track product planning status.</p>
        </div>
        <FeatureRequestsWorkspace requests={requests} />
      </div>
    </AdminShell>
  );
}
