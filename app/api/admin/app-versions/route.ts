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
  const { data, error } = await supabase
    .from("app_versions")
    .update({
      latest_version: body.latest_version,
      minimum_required_version: body.minimum_required_version,
      updated_at: new Date().toISOString()
    })
    .eq("platform", platform)
    .select("platform");

  if (error) {
    if (error.message.toLowerCase().includes("permission denied")) {
      return NextResponse.json({
        error: "Supabase permission denied for app_versions. Run: grant select, insert, update on public.app_versions to service_role;"
      }, { status: 400 });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data?.length) {
    return NextResponse.json({ error: `No app_versions row found for ${platform}.` }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
