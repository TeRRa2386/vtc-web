import type { SupabaseClient } from "@supabase/supabase-js";

import { getBusinessPayoutPeriod, maskCustomerId } from "@/lib/commissions";
import { buildReferralUrl, getPartnerReferralCode, type PartnerRecord } from "@/lib/referrals";
import { formatDate } from "@/lib/utils";

export type PartnerPortalData = {
  availableMonths: { label: string; value: string }[];
  currentMonthCommission: number;
  lifetimeCommission: number;
  paidLifetime: number;
  partner: {
    name: string;
    referralCode: string;
    referralUrl: string;
    slug: string;
    status: string;
  };
  payoutHistory: {
    amount: number;
    label: string;
    paidAt: string | null;
    status: string;
    value: string;
  }[];
  pendingCommission: number;
  platformBreakdown: {
    android: { attributedUsers: number; commission: number; payingUsers: number };
    ios: { attributedUsers: number; commission: number; payingUsers: number };
  };
  progress: {
    customer: string;
    currentCommission: number;
    eligibleUntil: string;
    planType: string;
    progressLabel: string;
    status: string;
  }[];
  referralSummary: {
    activePayingCustomers: number;
    payingReferredCustomers: number;
    totalAttributedUsers: number;
  };
  selectedMonth: {
    annual: number;
    adjustments: number;
    label: string;
    monthly: number;
    net: number;
    payout: {
      amount: number | null;
      paidAt: string | null;
      status: string;
    };
    value: string;
  };
  transactions: {
    amount: number;
    customer: string;
    date: string;
    description: string;
    paymentLabel: string;
    platform: string;
    planType: string;
  }[];
};

type CommissionRow = {
  commission_amount: number | string;
  commission_type: string;
  effective_at: string | null;
  eligibility_end: string | null;
  id: string;
  monthly_payment_number: number | null;
  partner_id: string;
  payout_period_month: number;
  payout_period_year: number;
  plan_type: string | null;
  platform: string | null;
  status: string | null;
  user_id: string;
};

type PayoutRow = {
  amount: number | string | null;
  net_amount: number | string | null;
  paid_at: string | null;
  period_month: number;
  period_year: number;
  status: string | null;
};

type ProfileRow = {
  commission_model: string;
  eligibility_end: string;
  id: string;
  user_id: string;
};

type AttributionRow = {
  platform: string | null;
  source: string | null;
  user_id: string;
};

function money(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function monthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function parseMonth(value?: string | null) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return { month, year };
  }
  return getBusinessPayoutPeriod(new Date().toISOString());
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(value);
}

function normalizePlatform(platform?: string | null, source?: string | null) {
  if (platform === "android" || source === "google_play_install_referrer") return "android";
  if (platform === "ios" || source === "partner_code") return "ios";
  return "unknown";
}

function commissionDescription(row: CommissionRow) {
  if (row.commission_type === "refund_reversal") return "Refund adjustment";
  if (row.commission_type === "manual_adjustment") return "Manual adjustment";
  if (row.commission_type === "annual_first_paid" || row.commission_type === "annual_first_paid_transaction") {
    return "First paid annual";
  }
  return "Monthly commission";
}

