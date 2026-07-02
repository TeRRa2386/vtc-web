import type { Metadata } from "next";

import { PageShell } from "@/components/public/page-shell";
import { StaticDocument } from "@/components/public/static-document";

export const metadata: Metadata = {
  title: "Terms of Service"
};

export default function TermsPage() {
  return (
    <PageShell>
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <StaticDocument documentKey="terms" />
      </section>
    </PageShell>
  );
}
