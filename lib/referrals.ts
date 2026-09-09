import { createHash } from "crypto";

export const appStoreUrl = "https://apps.apple.com/app/id6778492686";
export const googlePlayUrl = "https://play.google.com/store/apps/details?id=com.vettechcompanion.app";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vettechcompanion.com";
export const referralClaimMaxClickAgeDays = Number(process.env.REFERRAL_CLAIM_MAX_CLICK_AGE_DAYS ?? 30);

export type PartnerRecord = {
  android_referrer_code?: string | null;
  created_at?: string | null;
  group_name?: string | null;
  id: string;
  ios_campaign_token?: string | null;
  ios_provider_token?: string | null;
  name: string;
  notes?: string | null;
  slug: string;
  status?: string | null;
  updated_at?: string | null;
};

export function normalizePartnerSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function normalizePartnerCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function detectPlatform(userAgent: string) {
  const normalized = userAgent.toLowerCase();
  if (normalized.includes("android")) return "android";
  if (normalized.includes("iphone") || normalized.includes("ipad") || normalized.includes("ipod")) return "ios";
  if (normalized.includes("windows") || normalized.includes("macintosh") || normalized.includes("linux")) return "desktop";
  return "unknown";
}

export function hashUserAgent(userAgent: string) {
  if (!userAgent) return null;
  return createHash("sha256").update(userAgent).digest("hex");
}

export function buildReferralUrl(slug: string) {
  return `${siteUrl.replace(/\/$/, "")}/r/${slug}`;
}

export function buildGooglePlayReferralUrl(partner: PartnerRecord, clickId?: string | null) {
  const referrer = new URLSearchParams({
    partner: partner.android_referrer_code || partner.slug,
    partner_slug: partner.slug,
    utm_source: "partner",
    utm_medium: "referral",
    utm_campaign: partner.slug
  });

  if (clickId) {
    referrer.set("click_id", clickId);
  }

  const url = new URL(googlePlayUrl);
  url.searchParams.set("referrer", referrer.toString());
  return url.toString();
}

export function buildAppStoreCampaignUrl(partner: PartnerRecord) {
  if (!partner.ios_campaign_token || !partner.ios_provider_token) {
    return appStoreUrl;
  }

  const url = new URL(appStoreUrl);
  url.searchParams.set("pt", partner.ios_provider_token);
  url.searchParams.set("ct", partner.ios_campaign_token);
  url.searchParams.set("mt", "8");
  return url.toString();
}

