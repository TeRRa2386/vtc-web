import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeRevenueCatWebhookPayload, resolveRevenueCatUserId } from "@/lib/revenuecat";

const ANNUAL_COMMISSION_AMOUNT = 1;
const MONTHLY_COMMISSION_AMOUNT = 0.2;
const MAX_MONTHLY_PAYMENTS = 12;
const BUSINESS_TIME_ZONE = "America/New_York";
const PAID_EVENT_TYPES = new Set(["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE"]);

type RevenueCatEventRow = {
  aliases?: string[] | null;
  app_user_id?: string | null;
  cancellation_reason?: string | null;
  currency?: string | null;
  environment: string;
  event_timestamp?: string | null;
  event_type: string;
  expiration_at?: string | null;
  id?: string;
  is_refund_event?: boolean | null;
  is_trial_conversion?: boolean | null;
  original_app_user_id?: string | null;
  original_transaction_id?: string | null;
  period_type?: string | null;
  plan_type?: "monthly" | "annual" | "unknown" | null;
  price?: number | string | null;
  product_id?: string | null;
  purchased_at?: string | null;
  raw_event?: Record<string, unknown> | null;
  received_at?: string | null;
  revenuecat_event_id: string;
  store?: string | null;
  subscriber_attributes?: Record<string, unknown> | null;
  transaction_id?: string | null;
  user_id?: string | null;
};

type AttributionRow = {
  attribution_confidence: string | null;
  id: string;
  partner_id: string;
  user_id: string;
};

type CommissionProfileRow = {
  id: string;
  user_id: string;
  partner_id: string;
  attribution_id: string | null;
  commission_model: "monthly" | "annual";
  first_paid_revenuecat_event_id: string | null;
  first_paid_transaction_id: string;
  first_paid_at: string;
  eligibility_start: string;
  eligibility_end: string;
};

type CommissionEventRow = {
  id: string;
  commission_amount: number | string;
  commission_profile_id?: string | null;
  commission_type: string;
  original_transaction_id?: string | null;
  plan_type?: "monthly" | "annual" | "unknown" | null;
  revenuecat_event_id?: string | null;
  reversal_of?: string | null;
  source_transaction_id?: string | null;
  status?: string | null;
  transaction_id?: string | null;
};

type ProcessingResult = {
  created: number;
  reason?: string;
  reversed: number;
  skipped: boolean;
  voided: number;
};

function numberValue(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function addOneCalendarYear(value: string) {
  const date = new Date(value);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString();
}

function compareIso(a?: string | null, b?: string | null) {
  return new Date(a ?? 0).getTime() - new Date(b ?? 0).getTime();
}

function getEffectiveAt(event: RevenueCatEventRow) {
  return event.event_timestamp ?? event.purchased_at ?? event.received_at ?? new Date().toISOString();
}

export function getBusinessPayoutPeriod(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric"
  }).formatToParts(new Date(value));

  return {
    month: Number(parts.find((part) => part.type === "month")?.value ?? 1),
    year: Number(parts.find((part) => part.type === "year")?.value ?? new Date(value).getUTCFullYear())
  };
}

export function maskCustomerId(userId?: string | null) {
  if (!userId) return "Customer unknown";
  return "Customer #" + userId.replace(/-/g, "").slice(0, 6).toUpperCase();
}

function storeToPlatform(store?: string | null) {
  const normalized = (store ?? "").toLowerCase();
  if (normalized.includes("play")) return "android";
  if (normalized.includes("app_store") || normalized.includes("appstore")) return "ios";
  return "unknown";
}

function transactionKey(event: RevenueCatEventRow) {
  return event.transaction_id ?? event.original_transaction_id ?? null;
}

function refundKeys(event: RevenueCatEventRow) {
  return new Set([event.transaction_id, event.original_transaction_id].filter((item): item is string => Boolean(item)));
}

