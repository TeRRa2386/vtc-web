import { Card } from "@/components/ui/card";
import { staticDocuments, type StaticDocumentKey } from "@/content/static-documents";

export function StaticDocument({ documentKey }: { documentKey: StaticDocumentKey }) {
  const content = staticDocuments[documentKey]
    .replaceAll("â€œ", "“")
    .replaceAll("â€", "”")
    .replaceAll("â€™", "’")
    .replaceAll("â€“", "–")
    .replaceAll("Â©", "©")
    .replaceAll("â†’", "→");

  return (
    <Card className="mx-auto max-w-4xl p-6 sm:p-10">
      <article
        className="legal-document"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </Card>
  );
}
