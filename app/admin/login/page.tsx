import type { Metadata } from "next";
import { Activity } from "lucide-react";

import { loginAdmin } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Admin Login"
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error =
    params.error === "auth"
      ? "Could not sign in with those credentials."
      : params.error === "missing"
        ? "Enter your admin email and password."
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(35,196,191,0.22),transparent_32%),hsl(var(--background))] px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Activity size={28} />
          </div>
          <CardTitle>Admin Operations</CardTitle>
          <CardDescription>Sign in with an approved Vet Tech Companion admin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAdmin} className="grid gap-4">
            <label className="grid gap-2 text-sm font-black">
              Email
              <Input autoComplete="email" name="email" type="email" />
            </label>
            <label className="grid gap-2 text-sm font-black">
              Password
              <Input autoComplete="current-password" name="password" type="password" />
            </label>
            {error ? <p className="rounded-md bg-destructive/10 p-3 text-sm font-bold text-destructive">{error}</p> : null}
            <Button type="submit">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
