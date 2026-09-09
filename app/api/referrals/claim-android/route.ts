import { NextResponse } from "next/server";

import { referralClaimMaxClickAgeDays } from "@/lib/referrals";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function isUuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const clickId = body?.click_id;
  if (!isUuid(clickId)) {
    return NextResponse.json({ error: "A valid click_id is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user?.id) {
    return NextResponse.json({ error: "Invalid authorization token." }, { status: 401 });
  }

  const { data: existingAttribution } = await supabase
    .from("user_partner_attributions")
    .select("id, first_click_id, partner_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingAttribution) {
    return NextResponse.json({
      ok: true,
      status: existingAttribution.first_click_id === clickId ? "already_attributed" : "first_touch_preserved"
    });
  }

  const { data: clickClaim } = await supabase
    .from("user_partner_attributions")
    .select("id, user_id")
    .eq("first_click_id", clickId)
    .maybeSingle();

  if (clickClaim && clickClaim.user_id !== user.id) {
    return NextResponse.json({ error: "Referral click has already been claimed." }, { status: 409 });
  }

  const clickCutoff = new Date(Date.now() - referralClaimMaxClickAgeDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: click, error: clickError } = await supabase
    .from("partner_link_clicks")
    .select("click_id, created_at, destination, partner_id, partners!inner(id, status)")
    .eq("click_id", clickId)
    .eq("destination", "google_play")
    .gte("created_at", clickCutoff)
    .maybeSingle();

  const partner = Array.isArray(click?.partners) ? click?.partners[0] : click?.partners;
  if (clickError || !click || partner?.status !== "active") {
    return NextResponse.json({ error: "Referral evidence is invalid or expired." }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("user_partner_attributions").insert({
    attribution_confidence: "strong",
    first_click_id: click.click_id,
    partner_id: click.partner_id,
    platform: "android",
    source: "google_play_install_referrer",
    user_id: user.id
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const [{ data: userAttribution }, { data: claimedClick }] = await Promise.all([
        supabase.from("user_partner_attributions").select("id, first_click_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_partner_attributions").select("id, user_id").eq("first_click_id", clickId).maybeSingle()
      ]);

      if (userAttribution) {
        return NextResponse.json({
          ok: true,
          status: userAttribution.first_click_id === clickId ? "already_attributed" : "first_touch_preserved"
        });
      }

      if (claimedClick && claimedClick.user_id !== user.id) {
        return NextResponse.json({ error: "Referral click has already been claimed." }, { status: 409 });
      }
    }

    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status: "attributed" });
}
