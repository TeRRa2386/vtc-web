import { NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const admin = await requireApiAdmin("support");
  if (admin.error) return admin.error;
  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("support_tickets")
    .update({
      internal_notes: body.internal_notes || null,
      status: body.status,
      updated_at: new Date().toISOString()
    })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
