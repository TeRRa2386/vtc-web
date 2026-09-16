"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeDollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PayoutActionForm({
  amount,
  month,
  partnerId,
  year
}: {
  amount: number;
  month: number;
  partnerId: string;
  year: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/admin/partner-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminNotes: String(form.get("adminNotes") ?? ""),
          amount: Number(form.get("amount") ?? amount),
          month,
          partnerId,
          year
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Payout could not be marked paid.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-3 rounded-md border bg-background p-4" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Final amount
          <Input min="-9999" name="amount" step="0.01" type="number" defaultValue={amount.toFixed(2)} />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Admin note
          <Input name="adminNotes" placeholder="Optional payout note" />
        </label>
      </div>
      {error ? <p className="rounded-md bg-destructive/10 p-3 text-sm font-bold text-destructive">{error}</p> : null}
      <Button disabled={busy} type="submit">
        <BadgeDollarSign size={17} />
        {busy ? "Marking paid..." : "Mark payout paid"}
      </Button>
    </form>
  );
}
