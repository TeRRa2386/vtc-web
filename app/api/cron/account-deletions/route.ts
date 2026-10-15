import { NextRequest, NextResponse } from "next/server";

import { executeAccountDeletion } from "@/lib/account-deletion";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("id")
    .eq("status", "processing")
    .lte("scheduled_deletion_at", new Date().toISOString())
    .order("scheduled_deletion_at", { ascending: true })
    .limit(25);
  if (error) return NextResponse.json({ error: "Unable to load due requests." }, { status: 500 });

  let completed = 0;
  let failed = 0;
  for (const row of data ?? []) {
    try {
      const result = await executeAccountDeletion({ requestId: row.id });
      if (result.status === "completed") completed += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ completed, failed, scanned: data?.length ?? 0 });
}
