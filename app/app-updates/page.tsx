import type { Metadata } from "next";

import { PageShell } from "@/components/public/page-shell";
import { Card } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "App Updates"
};

export default async function AppUpdatesPage() {
  let announcements: Array<{ id: string; title: string; message: string; created_at?: string; platform?: string }> = [];

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("app_announcements")
      .select("id,title,message,platform,created_at")
      .eq("is_active", true)
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
                <p className="mt-2 leading-7 text-muted-foreground">{announcement.message}</p>
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
