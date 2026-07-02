import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") ?? "all";
  const now = new Date().toISOString();
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("app_announcements")
    .select("id,title,message,platform,min_app_version,expires_at,created_at")
    .eq("is_active", true)
    .or(`platform.eq.all,platform.eq.${platform}`)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ announcements: [] });
  }

  return NextResponse.json({ announcements: data ?? [] });
}
