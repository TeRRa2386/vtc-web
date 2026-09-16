"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button onClick={copyCode} type="button" variant="outline">
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "Copied" : "Copy Code"}
    </Button>
  );
}
