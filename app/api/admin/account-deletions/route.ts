import { NextResponse } from "next/server";
import { anonymizeEmail, executeAccountDeletion } from "@/lib/account-deletion";
import { requireApiAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const deletionDelayMs = 5 * 24 * 60 * 60 * 1000;

type DeletionAction = "approve" | "cancel" | "execute" | "notes" | "remove";

type DeletionRequest = {
  anonymized_user_key?: string | null;
  deleted_at?: string | null;
  id: string;
  internal_notes?: string | null;
  scheduled_deletion_at?: string | null;
  status?: string | null;
  user_email?: string | null;
  user_id?: string | null;
};

async function insertAudit({
  action,
  actorAdminId,
  anonymizedUserKey,
  details = {},
  requestId
}: {
  action: "approved" | "canceled" | "request_removed" | "executed" | "failed";
  actorAdminId: string;
  anonymizedUserKey?: string | null;
  details?: Record<string, unknown>;
  requestId: string;
}) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("account_deletion_audit").insert({
    action,
    actor_admin_id: actorAdminId,
    anonymized_user_key: anonymizedUserKey ?? null,
    details,
    request_id: requestId
  });
}

export async function PATCH(request: Request) {
  const admin = await requireApiAdmin("admin");
  if (admin.error) return admin.error;
  const body = await request.json();
  const supabase = createSupabaseAdminClient();
  const action = (body.action ?? "notes") as DeletionAction;
  const now = new Date();

  const { data: deletionRequest, error: fetchError } = await supabase
    .from("account_deletion_requests")
    .select("id,user_id,user_email,status,scheduled_deletion_at,internal_notes,deleted_at,anonymized_user_key")
    .eq("id", body.id)
    .maybeSingle();

  if (fetchError || !deletionRequest) {
    return NextResponse.json({ error: fetchError?.message ?? "Deletion request not found." }, { status: 404 });
  }

  const row = deletionRequest as DeletionRequest;
  const anonymizedUserKey = row.anonymized_user_key ?? anonymizeEmail(row.user_email);

  if (row.status === "completed" || row.deleted_at) {
    return NextResponse.json({ ok: true, status: "completed" });
  }

  if (action === "approve") {
    const scheduledDeletionAt = new Date(now.getTime() + deletionDelayMs).toISOString();
    const { error } = await supabase
      .from("account_deletion_requests")
      .update({
        approved_at: now.toISOString(),
        approved_by: admin.session?.userId,
        canceled_at: null,
        canceled_by: null,
        deletion_error: null,
        internal_notes: body.internal_notes ?? row.internal_notes ?? null,
        scheduled_deletion_at: scheduledDeletionAt,
        status: "processing",
        updated_at: now.toISOString()
      })
      .eq("id", row.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await insertAudit({
      action: "approved",
      actorAdminId: admin.session!.userId,
      anonymizedUserKey,
      details: { scheduled_deletion_at: scheduledDeletionAt },
      requestId: row.id
    });

    return NextResponse.json({ ok: true, scheduled_deletion_at: scheduledDeletionAt, status: "processing" });
  }

  if (action === "cancel") {
    const { error } = await supabase
      .from("account_deletion_requests")
      .update({
        canceled_at: now.toISOString(),
        canceled_by: admin.session?.userId,
        deletion_error: null,
        internal_notes: body.internal_notes ?? row.internal_notes ?? null,
        scheduled_deletion_at: null,
        status: "pending",
        updated_at: now.toISOString()
      })
      .eq("id", row.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await insertAudit({
      action: "canceled",
      actorAdminId: admin.session!.userId,
      anonymizedUserKey,
      requestId: row.id
    });

    return NextResponse.json({ ok: true, status: "pending" });
  }

  if (action === "remove") {
    if (row.status === "processing") {
      return NextResponse.json({ error: "Cancel the scheduled deletion before removing the request." }, { status: 400 });
    }

    await insertAudit({
      action: "request_removed",
      actorAdminId: admin.session!.userId,
      anonymizedUserKey,
      details: { previous_status: row.status },
      requestId: row.id
    });

    const { error } = await supabase
      .from("account_deletion_requests")
      .delete()
      .eq("id", row.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, status: "removed" });
  }

  if (action === "execute") {
    if (row.status !== "processing" || !row.scheduled_deletion_at) {
      return NextResponse.json({ error: "Deletion is not scheduled." }, { status: 400 });
    }

    if (new Date(row.scheduled_deletion_at).getTime() > now.getTime()) {
      return NextResponse.json({ error: "Deletion countdown has not finished." }, { status: 400 });
    }

    try {
      const result = await executeAccountDeletion({ actorAdminId: admin.session!.userId, requestId: row.id });
      return NextResponse.json({ ok: true, status: result.status });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Deletion failed.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const { error } = await supabase
    .from("account_deletion_requests")
    .update({
      internal_notes: body.internal_notes ?? null,
      updated_at: now.toISOString()
    })
    .eq("id", row.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, status: row.status });
}
