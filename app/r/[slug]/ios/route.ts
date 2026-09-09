import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { buildAppStoreCampaignUrl, detectPlatform, hashUserAgent, type PartnerRecord } from "@/lib/referrals";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { data: partner } = await supabase
    .from("partners")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!partner) {
    return NextResponse.json({ error: "Referral partner not found." }, { status: 404 });
  }

  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") ?? "";
  await supabase.from("partner_link_clicks").insert({
    destination: "app_store",
    landing_url: `/r/${slug}/ios`,
    partner_id: partner.id,
    platform_detected: detectPlatform(userAgent),
    user_agent_hash: hashUserAgent(userAgent)
  });

  return NextResponse.redirect(buildAppStoreCampaignUrl(partner as PartnerRecord));
}
