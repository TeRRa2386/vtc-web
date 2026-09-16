"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type PartnerRecord } from "@/lib/referrals";

export function PartnerForm({ onSaved, partner }: { onSaved?: () => void; partner?: PartnerRecord }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(partner);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      ...Object.fromEntries(form.entries()),
      id: partner?.id
    };

    try {
      const response = await fetch("/api/admin/partners", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Partner could not be saved.");
        return;
      }

      if (!isEditing) {
        formElement.reset();
      }

      router.refresh();
      onSaved?.();
      if (result.slug) {
        router.push(`/admin/partners/${result.slug}`);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Partner name
          <Input defaultValue={partner?.name ?? ""} name="name" placeholder="Example: Sasha" required />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Public slug
          <Input defaultValue={partner?.slug ?? ""} name="slug" placeholder="sasha" />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Public referral code
          <Input defaultValue={partner?.referral_code ?? partner?.android_referrer_code ?? ""} name="referral_code" placeholder="SASHA" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Android referrer code
          <Input defaultValue={partner?.android_referrer_code ?? ""} name="android_referrer_code" placeholder="SASHA" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Status
          <Select defaultValue={partner?.status ?? "active"} name="status">
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="inactive">inactive</option>
          </Select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
        Group name
        <Input defaultValue={partner?.group_name ?? ""} name="group_name" placeholder="Facebook group, school, clinic..." />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          iOS campaign token
          <Input defaultValue={partner?.ios_campaign_token ?? ""} name="ios_campaign_token" placeholder="App Store Connect ct token" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          iOS provider token
          <Input defaultValue={partner?.ios_provider_token ?? ""} name="ios_provider_token" placeholder="App Store Connect pt token" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
        Internal notes
        <Textarea defaultValue={partner?.notes ?? ""} name="notes" placeholder="Private admin notes about this partner..." />
      </label>
      {error ? <p className="rounded-md bg-destructive/10 p-3 text-sm font-bold text-destructive">{error}</p> : null}
      <Button disabled={isSaving} type="submit">
        <Save size={17} />
        {isSaving ? "Saving..." : isEditing ? "Save partner" : "Create partner"}
      </Button>
    </form>
  );
}
