"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CommissionReprocessButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function reprocess() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/commissions/reprocess", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Reprocess failed.");
      setMessage("Processed " + payload.processedUsers + " users - created " + payload.created + " - reversed " + payload.reversed + " - resolved " + payload.resolved);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reprocess failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled={loading} onClick={reprocess} type="button" variant="outline">
        <RefreshCw size={16} />
        {loading ? "Reprocessing..." : "Reprocess events"}
      </Button>
      {message ? <p className="text-sm font-semibold text-muted-foreground">{message}</p> : null}
    </div>
  );
}