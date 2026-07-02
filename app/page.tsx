import Link from "next/link";
import { Activity, ArrowRight, Bell, Calculator, HeartPulse, Sparkles } from "lucide-react";

import { MotionShell } from "@/components/motion-shell";
import { PageShell } from "@/components/public/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  { icon: Calculator, title: "Clinical calculators", text: "Dose, fluids, dilution, conversions, bolus/CRI, and anesthesia workflow tools." },
  { icon: HeartPulse, title: "Reference library", text: "Drug, emergency, disease, vaccine, and normal values references organized for fast use." },
  { icon: Bell, title: "Patient timers", text: "Multi-timer support for rounds, treatments, monitoring, and daily patient care." }
];

export default function HomePage() {
  return (
    <PageShell>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <MotionShell>
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm font-black text-primary shadow-sm">
            <Sparkles size={16} />
            Built for Vet Techs, Vets, Assistants, and Students — refined by their feedback.
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-normal text-foreground sm:text-6xl">
            Vet Tech Companion
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-muted-foreground">
            Fast clinical tools for study, rounds, emergency support, and daily patient care.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/support">
                Contact support
                <ArrowRight size={18} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/tester-guide">Tester guide</Link>
            </Button>
          </div>
        </MotionShell>
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="bg-[#001A2F] text-white">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <Activity size={28} />
            </div>
            <CardTitle className="text-3xl">Clinical reference with safer operations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-6">
            {features.map((feature) => (
              <div className="flex gap-4 rounded-lg border bg-background p-4" key={feature.title}>
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <feature.icon size={22} />
                </div>
                <div>
                  <h2 className="font-black">{feature.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
