import { NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const admin = await requireApiAdmin("admin");
  if (admin.error) return admin.error;

  const body = await request.json();
  const partnerId = String(body.partnerId ?? "");
  const year = Number(body.year);
  const month = Number(body.month);
  const amount = Number(body.amount);
  const adminNotes = String(body.adminNotes ?? "").trim() || null;

  if (!partnerId || !Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || Number.isNaN(amount)) {
    return NextResponse.json({ error: "Partner, period, and final amount are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: partner } = await supabase.from("partners").select("id").eq("id", partnerId).maybeSingle();
  if (!partner) {
    return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  }

  const { data: rows, error: ledgerError } = await supabase
    .from("partner_commission_events")
    .select("commission_amount")
    .eq("partner_id", partnerId)
    .eq("payout_period_year", year)
    .eq("payout_period_month", month)
    .neq("status", "void");

  if (ledgerError) {
    return NextResponse.json({ error: ledgerError.message }, { status: 400 });
  }

  const ledgerNet = (rows ?? []).reduce((sum, row: { commission_amount: number | string | null }) => sum + Number(row.commission_amount ?? 0), 0);
  const positive = (rows ?? [])
    .filter((row: { commission_amount: number | string | null }) => Number(row.commission_amount ?? 0) > 0)
    .reduce((sum, row: { commission_amount: number | string | null }) => sum + Number(row.commission_amount ?? 0), 0);
  const adjustments = (rows ?? [])
    .filter((row: { commission_amount: number | string | null }) => Number(row.commission_amount ?? 0) < 0)
    .reduce((sum, row: { commission_amount: number | string | null }) => sum + Number(row.commission_amount ?? 0), 0);
  const paidAt = new Date().toISOString();

  const { data: payout, error } = await supabase
    .from("partner_payouts")
    .upsert(
      {
        adjustments,
        admin_notes: adminNotes,
        amount,
        finalized_at: paidAt,
        gross_positive_commission: positive,
        net_amount: amount,
        paid_at: paidAt,
        paid_by_admin_id: admin.session!.userId,
        partner_id: partnerId,
        period_month: month,
        period_year: year,
        status: "paid",
        updated_at: paidAt
      },
      { onConflict: "partner_id,period_year,period_month" }
    )
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase
    .from("partner_commission_events")
    .update({ payout_id: payout.id, status: "paid" })
    .eq("partner_id", partnerId)
    .eq("payout_period_year", year)
    .eq("payout_period_month", month)
    .neq("status", "void");

  return NextResponse.json({ ledgerNet, ok: true });
}
