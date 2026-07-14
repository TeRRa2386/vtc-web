import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  Bone,
  Calculator,
  FileText,
  Filter,
  HeartPulse,
  Palette,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  UserRound
} from "lucide-react";

import { MotionShell } from "@/components/motion-shell";
import { PageShell } from "@/components/public/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: HeartPulse,
    title: "Clinical reference library",
    text: "Organized veterinary drug references, disease information, vaccine and biologic references, emergency guidance, and normal values for fast lookup."
  },
  {
    icon: ShieldAlert,
    title: "Toxicity Triage",
    text: "Organize exposure details, patient information, clinical signs, estimated exposure, risk level, and escalation summaries for veterinary toxicology cases."
  },
  {
    icon: Bone,
    title: "Interactive Dental Chart",
    text: "Document dog and cat dental findings by tooth, add notes, generate text or PDF reports, and save completed dental chart records."
  },
  {
    icon: Calculator,
    title: "Clinical calculators and tools",
    text: "Practical workflow tools for unit conversions, dilution support, anesthesia references, fluid support, and other daily veterinary calculations where available."
  },
  {
    icon: UserRound,
    title: "Patient information cards",
    text: "Capture patient ID, name, species, date of birth, age, weight, clinic email, and prepared-by details for supported workflows."
  },
  {
    icon: FileText,
    title: "PDF and text reports",
    text: "Generate clean clinical documentation summaries and PDF reports for supported modules, with saved report history for quick access."
  },
  {
    icon: Bell,
    title: "Patient timers",
    text: "Create and manage multiple patient timers with notes for treatments, monitoring, rounds, and daily patient care."
  },
  {
    icon: Stethoscope,
    title: "Notes and favorites",
    text: "Save clinical notes and favorite important references for faster access during study or clinical work."
  },
  {
    icon: Filter,
    title: "Advanced filters",
    text: "Filter diseases, drugs, vaccines, emergencies, and references by species and clinical category to find relevant information faster."
  },
  {
    icon: Palette,
    title: "Custom themes",
    text: "Personalize the app with light, dark, and premium visual themes designed for comfortable daily use."
  }
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
          <CardContent className="grid max-h-[460px] gap-4 overflow-y-auto p-6 pr-3">
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
