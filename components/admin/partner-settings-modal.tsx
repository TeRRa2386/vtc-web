"use client";

import { Settings, X } from "lucide-react";
import { useState } from "react";

import { PartnerForm } from "@/components/admin/partner-form";
import { Button } from "@/components/ui/button";
import { type PartnerRecord } from "@/lib/referrals";

export function PartnerSettingsModal({ partner }: { partner: PartnerRecord }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button aria-label="Open partner settings" onClick={() => setIsOpen(true)} size="sm" type="button" variant="outline">
        <Settings size={16} />
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border bg-card shadow-soft">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-card p-5">
              <div>
                <p className="text-sm font-black text-primary">Partner settings</p>
                <h2 className="mt-1 text-2xl font-black">{partner.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Edit referral codes, campaign tokens, status, and internal notes.</p>
              </div>
              <button
                aria-label="Close partner settings"
                className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={22} />
              </button>
            </div>
            <div className="p-5">
              <PartnerForm onSaved={() => setIsOpen(false)} partner={partner} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
