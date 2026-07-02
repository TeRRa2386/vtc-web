import { AnnouncementForm } from "@/components/admin/announcement-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listRows } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

type Announcement = {
  id: string;
  title?: string;
  message?: string;
  platform?: string;
  is_active?: boolean;
  min_app_version?: string;
  expires_at?: string;
  created_at?: string;
};

export default async function AnnouncementsAdminPage() {
  const session = await requireAdmin();
  const announcements = await listRows<Announcement>("app_announcements", "created_at", 100);

  return (
    <AdminShell session={session}>
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">App Announcements</h1>
        <p className="mt-2 text-muted-foreground">Create active notices for the mobile app and public updates page.</p>
      </div>
      <Card className="p-5">
        <h2 className="mb-4 text-xl font-black">New announcement</h2>
        <AnnouncementForm />
      </Card>
      <div className="grid gap-4">
        {announcements.map((announcement) => (
          <Card className="p-5" key={announcement.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={announcement.is_active ? "success" : "default"}>{announcement.is_active ? "active" : "inactive"}</Badge>
                <Badge>{announcement.platform ?? "all"}</Badge>
              </div>
              <p className="text-xs font-bold text-muted-foreground">{formatDate(announcement.created_at)}</p>
            </div>
            <h2 className="mt-3 text-xl font-black">{announcement.title}</h2>
            <p className="mt-2 leading-7 text-muted-foreground">{announcement.message}</p>
            <p className="mt-3 text-xs font-bold text-muted-foreground">
              Min version: {announcement.min_app_version || "none"} · Expires: {formatDate(announcement.expires_at)}
            </p>
          </Card>
        ))}
      </div>
    </div>
    </AdminShell>
  );
}
