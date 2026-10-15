import { createHash } from "node:crypto";

import { revokeStoredAppleToken } from "@/lib/apple-account-revocation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type DeletionRequest = {
  anonymized_user_key?: string | null;
  id: string;
  internal_notes?: string | null;
  scheduled_deletion_at?: string | null;
  status?: string | null;
  user_email?: string | null;
  user_id?: string | null;
};

export function anonymizeEmail(email?: string | null) {
  if (!email) return null;
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

async function writeAudit({
  action,
  actorAdminId,
  anonymizedUserKey,
  details = {},
  requestId
}: {
  action: "executed" | "failed";
  actorAdminId?: string | null;
  anonymizedUserKey?: string | null;
  details?: Record<string, unknown>;
  requestId: string;
}) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("account_deletion_audit").insert({
    action,
    actor_admin_id: actorAdminId ?? null,
    anonymized_user_key: anonymizedUserKey ?? null,
    details,
    request_id: requestId
  });
}

async function sendCompletionEmail(recipient: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ACCOUNT_DELETION_EMAIL_FROM;
  if (!apiKey || !from) return "not_configured" as const;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from,
        html: "<p>Your Vet Tech Companion account and associated personal data have been deleted. Any active subscription must be managed through the relevant app store.</p>",
        subject: "Your Vet Tech Companion account was deleted",
        to: [recipient]
      }),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      method: "POST"
    });
    return response.ok ? ("sent" as const) : ("failed" as const);
  } catch {
    return "failed" as const;
  }
}

export async function executeAccountDeletion({
  actorAdminId,
  requestId
}: {
  actorAdminId?: string | null;
  requestId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("account_deletion_requests")
    .update({ deletion_error: null, status: "deleting", updated_at: now })
    .eq("id", requestId)
    .eq("status", "processing")
    .lte("scheduled_deletion_at", now)
    .select("id,user_id,user_email,status,scheduled_deletion_at,internal_notes,anonymized_user_key")
    .maybeSingle();

  if (claimError) throw new Error(`account_deletion_requests: ${claimError.message}`);
  if (!claimed) return { status: "not_due_or_already_handled" as const };

  const row = claimed as DeletionRequest;
  const anonymizedUserKey = row.anonymized_user_key ?? anonymizeEmail(row.user_email);
  if (!row.user_id) {
    await supabase
      .from("account_deletion_requests")
      .update({ deletion_error: "Request no longer has a user id.", status: "processing", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return { status: "failed" as const };
  }

  try {
    const { data: appleToken } = await supabase
      .from("account_deletion_apple_tokens")
      .select("encrypted_refresh_token")
      .eq("user_id", row.user_id)
      .maybeSingle();
    const appleRevocation = await revokeStoredAppleToken(appleToken?.encrypted_refresh_token);
    if (appleToken?.encrypted_refresh_token && appleRevocation !== "revoked") {
      throw new Error("Apple authorization token revocation failed; deletion will retry automatically.");
    }
    const { error: dataError } = await supabase.rpc("delete_account_user_data", { target_user_id: row.user_id });
    if (dataError) throw new Error(`account data: ${dataError.message}`);

    const { error: authError } = await supabase.auth.admin.deleteUser(row.user_id);
    if (authError) throw new Error(`auth.users: ${authError.message}`);

    const notification = row.user_email && row.user_email !== "deleted-user"
      ? await sendCompletionEmail(row.user_email)
      : "not_configured";
    const completedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("account_deletion_requests")
      .update({
        anonymized_user_key: anonymizedUserKey,
        completed_at: completedAt,
        deleted_at: completedAt,
        deleted_by: actorAdminId ?? null,
        deletion_error: null,
        status: "completed",
        updated_at: completedAt,
        user_email: "deleted-user",
        user_id: null
      })
      .eq("id", row.id);
    if (updateError) throw new Error(`account_deletion_requests: ${updateError.message}`);

    await writeAudit({
      action: "executed",
      actorAdminId,
      anonymizedUserKey,
      details: { apple_revocation: appleRevocation, deleted_at: completedAt, notification },
      requestId: row.id
    });
    return { status: "completed" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deletion failed.";
    await supabase
      .from("account_deletion_requests")
      .update({ deletion_error: message, status: "processing", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    await writeAudit({ action: "failed", actorAdminId, anonymizedUserKey, details: { error: message }, requestId: row.id });
    throw error;
  }
}
