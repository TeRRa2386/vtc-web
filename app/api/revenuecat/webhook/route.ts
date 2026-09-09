import { NextRequest, NextResponse } from "next/server";

import { normalizeRevenueCatWebhookPayload, resolveRevenueCatUserId } from "@/lib/revenuecat";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function getSuppliedToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return request.headers.get("x-revenuecat-webhook-token")?.trim() ?? "";
}

function isAuthorized(request: NextRequest) {
  const expectedToken = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN;
  const suppliedToken = getSuppliedToken(request);

  return Boolean(expectedToken && suppliedToken && suppliedToken === expectedToken);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  let normalized;
  try {
    normalized = normalizeRevenueCatWebhookPayload(payload);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("revenuecat_events").insert({
    aliases: normalized.aliases,
    app_user_id: normalized.appUserId,
    cancellation_reason: normalized.cancellationReason,
    currency: normalized.currency,
    environment: normalized.environment,
    event_timestamp: normalized.eventTimestamp,
    event_type: normalized.eventType,
    expiration_at: normalized.expirationAt,
    expiration_reason: normalized.expirationReason,
    is_refund_event: normalized.isRefundEvent,
    is_trial_conversion: normalized.isTrialConversion,
    original_app_user_id: normalized.originalAppUserId,
    original_transaction_id: normalized.originalTransactionId,
    period_type: normalized.periodType,
    plan_type: normalized.planType,
    price: normalized.price,
    product_id: normalized.productId,
    purchased_at: normalized.purchasedAt,
    raw_event: normalized.rawEvent,
    revenuecat_event_id: normalized.revenuecatEventId,
    store: normalized.store,
    subscriber_attributes: normalized.subscriberAttributes,
    transaction_id: normalized.transactionId
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, status: "duplicate" });
    }

    console.error("RevenueCat webhook insert failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  let userId: string | null = null;
  try {
    userId = await resolveRevenueCatUserId(supabase, normalized);
    if (userId) {
      const { error: updateError } = await supabase
        .from("revenuecat_events")
        .update({ user_id: userId })
        .eq("revenuecat_event_id", normalized.revenuecatEventId);

      if (updateError) {
        console.error("RevenueCat user resolution update failed", { code: updateError.code, message: updateError.message });
        userId = null;
      }
    }
  } catch (resolutionError) {
    console.error("RevenueCat user resolution failed", {
      message: resolutionError instanceof Error ? resolutionError.message : "Unknown resolution error"
    });
  }

  return NextResponse.json({ ok: true, status: "stored", userResolved: Boolean(userId) });
}