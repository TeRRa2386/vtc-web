import type { SupabaseClient } from "@supabase/supabase-js";

export type RevenueCatPlanType = "monthly" | "annual" | "unknown";
export type RevenueCatEnvironment = "production" | "sandbox";

export type NormalizedRevenueCatEvent = {
  aliases: string[];
  appUserId: string | null;
  cancellationReason: string | null;
  currency: string | null;
  environment: RevenueCatEnvironment;
  eventTimestamp: string | null;
  eventType: string;
  expirationAt: string | null;
  expirationReason: string | null;
  isRefundEvent: boolean;
  isTrialConversion: boolean | null;
  originalAppUserId: string | null;
  originalTransactionId: string | null;
  periodType: string | null;
  planType: RevenueCatPlanType;
  price: number | null;
  productId: string | null;
  purchasedAt: string | null;
  rawEvent: Record<string, unknown>;
  revenuecatEventId: string;
  store: string | null;
  subscriberAttributes: Record<string, unknown>;
  transactionId: string | null;
};

export const REVENUECAT_PRODUCT_PLAN_MAP: Record<string, RevenueCatPlanType> = {
  "pro:monthly-standard": "monthly",
  "pro.monthly.standard": "monthly",
  "pro_monthly": "monthly",
  "pro:annual-founding": "annual",
  "pro.annual.founding": "annual",
  "pro:annual-standard": "annual",
  "pro.annual.standard": "annual",
  "pro_annual": "annual"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function timestampMsToIso(value: unknown) {
  const timestamp = numberOrNull(value);
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeEnvironment(value: unknown): RevenueCatEnvironment {
  const normalized = stringOrNull(value)?.toLowerCase();
  return normalized === "production" ? "production" : "sandbox";
}

function normalizeStore(value: unknown) {
  return stringOrNull(value)?.toLowerCase() ?? null;
}

function normalizeAliases(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeSubscriberAttributes(value: unknown) {
  return isRecord(value) ? value : {};
}

function planTypeForProduct(productId: string | null): RevenueCatPlanType {
  return productId ? REVENUECAT_PRODUCT_PLAN_MAP[productId] ?? "unknown" : "unknown";
}

function isRefundLikeEvent(eventType: string, cancellationReason: string | null) {
  return eventType === "CANCELLATION" && cancellationReason === "CUSTOMER_SUPPORT";
}

export function normalizeRevenueCatWebhookPayload(payload: unknown): NormalizedRevenueCatEvent {
  if (!isRecord(payload) || !isRecord(payload.event)) {
    throw new Error("Malformed RevenueCat webhook payload.");
  }

  const event = payload.event;
  const revenuecatEventId = stringOrNull(event.id);
  const eventType = stringOrNull(event.type);
  if (!revenuecatEventId || !eventType) {
    throw new Error("RevenueCat event id and type are required.");
  }

  const productId = stringOrNull(event.product_id);
  const cancellationReason = stringOrNull(event.cancel_reason);
  const price = numberOrNull(event.price_in_purchased_currency) ?? numberOrNull(event.price);

  return {
    aliases: normalizeAliases(event.aliases),
    appUserId: stringOrNull(event.app_user_id),
    cancellationReason,
    currency: stringOrNull(event.currency),
    environment: normalizeEnvironment(event.environment),
    eventTimestamp: timestampMsToIso(event.event_timestamp_ms),
    eventType,
    expirationAt: timestampMsToIso(event.expiration_at_ms),
    expirationReason: stringOrNull(event.expiration_reason),
    isRefundEvent: isRefundLikeEvent(eventType, cancellationReason),
    isTrialConversion: typeof event.is_trial_conversion === "boolean" ? event.is_trial_conversion : null,
    originalAppUserId: stringOrNull(event.original_app_user_id),
    originalTransactionId: stringOrNull(event.original_transaction_id),
    periodType: stringOrNull(event.period_type),
    planType: planTypeForProduct(productId),
    price,
    productId,
    purchasedAt: timestampMsToIso(event.purchased_at_ms),
    rawEvent: event,
    revenuecatEventId,
    store: normalizeStore(event.store),
    subscriberAttributes: normalizeSubscriberAttributes(event.subscriber_attributes),
    transactionId: stringOrNull(event.transaction_id)
  };
}

function uniqueCandidates(event: NormalizedRevenueCatEvent) {
  return Array.from(new Set([event.appUserId, event.originalAppUserId, ...event.aliases].filter((item): item is string => Boolean(item))));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function resolveRevenueCatUserId(supabase: SupabaseClient, event: NormalizedRevenueCatEvent) {
  for (const candidate of uniqueCandidates(event)) {
    if (!isUuid(candidate)) continue;

    const { data, error } = await supabase.auth.admin.getUserById(candidate);
    if (!error && data.user?.id) {
      return data.user.id;
    }
  }

  return null;
}
