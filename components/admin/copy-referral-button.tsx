"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CopyReferralButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button onClick={copyValue} type="button" variant="outline">
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "Copied" : "Copy referral URL"}
    </Button>
  );
}
