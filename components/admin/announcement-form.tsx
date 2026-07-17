"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type AnnouncementFormRecord = {
  expires_at?: string | null;
  id: string;
  is_active?: boolean | null;
  message?: string | null;
  min_app_version?: string | null;
  platform?: string | null;
  title?: string | null;
};

function formatDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 16);
}

export function AnnouncementForm({ announcement }: { announcement?: AnnouncementFormRecord }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(announcement);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setIsSaving(true);
    const form = new FormData(formElement);

    try {
      const payload = {
        ...Object.fromEntries(form.entries()),
        id: announcement?.id,
        is_active: form.get("is_active") === "on"
      };

      await fetch("/api/admin/announcements", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!isEditing) {
        formElement.reset();
      }

      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <Input defaultValue={announcement?.title ?? ""} name="title" placeholder="Announcement title" required />
      <Textarea defaultValue={announcement?.message ?? ""} name="message" placeholder="Announcement message" required />
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Platform
          <Select defaultValue={announcement?.platform ?? "all"} name="platform">
            <option value="all">All platforms</option>
            <option value="ios">iOS</option>
            <option value="android">Android</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Minimum app version
          <Input defaultValue={announcement?.min_app_version ?? ""} name="min_app_version" placeholder="Example: 1.0.3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Expiration date/time
          <Input defaultValue={formatDateTimeLocal(announcement?.expires_at)} name="expires_at" type="datetime-local" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <input
          className="size-4 accent-primary"
          defaultChecked={announcement?.is_active ?? true}
          name="is_active"
          type="checkbox"
        />
        Active announcement
      </label>
      <Button disabled={isSaving} type="submit">
        {isSaving ? (isEditing ? "Saving..." : "Publishing...") : isEditing ? "Save announcement" : "Create announcement"}
      </Button>
    </form>
  );
}