function isPaidEvent(event: RevenueCatEventRow) {
  return event.environment === "production"
    && Boolean(event.user_id)
    && Boolean(event.transaction_id)
    && Boolean(event.purchased_at)
    && event.period_type !== "TRIAL"
    && event.plan_type !== "unknown"
    && Boolean(event.plan_type)
    && numberValue(event.price) > 0
    && PAID_EVENT_TYPES.has(event.event_type)
    && !event.is_refund_event;
}

function isRefundEvent(event: RevenueCatEventRow) {
  return event.environment === "production" && Boolean(event.user_id) && Boolean(event.is_refund_event);
}

function isWithinEligibility(event: RevenueCatEventRow, profile: CommissionProfileRow) {
  const purchasedAt = event.purchased_at;
  if (!purchasedAt) return false;
  return new Date(purchasedAt).getTime() >= new Date(profile.eligibility_start).getTime()
    && new Date(purchasedAt).getTime() < new Date(profile.eligibility_end).getTime();
}

async function getAttribution(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_partner_attributions")
    .select("id, user_id, partner_id, attribution_confidence")
    .eq("user_id", userId)
    .neq("attribution_confidence", "aggregate_only")
    .maybeSingle();

  if (error) throw error;
  return data as AttributionRow | null;
}

async function getEventsForUser(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("revenuecat_events")
    .select("*")
    .eq("user_id", userId)
    .order("purchased_at", { ascending: true, nullsFirst: false })
    .order("event_timestamp", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as RevenueCatEventRow[];
}

async function getExistingProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("partner_commission_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as CommissionProfileRow | null;
}

async function voidUserLedger(supabase: SupabaseClient, userId: string, reason: string) {
  const { data, error } = await supabase
    .from("partner_commission_events")
    .update({ status: "void", voided_at: new Date().toISOString(), void_reason: reason })
    .eq("user_id", userId)
    .neq("status", "void")
    .neq("commission_type", "manual_adjustment")
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

async function ensureProfile(
  supabase: SupabaseClient,
  attribution: AttributionRow,
  firstPaid: RevenueCatEventRow,
  existing: CommissionProfileRow | null
) {
  const firstTransaction = transactionKey(firstPaid);
  if (!firstPaid.user_id || !firstPaid.plan_type || firstPaid.plan_type === "unknown" || !firstPaid.purchased_at || !firstTransaction) {
    throw new Error("Cannot create commission profile without first paid transaction details.");
  }

  const payload = {
    attribution_id: attribution.id,
    commission_model: firstPaid.plan_type,
    eligibility_end: addOneCalendarYear(firstPaid.purchased_at),
    eligibility_start: firstPaid.purchased_at,
    first_paid_at: firstPaid.purchased_at,
    first_paid_revenuecat_event_id: firstPaid.revenuecat_event_id,
    first_paid_transaction_id: firstTransaction,
    partner_id: attribution.partner_id,
    updated_at: new Date().toISOString(),
    user_id: firstPaid.user_id
  };

  if (!existing) {
    const { data, error } = await supabase.from("partner_commission_profiles").insert(payload).select("*").single();
    if (error) throw error;
    return { changed: false, profile: data as CommissionProfileRow };
  }

  const changed = existing.first_paid_transaction_id !== payload.first_paid_transaction_id
    || existing.commission_model !== payload.commission_model
    || existing.partner_id !== payload.partner_id;

  if (!changed) {
    return { changed: false, profile: existing };
  }

  const { data, error } = await supabase
    .from("partner_commission_profiles")
    .update(payload)
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) throw error;
  return { changed: true, profile: data as CommissionProfileRow };
}

async function getLedger(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("partner_commission_events")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "void")
    .order("effective_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CommissionEventRow[];
}

function positiveWithoutReversal(row: CommissionEventRow, ledger: CommissionEventRow[]) {
  return numberValue(row.commission_amount) > 0
    && !ledger.some((candidate) => candidate.commission_type === "refund_reversal" && candidate.reversal_of === row.id && candidate.status !== "void");
}

async function insertCommission(
  supabase: SupabaseClient,
  profile: CommissionProfileRow,
  event: RevenueCatEventRow,
  amount: number,
  commissionType: "annual_first_paid" | "monthly_paid_period",
  monthlyPaymentNumber: number | null
) {
  const effectiveAt = event.purchased_at ?? getEffectiveAt(event);
  const payoutPeriod = getBusinessPayoutPeriod(effectiveAt);
  const { error } = await supabase.from("partner_commission_events").insert({
    commission_amount: amount,
    commission_profile_id: profile.id,
    commission_type: commissionType,
    effective_at: effectiveAt,
    eligibility_end: profile.eligibility_end,
    eligibility_start: profile.eligibility_start,
    monthly_payment_number: monthlyPaymentNumber,
    original_transaction_id: event.original_transaction_id,
    partner_id: profile.partner_id,
    payout_period_month: payoutPeriod.month,
    payout_period_year: payoutPeriod.year,
    plan_type: event.plan_type,
    platform: storeToPlatform(event.store),
    revenuecat_event_id: event.revenuecat_event_id,
    source_transaction_id: transactionKey(event),
    status: "posted",
    transaction_date: effectiveAt,
    transaction_id: event.transaction_id,
    user_id: profile.user_id
  });

  if (error && error.code !== "23505") throw error;
  return error?.code === "23505" ? 0 : 1;
}

async function insertReversal(
  supabase: SupabaseClient,
  profile: CommissionProfileRow,
  refund: RevenueCatEventRow,
  original: CommissionEventRow
) {
  const effectiveAt = getEffectiveAt(refund);
  const payoutPeriod = getBusinessPayoutPeriod(effectiveAt);
  const { error } = await supabase.from("partner_commission_events").insert({
    commission_amount: -Math.abs(numberValue(original.commission_amount)),
    commission_profile_id: profile.id,
    commission_type: "refund_reversal",
    effective_at: effectiveAt,
    eligibility_end: profile.eligibility_end,
    eligibility_start: profile.eligibility_start,
    original_transaction_id: refund.original_transaction_id ?? original.original_transaction_id,
    partner_id: profile.partner_id,
    payout_period_month: payoutPeriod.month,
    payout_period_year: payoutPeriod.year,
    plan_type: original.plan_type,
    platform: storeToPlatform(refund.store),
    revenuecat_event_id: refund.revenuecat_event_id,
    reversal_of: original.id,
    source_transaction_id: transactionKey(refund) ?? original.source_transaction_id,
    status: "posted",
    transaction_date: effectiveAt,
    transaction_id: refund.transaction_id ?? original.transaction_id,
    user_id: profile.user_id
  });

  if (error && error.code !== "23505") throw error;
  return error?.code === "23505" ? 0 : 1;
}

function wasRefunded(event: RevenueCatEventRow, refunds: RevenueCatEventRow[]) {
  const paidKeys = refundKeys(event);
  return refunds.some((refund) => [...refundKeys(refund)].some((key) => paidKeys.has(key)));
}

export async function processUserCommissions(supabase: SupabaseClient, userId: string): Promise<ProcessingResult> {
  const attribution = await getAttribution(supabase, userId);
  if (!attribution) return { created: 0, reason: "no_partner_attribution", reversed: 0, skipped: true, voided: 0 };

  const events = await getEventsForUser(supabase, userId);
  const paidEvents = events.filter(isPaidEvent).sort((a, b) => compareIso(a.purchased_at, b.purchased_at));
  if (!paidEvents.length) return { created: 0, reason: "no_paid_production_events", reversed: 0, skipped: true, voided: 0 };

  const firstPaid = paidEvents[0];
  const existingProfile = await getExistingProfile(supabase, userId);
  const { changed, profile } = await ensureProfile(supabase, attribution, firstPaid, existingProfile);
  const voided = changed ? await voidUserLedger(supabase, userId, "Commission profile changed after chronological reprocessing.") : 0;
  const refunds = events.filter(isRefundEvent);
  let ledger = await getLedger(supabase, userId);
  let created = 0;
  let reversed = 0;

  if (profile.commission_model === "annual") {
    const netAnnual = ledger.filter((row) => row.commission_type === "annual_first_paid" && positiveWithoutReversal(row, ledger));
    if (!netAnnual.length) {
      const annualEvent = paidEvents.find((event) => event.plan_type === "annual" && isWithinEligibility(event, profile) && !wasRefunded(event, refunds));
      if (annualEvent) {
        created += await insertCommission(supabase, profile, annualEvent, ANNUAL_COMMISSION_AMOUNT, "annual_first_paid", null);
        ledger = await getLedger(supabase, userId);
      }
    }
  }

  if (profile.commission_model === "monthly") {
    for (const event of paidEvents) {
      ledger = await getLedger(supabase, userId);
      const activeMonthly = ledger.filter((row) => row.commission_type === "monthly_paid_period" && positiveWithoutReversal(row, ledger));
      if (activeMonthly.length >= MAX_MONTHLY_PAYMENTS) break;
      if (event.plan_type !== "monthly" || !isWithinEligibility(event, profile) || wasRefunded(event, refunds)) continue;
      const source = transactionKey(event);
      if (!source || ledger.some((row) => row.source_transaction_id === source && numberValue(row.commission_amount) > 0 && row.status !== "void")) continue;
      created += await insertCommission(supabase, profile, event, MONTHLY_COMMISSION_AMOUNT, "monthly_paid_period", activeMonthly.length + 1);
    }
    ledger = await getLedger(supabase, userId);
  }

  for (const refund of refunds.sort((a, b) => compareIso(getEffectiveAt(a), getEffectiveAt(b)))) {
    ledger = await getLedger(supabase, userId);
    const keys = refundKeys(refund);
    const original = ledger.find((row) =>
      numberValue(row.commission_amount) > 0
      && row.status !== "void"
      && !ledger.some((candidate) => candidate.commission_type === "refund_reversal" && candidate.reversal_of === row.id && candidate.status !== "void")
      && [row.source_transaction_id, row.transaction_id, row.original_transaction_id].some((key) => key && keys.has(key))
    );
    if (original) {
      reversed += await insertReversal(supabase, profile, refund, original);
    }
  }

  return { created, reversed, skipped: false, voided };
}

export async function processRevenueCatEvent(supabase: SupabaseClient, revenuecatEventId: string) {
  const { data, error } = await supabase
    .from("revenuecat_events")
    .select("revenuecat_event_id, user_id")
    .eq("revenuecat_event_id", revenuecatEventId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.user_id) return { created: 0, reason: "unresolved_user", reversed: 0, skipped: true, voided: 0 };
  const result = await processUserCommissions(supabase, data.user_id);
  await supabase.from("revenuecat_events").update({ processed_at: new Date().toISOString() }).eq("revenuecat_event_id", revenuecatEventId);
  return result;
}

export async function reconcileRevenueCatEventUsers(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("revenuecat_events")
    .select("*")
    .is("user_id", null)
    .limit(500);

  if (error) throw error;
  let resolved = 0;

  for (const row of (data ?? []) as RevenueCatEventRow[]) {
    const normalized = normalizeRevenueCatWebhookPayload({ event: row.raw_event ?? row });
    const userId = await resolveRevenueCatUserId(supabase, normalized);
    if (!userId) continue;
    const { error: updateError } = await supabase
      .from("revenuecat_events")
      .update({ user_id: userId })
      .eq("revenuecat_event_id", row.revenuecat_event_id);
    if (updateError) throw updateError;
    resolved += 1;
  }

  return resolved;
}

export async function reprocessAllCommissions(supabase: SupabaseClient) {
  const resolved = await reconcileRevenueCatEventUsers(supabase);
  const { data, error } = await supabase
    .from("revenuecat_events")
    .select("user_id")
    .eq("environment", "production")
    .not("user_id", "is", null);

  if (error) throw error;
  const userIds = Array.from(new Set((data ?? []).map((row: { user_id: string | null }) => row.user_id).filter(Boolean))) as string[];
  let created = 0;
  let reversed = 0;
  let voided = 0;

  for (const userId of userIds) {
    const result = await processUserCommissions(supabase, userId);
    created += result.created;
    reversed += result.reversed;
    voided += result.voided;
  }

  return { created, processedUsers: userIds.length, resolved, reversed, voided };
}