export async function getPartnerPortalData(
  supabase: SupabaseClient,
  partnerId: string,
  selectedMonthValue?: string | null
): Promise<PartnerPortalData> {
  const selected = parseMonth(selectedMonthValue);
  const currentPeriod = getBusinessPayoutPeriod(new Date().toISOString());

  const [
    { data: partner },
    { data: attributions },
    { data: profiles },
    { data: commissions },
    { data: payouts }
  ] = await Promise.all([
    supabase.from("partners").select("*").eq("id", partnerId).single(),
    supabase.from("user_partner_attributions").select("user_id, platform, source").eq("partner_id", partnerId),
    supabase.from("partner_commission_profiles").select("id, user_id, commission_model, eligibility_end").eq("partner_id", partnerId),
    supabase
      .from("partner_commission_events")
      .select("id, partner_id, user_id, commission_type, commission_amount, plan_type, platform, effective_at, eligibility_end, monthly_payment_number, payout_period_year, payout_period_month, status")
      .eq("partner_id", partnerId)
      .neq("status", "void")
      .order("effective_at", { ascending: false }),
    supabase
      .from("partner_payouts")
      .select("period_year, period_month, amount, net_amount, status, paid_at")
      .eq("partner_id", partnerId)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
  ]);

  const partnerRow = partner as PartnerRecord;
  const attributionRows = (attributions ?? []) as AttributionRow[];
  const profileRows = (profiles ?? []) as ProfileRow[];
  const commissionRows = (commissions ?? []) as CommissionRow[];
  const payoutRows = (payouts ?? []) as PayoutRow[];
  const selectedRows = commissionRows.filter(
    (row) => row.payout_period_year === selected.year && row.payout_period_month === selected.month
  );
  const currentRows = commissionRows.filter(
    (row) => row.payout_period_year === currentPeriod.year && row.payout_period_month === currentPeriod.month
  );
  const paidPayouts = payoutRows.filter((row) => row.status === "paid");
  const lifetimeCommission = commissionRows.reduce((sum, row) => sum + money(row.commission_amount), 0);
  const paidLifetime = paidPayouts.reduce((sum, row) => sum + money(row.net_amount ?? row.amount), 0);
  const selectedPayout = payoutRows.find(
    (row) => row.period_year === selected.year && row.period_month === selected.month
  );

  const monthly = selectedRows
    .filter((row) => row.commission_type === "monthly_paid_period")
    .reduce((sum, row) => sum + money(row.commission_amount), 0);
  const annual = selectedRows
    .filter((row) => row.commission_type === "annual_first_paid" || row.commission_type === "annual_first_paid_transaction")
    .reduce((sum, row) => sum + money(row.commission_amount), 0);
  const adjustments = selectedRows
    .filter((row) => row.commission_type === "refund_reversal" || row.commission_type === "manual_adjustment")
    .reduce((sum, row) => sum + money(row.commission_amount), 0);
  const net = selectedRows.reduce((sum, row) => sum + money(row.commission_amount), 0);

  const monthKeys = new Set<string>([
    monthValue(currentPeriod.year, currentPeriod.month),
    ...commissionRows.map((row) => monthValue(row.payout_period_year, row.payout_period_month)),
    ...payoutRows.map((row) => monthValue(row.period_year, row.period_month))
  ]);
  const availableMonths = [...monthKeys]
    .sort((a, b) => b.localeCompare(a))
    .map((value) => {
      const [year, month] = value.split("-").map(Number);
      return { label: monthLabel(year, month), value };
    });

  const platformBreakdown = {
    android: {
      attributedUsers: attributionRows.filter((row) => normalizePlatform(row.platform, row.source) === "android").length,
      commission: commissionRows
        .filter((row) => normalizePlatform(row.platform) === "android")
        .reduce((sum, row) => sum + money(row.commission_amount), 0),
      payingUsers: new Set(
        commissionRows.filter((row) => normalizePlatform(row.platform) === "android" && money(row.commission_amount) > 0).map((row) => row.user_id)
      ).size
    },
    ios: {
      attributedUsers: attributionRows.filter((row) => normalizePlatform(row.platform, row.source) === "ios").length,
      commission: commissionRows
        .filter((row) => normalizePlatform(row.platform) === "ios")
        .reduce((sum, row) => sum + money(row.commission_amount), 0),
      payingUsers: new Set(
        commissionRows.filter((row) => normalizePlatform(row.platform) === "ios" && money(row.commission_amount) > 0).map((row) => row.user_id)
      ).size
    }
  };

  const now = Date.now();
  const progress = profileRows.map((profile) => {
    const userRows = commissionRows.filter((row) => row.user_id === profile.user_id && money(row.commission_amount) > 0);
    const currentCommission = userRows.reduce((sum, row) => sum + money(row.commission_amount), 0);
    const monthlyPayments = userRows.filter((row) => row.commission_type === "monthly_paid_period").length;
    const annualComplete = profile.commission_model === "annual" && userRows.some((row) => row.commission_type.startsWith("annual_first_paid"));

    return {
      customer: maskCustomerId(profile.user_id),
      currentCommission,
      eligibleUntil: formatDate(profile.eligibility_end),
      planType: profile.commission_model,
      progressLabel: profile.commission_model === "monthly" ? `Payment ${monthlyPayments}/12` : "First annual commission",
      status: annualComplete || monthlyPayments >= 12 || new Date(profile.eligibility_end).getTime() < now ? "Complete" : "In progress"
    };
  });

  const payoutHistory = availableMonths.map((month) => {
    const [year, monthNumber] = month.value.split("-").map(Number);
    const payout = payoutRows.find((row) => row.period_year === year && row.period_month === monthNumber);
    const ledgerAmount = commissionRows
      .filter((row) => row.payout_period_year === year && row.payout_period_month === monthNumber)
      .reduce((sum, row) => sum + money(row.commission_amount), 0);

    return {
      amount: payout?.status === "paid" ? money(payout.net_amount ?? payout.amount) : ledgerAmount,
      label: month.label,
      paidAt: payout?.paid_at ?? null,
      status: payout?.status ?? "pending",
      value: month.value
    };
  });

  return {
    availableMonths,
    currentMonthCommission: currentRows.reduce((sum, row) => sum + money(row.commission_amount), 0),
    lifetimeCommission,
    paidLifetime,
    partner: {
      name: partnerRow.name,
      referralCode: getPartnerReferralCode(partnerRow),
      referralUrl: buildReferralUrl(partnerRow.slug),
      slug: partnerRow.slug,
      status: partnerRow.status ?? "active"
    },
    payoutHistory,
    pendingCommission: lifetimeCommission - paidLifetime,
    platformBreakdown,
    progress,
    referralSummary: {
      activePayingCustomers: profileRows.filter((row) => new Date(row.eligibility_end).getTime() >= now).length,
      payingReferredCustomers: profileRows.length,
      totalAttributedUsers: attributionRows.length
    },
    selectedMonth: {
      annual,
      adjustments,
      label: monthLabel(selected.year, selected.month),
      monthly,
      net,
      payout: {
        amount: selectedPayout ? money(selectedPayout.net_amount ?? selectedPayout.amount) : null,
        paidAt: selectedPayout?.paid_at ?? null,
        status: selectedPayout?.status ?? "pending"
      },
      value: monthValue(selected.year, selected.month)
    },
    transactions: selectedRows.map((row) => ({
      amount: money(row.commission_amount),
      customer: maskCustomerId(row.user_id),
      date: formatDate(row.effective_at),
      description: commissionDescription(row),
      paymentLabel: row.monthly_payment_number ? `Payment ${row.monthly_payment_number}/12` : commissionDescription(row),
      platform: normalizePlatform(row.platform),
      planType: row.plan_type ?? "unknown"
    }))
  };
}

export { currency };
