import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { encryptAppleRefreshToken, exchangeAppleAuthorizationCode } from "@/lib/apple-account-revocation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { readEnv } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = createClient(readEnv("NEXT_PUBLIC_SUPABASE_URL"), readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { authorizationCode?: unknown } | null;
  const authorizationCode = typeof body?.authorizationCode === "string" ? body.authorizationCode.trim() : "";
  if (!authorizationCode || authorizationCode.length > 4096) return NextResponse.json({ error: "Invalid authorization code" }, { status: 400 });

  try {
    const refreshToken = await exchangeAppleAuthorizationCode(authorizationCode);
    const { error } = await createSupabaseAdminClient().from("account_deletion_apple_tokens").upsert({
      encrypted_refresh_token: encryptAppleRefreshToken(refreshToken),
      updated_at: new Date().toISOString(),
      user_id: userData.user.id
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Apple authorization storage unavailable" }, { status: 503 });
  }
}
