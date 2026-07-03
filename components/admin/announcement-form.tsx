"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function AnnouncementForm() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const form = new FormData(event.currentTarget);
    await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    event.currentTarget.reset();
    setIsSaving(false);
    router.refresh();
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <Input name="title" placeholder="Announcement title" required />
      <Textarea name="message" placeholder="Announcement message" required />
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Platform
          <Select defaultValue="all" name="platform">
            <option value="all">All platforms</option>
            <option value="ios">iOS</option>
            <option value="android">Android</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Minimum app version
          <Input name="min_app_version" placeholder="Example: 1.0.3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Expiration date/time
          <Input name="expires_at" type="datetime-local" />
        </label>
      </div>
      <Button disabled={isSaving} type="submit">{isSaving ? "Publishing..." : "Create announcement"}</Button>
    </form>
  );
}
