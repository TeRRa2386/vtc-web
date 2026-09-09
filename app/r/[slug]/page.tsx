import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, Copy, Smartphone } from "lucide-react";

import { MotionShell } from "@/components/motion-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  detectPlatform,
  hashUserAgent,
  type PartnerRecord
} from "@/lib/referrals";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ReferralLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: partner } = await supabase
    .from("partners")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!partner) {
    notFound();
  }

  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") ?? "";
  const platform = detectPlatform(userAgent);
  const { data: click } = await supabase
    .from("partner_link_clicks")
    .insert({
      destination: "landing",
      landing_url: `/r/${slug}`,
      partner_id: partner.id,
      platform_detected: platform,
      user_agent_hash: hashUserAgent(userAgent)
    })
    .select("click_id")
    .single();

  const typedPartner = partner as PartnerRecord;

  return (
    <main className="min-h-screen bg-muted/45 px-4 py-10 sm:px-6 lg:px-8">
      <MotionShell className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="bg-[#001A2F] p-6 text-white">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <BadgeCheck size={28} />
            </div>
            <h1 className="mt-6 text-4xl font-black">Vet Tech Companion</h1>
            <p className="mt-3 max-w-2xl text-lg font-semibold text-white/75">
              Clinical tools for daily veterinary patient care, shared through {typedPartner.name}.
            </p>
          </div>
          <div className="grid gap-5 p-6">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-black text-primary">Referral</p>
              <h2 className="mt-1 text-2xl font-black">{typedPartner.name}</h2>
              {typedPartner.group_name ? <p className="mt-1 text-sm font-semibold text-muted-foreground">{typedPartner.group_name}</p> : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                aria-label="Download on the App Store"
                className="inline-flex h-14 w-[13rem] overflow-hidden rounded-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                href={`/r/${typedPartner.slug}/ios`}
                rel="noreferrer"
              >
                <img
                  alt="Download on the App Store"
                  className="h-14 w-auto"
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                />
              </a>
              <a
                aria-label="Get it on Google Play"
                className="inline-flex h-14 w-[13rem] items-center overflow-hidden rounded-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                href={`/r/${typedPartner.slug}/android`}
                rel="noreferrer"
              >
                <img
                  alt="Get it on Google Play"
                  className="h-[5.35rem] w-auto -translate-x-[0.6rem]"
                  src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                />
              </a>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Smartphone size={17} />
              Your visit was recorded for referral tracking. No payment or personal information is collected on this page.
            </div>
          </div>
        </Card>

        <Card className="content-start p-6">
          <Badge tone="info">iOS referral code</Badge>
          <h2 className="mt-4 text-2xl font-black">Use code {typedPartner.android_referrer_code}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            If the app asks who referred you, enter this code during onboarding before starting a paid subscription.
          </p>
          <div className="mt-5 rounded-lg border bg-background p-4">
            <p className="flex items-center gap-2 text-sm font-black text-muted-foreground">
              <Copy size={16} />
              Referral code
            </p>
            <p className="mt-2 break-all text-3xl font-black tracking-normal text-primary">{typedPartner.android_referrer_code}</p>
          </div>
          <a className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary" href="/support">
            Need help?
            <ArrowRight size={16} />
          </a>
        </Card>
      </MotionShell>
    </main>
  );
}
