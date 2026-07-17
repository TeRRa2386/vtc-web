import { NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const admin = await requireApiAdmin("admin");
  if (admin.error) return admin.error;
  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("app_announcements").insert({
    expires_at: body.expires_at || null,
    is_active: true,
    message: body.message,
    min_app_version: body.min_app_version || null,
    platform: body.platform || "all",
    title: body.title
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const admin = await requireApiAdmin("admin");
  if (admin.error) return admin.error;
  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("app_announcements")
    .update({
      expires_at: body.expires_at || null,
      is_active: Boolean(body.is_active),
      message: body.message,
      min_app_version: body.min_app_version || null,
      platform: body.platform || "all",
      title: body.title,
      updated_at: new Date().toISOString()
    })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
