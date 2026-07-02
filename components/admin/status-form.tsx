"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function StatusForm({
  endpoint,
  id,
  notePlaceholder = "Internal note",
  statuses
}: {
  endpoint: string;
  id: string;
  notePlaceholder?: string;
  statuses: string[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(statuses[0] ?? "");
  const [internalNotes, setInternalNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit() {
    setIsSaving(true);
    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, internal_notes: internalNotes, status })
    });
    setIsSaving(false);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <Select onChange={(event) => setStatus(event.target.value)} value={status}>
        {statuses.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
      <Textarea onChange={(event) => setInternalNotes(event.target.value)} placeholder={notePlaceholder} value={internalNotes} />
      <Button disabled={isSaving} onClick={submit} type="button">
        {isSaving ? "Saving..." : "Save update"}
      </Button>
    </div>
  );
}
