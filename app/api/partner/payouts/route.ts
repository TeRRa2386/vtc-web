import { NextResponse } from "next/server";

import { getPartnerPortalData } from "@/lib/partner-portal";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireApiPartnerAccess } from "@/lib/supabase/partner";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? undefined;
  const month = url.searchParams.get("month");
  const { access, error } = await requireApiPartnerAccess(slug);

  if (error) return error;
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getPartnerPortalData(createSupabaseAdminClient(), access.partnerId, month);
  return NextResponse.json({
    currentMonthCommission: data.currentMonthCommission,
    partner: data.partner,
    payoutHistory: data.payoutHistory,
    selectedMonth: data.selectedMonth
  });
}
