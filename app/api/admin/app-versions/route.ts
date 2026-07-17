import { NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const admin = await requireApiAdmin("admin");
  if (admin.error) return admin.error;

  const body = await request.json();
  const platform = body.platform === "ios" ? "ios" : body.platform === "android" ? "android" : null;

  if (!platform || !body.latest_version || !body.minimum_required_version) {
    return NextResponse.json({ error: "Platform, latest version, and minimum required version are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("app_versions")
    .upsert({
      latest_version: body.latest_version,
      minimum_required_version: body.minimum_required_version,
      platform,
      updated_at: new Date().toISOString()
    }, { onConflict: "platform" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
