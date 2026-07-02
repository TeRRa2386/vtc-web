import type { Metadata } from "next";

import { PageShell } from "@/components/public/page-shell";
import { TesterGuideCarousel } from "@/components/public/tester-guide-carousel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tester Guide"
};

export default function TesterGuidePage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="p-6 sm:p-8">
          <div className="text-center">
            <h1 className="text-4xl font-black text-foreground sm:text-5xl">Vet Tech Companion</h1>
            <p className="mt-2 text-sm font-black text-primary">Android Testing Guide</p>
          </div>

          <div className="mt-8 grid gap-4 text-base font-semibold leading-8 text-muted-foreground">
            <p>Hi! Thank you so much for helping us test <strong className="text-foreground">Vet Tech Companion</strong>.</p>
            <p>This quick guide will show you how to join the Android test, download the app, and activate Pro access during testing.</p>
          </div>

          <div className="mt-7 text-center">
            <Button asChild size="lg">
              <a href="https://play.google.com/store/apps/details?id=com.vettechcompanion.app">Download App</a>
            </Button>
          </div>

          <div className="mt-7 rounded-md border-l-4 border-primary bg-primary/10 p-4 text-sm font-semibold leading-7 text-muted-foreground">
            <strong className="text-foreground">Testing is completely free.</strong>
            <br />
            During the test, Google Play may ask you to select a plan, but it should use a tester payment method. No real payment should be made.
          </div>

          <div className="mt-8">
            <TesterGuideCarousel />
          </div>

          <div className="mt-8 rounded-md bg-muted p-4 text-center text-sm font-semibold leading-7 text-muted-foreground">
            Need help or want to send feedback?
            <br />
            Email us at <a className="font-black text-primary" href="mailto:support@vettechcompanion.com">support@vettechcompanion.com</a>
          </div>
        </Card>

        <p className="mt-5 text-center text-xs font-bold text-muted-foreground">
          This guide is for Android testers who volunteered to test Vet Tech Companion.
        </p>
      </section>
    </PageShell>
  );
}
