import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { anonymizeEmail } from "@/lib/account-deletion";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { readEnv } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = createClient(readEnv("NEXT_PUBLIC_SUPABASE_URL"), readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: userData } = await auth.auth.getUser(token);
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data: deletionRequest, error: findError } = await supabase
    .from("account_deletion_requests")
    .select("id,user_email,status,anonymized_user_key")
    .eq("user_id", userData.user.id)
    .in("status", ["pending", "processing"])
    .maybeSingle();
  if (findError) return NextResponse.json({ error: "Unable to find the deletion request." }, { status: 500 });
  if (!deletionRequest) return NextResponse.json({ ok: true, status: "not_found" });

  const { error: deleteError } = await supabase.from("account_deletion_requests").delete().eq("id", deletionRequest.id);
  if (deleteError) return NextResponse.json({ error: "Unable to cancel the deletion request." }, { status: 500 });
  await supabase.from("account_deletion_audit").insert({
    action: "user_canceled",
    anonymized_user_key: deletionRequest.anonymized_user_key ?? anonymizeEmail(deletionRequest.user_email),
    details: { source: "mobile_app" },
    request_id: null
  });
  return NextResponse.json({ ok: true, status: "canceled" });
}
