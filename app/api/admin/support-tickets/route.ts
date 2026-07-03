import { NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const admin = await requireApiAdmin("support");
  if (admin.error) return admin.error;
  const body = await request.json();
  const supabase = createSupabaseAdminClient();
  const response = typeof body.technician_response === "string" ? body.technician_response.trim() : undefined;

  const { error } = await supabase
    .from("support_tickets")
    .update({
      category: body.category || null,
      internal_notes: body.internal_notes || null,
      priority: body.priority || "normal",
      status: body.status,
      technician_name: response ? admin.session?.email : null,
      technician_response: response ?? null,
      technician_response_at: response ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
