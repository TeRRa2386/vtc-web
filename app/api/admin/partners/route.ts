import { NextResponse } from "next/server";

import { normalizePartnerCode, normalizePartnerSlug } from "@/lib/referrals";
import { requireApiAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function parsePartnerPayload(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const slug = normalizePartnerSlug(String(body.slug || name));
  const android_referrer_code = normalizePartnerCode(String(body.android_referrer_code || slug));
  const referral_code = normalizePartnerCode(String(body.referral_code || android_referrer_code || slug));

  return {
    android_referrer_code,
    group_name: String(body.group_name ?? "").trim() || null,
    ios_campaign_token: String(body.ios_campaign_token ?? "").trim() || null,
    ios_provider_token: String(body.ios_provider_token ?? "").trim() || null,
    name,
    notes: String(body.notes ?? "").trim() || null,
    referral_code,
    slug,
    status: String(body.status ?? "active")
  };
}

export async function POST(request: Request) {
  const admin = await requireApiAdmin("admin");
  if (admin.error) return admin.error;

  const body = await request.json();
  const payload = parsePartnerPayload(body);

  if (!payload.name || !payload.slug || !payload.android_referrer_code || !payload.referral_code) {
    return NextResponse.json({ error: "Partner name, slug, and referral code are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("partners").insert(payload).select("slug").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, slug: data.slug });
}

export async function PATCH(request: Request) {
  const admin = await requireApiAdmin("admin");
  if (admin.error) return admin.error;

  const body = await request.json();
  const id = String(body.id ?? "");
  const payload = parsePartnerPayload(body);

  if (!id || !payload.name || !payload.slug || !payload.android_referrer_code || !payload.referral_code) {
    return NextResponse.json({ error: "Partner id, name, slug, and referral code are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("partners")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, slug: data.slug });
}
