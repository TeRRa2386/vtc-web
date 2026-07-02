import type { Metadata } from "next";

import { PageShell } from "@/components/public/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "FAQ"
};

const faqs = [
  ["Is Vet Tech Companion medical advice?", "No. It is an educational and workflow-support tool. Always verify information with a licensed veterinarian, clinic protocols, current formularies, and patient-specific assessment."],
  ["How do I restore Pro access?", "Open the subscription screen in the app and use Restore Purchases. If access still looks incorrect, contact support with the email used for the app account."],
  ["Does deleting my account cancel my subscription?", "No. Apple and Google manage subscriptions. Cancel active billing through App Store or Google Play subscription settings."],
  ["Where can testers report issues?", "Use the app support area or email support@vettechcompanion.com with your device, app version, platform, and steps to reproduce the issue."]
];

export default function FaqPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-black sm:text-5xl">FAQ</h1>
        <div className="mt-8 grid gap-4">
          {faqs.map(([question, answer]) => (
            <Card className="p-6" key={question}>
              <h2 className="text-xl font-black">{question}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{answer}</p>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
