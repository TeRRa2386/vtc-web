import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { logoutPartner } from "@/app/partner/login/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PartnerBlockedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/45 px-4 py-10">
      <Card className="max-w-md p-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert size={28} />
        </div>
        <h1 className="mt-4 text-2xl font-black">Partner access unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account is not authorized for that partner workspace.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/partner">Back to portal</Link>
          </Button>
          <form action={logoutPartner}>
            <Button type="submit">Sign out</Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
