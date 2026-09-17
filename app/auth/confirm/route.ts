import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const emailLinkTypes = new Set(["invite", "recovery"]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (!tokenHash || !type || !emailLinkTypes.has(type)) {
    return NextResponse.redirect(new URL("/partner/login?error=callback", requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "invite" | "recovery"
  });

  if (error) {
    return NextResponse.redirect(new URL("/partner/login?error=callback", requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/partner/password", requestUrl.origin));
}
