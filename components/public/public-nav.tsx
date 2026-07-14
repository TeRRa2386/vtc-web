"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const links = [
  { href: "/account-deletion", label: "Account Deletion" },
  { href: "/faq", label: "FAQ" },
  { href: "/app-updates", label: "Updates" }
];

export function PublicNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/88 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
            <Image
              alt="Vet Tech Companion app icon"
              className="size-11"
              height={44}
              priority
              src="/app-icon.png"
              width={44}
            />
          </span>
          <span>
            <span className="block text-base font-black leading-tight text-foreground">Vet Tech Companion</span>
            <span className="hidden text-xs font-bold text-muted-foreground sm:block">Clinical tools for daily patient care</span>
          </span>
        </Link>
        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex"
          aria-label="Public navigation"
        >
          {links.map((link) => (
            <Link
              className="rounded-md px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="outline">
            <Link href="/privacy">
              <ShieldCheck size={17} />
              Privacy
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/terms">Terms</Link>
          </Button>
        </div>
        <Button
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          className="shrink-0 lg:hidden"
          onClick={() => setIsOpen((current) => !current)}
          size="sm"
          type="button"
          variant="outline"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
        {isOpen ? (
          <div className="absolute right-4 top-[calc(100%-0.5rem)] z-50 w-64 rounded-lg border bg-card p-2 shadow-soft lg:hidden">
            <nav className="grid gap-1" aria-label="Mobile public navigation">
              {[...links, { href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" }].map((link) => (
                <Link
                  className="rounded-md px-3 py-3 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  href={link.href}
                  key={link.href}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
