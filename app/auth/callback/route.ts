import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const cookieStore = await cookies();
  const next = cookieStore.get("admin_oauth_next")?.value ?? "/admin";
  const partnerNext = cookieStore.get("partner_oauth_next")?.value;
  const redirectTarget = partnerNext ?? next;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      cookieStore.delete("admin_oauth_next");
      cookieStore.delete("partner_oauth_next");
      return NextResponse.redirect(new URL(redirectTarget, requestUrl.origin));
    }
  }

  const fallback = partnerNext ? "/partner/login?error=callback" : "/admin/login?error=callback";
  return NextResponse.redirect(new URL(fallback, requestUrl.origin));
}
