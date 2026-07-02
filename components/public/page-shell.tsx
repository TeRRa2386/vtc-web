import { PublicFooter } from "@/components/public/public-footer";
import { PublicNav } from "@/components/public/public-nav";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(35,196,191,0.18),transparent_30%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted))_150%)]">
      <PublicNav />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
