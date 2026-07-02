import Link from "next/link";
import {
  BarChart3,
  BellPlus,
  ClipboardList,
  Home,
  Lightbulb,
  LogOut,
  MessageSquare,
  ShieldAlert,
  Users
} from "lucide-react";

import { logoutAdmin } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import type { AdminSession } from "@/lib/supabase/admin";

const items = [
  { href: "/admin", label: "Overview", icon: Home },
  { href: "/admin/support", label: "Support Tickets", icon: MessageSquare },
  { href: "/admin/deletions", label: "Account Deletions", icon: ShieldAlert },
  { href: "/admin/features", label: "Feature Requests", icon: Lightbulb },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/announcements", label: "Announcements", icon: BellPlus },
  { href: "/admin/statistics", label: "Statistics", icon: BarChart3 }
];

export function AdminShell({ children, session }: { children: React.ReactNode; session: AdminSession }) {
  return (
    <div className="min-h-screen bg-muted/45">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-[#001A2F] p-4 text-white lg:block">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <ClipboardList size={23} />
          </div>
          <div>
            <p className="font-black">Vet Tech Companion</p>
            <p className="text-xs font-bold text-white/60">Admin dashboard</p>
          </div>
        </div>
        <nav className="mt-8 grid gap-1">
          {items.map((item) => (
            <Link
              className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
              href={item.href}
              key={item.href}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAdmin} className="absolute bottom-4 left-4 right-4">
          <Button className="w-full bg-white/10 text-white hover:bg-white/15" type="submit" variant="ghost">
            <LogOut size={17} />
            Sign out
          </Button>
        </form>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b bg-background/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-primary">Operations</p>
              <p className="text-xs font-bold text-muted-foreground">{session.email} · {session.role}</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:hidden">
              {items.slice(0, 4).map((item) => (
                <Link className="rounded-md bg-muted px-3 py-2 text-xs font-black" href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>
        <main className="px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
