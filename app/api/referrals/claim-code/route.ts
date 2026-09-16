import { NextResponse } from "next/server";

import { processUserCommissions } from "@/lib/commissions";
import { detectPlatform, normalizePartnerCode, referralCodeClaimAccountAgeDays } from "@/lib/referrals";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const PAID_EVENT_TYPES = ["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE"];

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function json(status: string, init?: ResponseInit, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: init?.status ? init.status < 400 : true, status, ...extra }, init);
}

async function getAuthenticatedUser(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return { response: json("missing_auth", { status: 401 }), user: null };
  }

  const supabase = createSupabaseAdminClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user?.id) {
    return { response: json("invalid_auth", { status: 401 }), user: null };
  }

  return { response: null, user };
}

function getClaimWindowEnd(createdAt: string) {
  const created = new Date(createdAt);
  created.setUTCDate(created.getUTCDate() + referralCodeClaimAccountAgeDays);
  return created;
}

async function getExistingAttribution(supabase: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const { data, error } = await supabase
    .from("user_partner_attributions")
    .select("id, partner_id, source")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getFirstPaidEvidence(supabase: ReturnType<typeof createSupabaseAdminClient>, userId: string, claimAt: string) {
  const [{ data: profile, error: profileError }, { data: event, error: eventError }] = await Promise.all([
    supabase
      .from("partner_commission_profiles")
      .select("id, first_paid_at")
      .eq("user_id", userId)
      .lte("first_paid_at", claimAt)
      .maybeSingle(),
    supabase
      .from("revenuecat_events")
      .select("revenuecat_event_id, purchased_at")
      .eq("user_id", userId)
      .eq("environment", "production")
      .in("event_type", PAID_EVENT_TYPES)
      .neq("period_type", "TRIAL")
      .neq("plan_type", "unknown")
      .not("transaction_id", "is", null)
      .not("purchased_at", "is", null)
      .gt("price", 0)
      .lte("purchased_at", claimAt)
      .eq("is_refund_event", false)
      .order("purchased_at", { ascending: true })
      .limit(1)
      .maybeSingle()
  ]);

  if (profileError) throw profileError;
  if (eventError) throw eventError;
  return profile || event;
}

async function getClaimBlocker(user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>["user"]>) {
  const supabase = createSupabaseAdminClient();
  const claimAt = new Date().toISOString();
  const createdAt = user.created_at ?? claimAt;
  const claimWindowEnd = getClaimWindowEnd(createdAt);
  if (new Date(claimAt).getTime() > claimWindowEnd.getTime()) {
    return json("account_too_old", { status: 403 }, { claimWindowEnd: claimWindowEnd.toISOString() });
  }

  const paidEvidence = await getFirstPaidEvidence(supabase, user.id, claimAt);
  if (paidEvidence) {
    return json("already_paid", { status: 409 });
  }

  return null;
}

async function getEligibility(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.response || !auth.user) return { response: auth.response, user: null };

  const supabase = createSupabaseAdminClient();
  const existingAttribution = await getExistingAttribution(supabase, auth.user.id);
  if (existingAttribution) {
    return { response: json("existing_attribution"), user: auth.user };
  }

  const blocker = await getClaimBlocker(auth.user);
  if (blocker) {
    return { response: blocker, user: auth.user };
  }

  return { response: null, user: auth.user };
}

export async function GET(request: Request) {
  const eligibility = await getEligibility(request);
  if (eligibility.response) return eligibility.response;
  return json("eligible");
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.response || !auth.user) return auth.response ?? json("invalid_auth", { status: 401 });

  const body = await request.json().catch(() => null);
  const referralCode = normalizePartnerCode(String(body?.referral_code ?? ""));
  if (!referralCode) {
    return json("invalid_code", { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select("id, name, referral_code, status")
    .ilike("referral_code", referralCode)
    .maybeSingle();

  if (partnerError) {
    return json("invalid_code", { status: 400 });
  }

  if (!partner) {
    return json("invalid_code", { status: 404 });
  }

  if (partner.status !== "active") {
    return json("inactive_partner", { status: 403 });
  }

  const existingAttribution = await getExistingAttribution(supabase, auth.user.id);
  if (existingAttribution) {
    return json(existingAttribution.partner_id === partner.id ? "already_attributed" : "first_touch_preserved", undefined, {
      partnerName: existingAttribution.partner_id === partner.id ? partner.name : undefined
    });
  }

  const blocker = await getClaimBlocker(auth.user);
  if (blocker) {
    return blocker;
  }

  const platform = detectPlatform(request.headers.get("user-agent") ?? "");
  const { error: insertError } = await supabase.from("user_partner_attributions").insert({
    attribution_confidence: "medium",
    partner_id: partner.id,
    platform,
    source: "partner_code",
    user_id: auth.user.id
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const existingAttribution = await getExistingAttribution(supabase, auth.user.id);
      if (existingAttribution?.partner_id === partner.id) {
        return json("already_attributed", undefined, { partnerName: partner.name });
      }
      if (existingAttribution) {
        return json("first_touch_preserved");
      }
    }

    return json("claim_failed", { status: 400 });
  }

  const commissionResult = await processUserCommissions(supabase, auth.user.id);

  return json("attributed", undefined, {
    commissionResult,
    partnerName: partner.name
  });
}
