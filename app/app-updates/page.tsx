import type { Metadata } from "next";

import { PageShell } from "@/components/public/page-shell";
import { Card } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "App Updates"
};

export const dynamic = "force-dynamic";

function formatAnnouncementMessage(message: string) {
  const normalizedMessage = message
    .replace(/\s+(What's New|What’s New)\s*•\s*/i, "\n\nWhat's New\n• ")
    .replace(/\s+(Additional Improvements)\s*•\s*/i, "\n\nAdditional Improvements\n• ")
    .replace(/\s+•\s+/g, "\n• ");

  return normalizedMessage
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, blockIndex) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const heading = lines.length > 1 && !lines[0].startsWith("•") ? lines[0] : null;
      const contentLines = heading ? lines.slice(1) : lines;
      const bulletLines = contentLines.filter((line) => line.startsWith("•"));
      const paragraphLines = contentLines.filter((line) => !line.startsWith("•"));

      return (
        <div className="grid gap-3" key={`${blockIndex}-${block.slice(0, 20)}`}>
          {heading ? <h3 className="text-base font-black text-foreground">{heading}</h3> : null}
          {paragraphLines.map((line) => (
            <p className="leading-7 text-muted-foreground" key={line}>
              {line}
            </p>
          ))}
          {bulletLines.length ? (
            <ul className="grid gap-2 pl-5 text-muted-foreground">
              {bulletLines.map((line) => (
                <li className="list-disc leading-7" key={line}>
                  {line.replace(/^•\s*/, "")}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    });
}

export default async function AppUpdatesPage() {
  let announcements: Array<{ id: string; title: string; message: string; created_at?: string; platform?: string }> = [];
  const now = new Date().toISOString();

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("app_announcements")
      .select("id,title,message,platform,created_at")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false })
      .limit(10);
    announcements = data ?? [];
  } catch {
    announcements = [];
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-black sm:text-5xl">App Updates</h1>
        <p className="mt-4 text-lg font-semibold leading-8 text-muted-foreground">
          Release notes, active notices, and important operational updates.
        </p>
        <div className="mt-8 grid gap-4">
          {announcements.length ? (
            announcements.map((announcement) => (
              <Card className="p-6" key={announcement.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-black">{announcement.title}</h2>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                    {announcement.platform ?? "all"}
                  </span>
                </div>
                <div className="mt-4 grid gap-5">
                  {formatAnnouncementMessage(announcement.message)}
                </div>
                <p className="mt-4 text-xs font-bold text-muted-foreground">{formatDate(announcement.created_at)}</p>
              </Card>
            ))
          ) : (
            <Card className="p-6">
              <h2 className="text-xl font-black">No active announcements</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Updates will appear here when announcements are published.
              </p>
            </Card>
          )}
        </div>
      </section>
    </PageShell>
  );
}
