import { NextResponse } from "next/server";

import { reprocessAllCommissions } from "@/lib/commissions";
import { requireApiAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST() {
  const admin = await requireApiAdmin("admin");
  if (admin.error) return admin.error;

  const supabase = createSupabaseAdminClient();
  const result = await reprocessAllCommissions(supabase);

  return NextResponse.json({ ok: true, ...result });
}