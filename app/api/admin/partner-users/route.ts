import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const validRoles = new Set(["owner", "manager", "viewer"]);

function getSiteUrl(protocol: string, host: string | null, origin: string | null) {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? origin ?? (host ? `${protocol}://${host}` : "http://localhost:3000")).replace(/\/$/, "");
}

function getPartnerPasswordRedirect(siteUrl: string) {
  return `${siteUrl}/partner/password`;
}

async function findAuthUserIdByEmail(supabase: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const target = email.toLowerCase();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === target);
    if (found?.id) return found.id;
    if (data.users.length < 100) break;
  }

  return null;
}

async function sendInviteOrRecovery(email: string) {
  const supabase = createSupabaseAdminClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const siteUrl = getSiteUrl(protocol, host, origin);
  const redirectTo = getPartnerPasswordRedirect(siteUrl);

  const invite = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (!invite.error) {
    return invite.data.user?.id ?? null;
  }

  const existingUserId = await findAuthUserIdByEmail(supabase, email);
  if (!existingUserId) {
    throw invite.error;
  }

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (resetError) {
    throw resetError;
  }
  return existingUserId;
}

export async function POST(request: Request) {
  const admin = await requireApiAdmin("admin");
  if (admin.error) return admin.error;

  const body = await request.json();
  const partnerId = String(body.partnerId ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "viewer");

  if (!partnerId || !email || !validRoles.has(role)) {
    return NextResponse.json({ error: "Partner, email, and valid role are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: partner } = await supabase.from("partners").select("id").eq("id", partnerId).maybeSingle();
  if (!partner) {
    return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  }

  try {
    const userId = await sendInviteOrRecovery(email);
    if (!userId) {
      return NextResponse.json({ error: "Supabase did not return an invited user." }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const { error } = await supabase.from("partner_users").upsert(
      {
        email,
        invitation_sent_at: timestamp,
        is_active: true,
        last_invited_at: timestamp,
        partner_id: partnerId,
        role,
        user_id: userId
      },
      { onConflict: "user_id,partner_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invitation could not be sent." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireApiAdmin("admin");
  if (admin.error) return admin.error;

  const body = await request.json();
  const id = String(body.id ?? "");
  const partnerId = String(body.partnerId ?? "");
  const action = String(body.action ?? "");

  if (!id || !partnerId || !["disable", "reactivate", "resend", "revoke"].includes(action)) {
    return NextResponse.json({ error: "Partner user id, partner, and valid action are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: partnerUser, error: loadError } = await supabase
    .from("partner_users")
    .select("id, email, partner_id")
    .eq("id", id)
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 400 });
  }

  if (!partnerUser) {
    return NextResponse.json({ error: "Partner user not found." }, { status: 404 });
  }

  if (action === "revoke") {
    const { error } = await supabase.from("partner_users").delete().eq("id", id).eq("partner_id", partnerId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "resend") {
    const email = String(partnerUser.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "This partner user does not have an email stored." }, { status: 400 });

    try {
      await sendInviteOrRecovery(email);
      const { error } = await supabase
        .from("partner_users")
        .update({ last_invited_at: new Date().toISOString() })
        .eq("id", id)
        .eq("partner_id", partnerId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invitation could not be resent." }, { status: 400 });
    }
  }

  const payload = action === "disable"
    ? { disabled_at: new Date().toISOString(), is_active: false }
    : { disabled_at: null, is_active: true };
  const { error } = await supabase.from("partner_users").update(payload).eq("id", id).eq("partner_id", partnerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
