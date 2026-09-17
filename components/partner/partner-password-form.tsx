"use client";

import { KeyRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function PartnerPasswordForm() {
  const [email, setEmail] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isCurrent = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (isCurrent) {
        setEmail(data.session?.user.email ?? null);
        setIsReady(true);
      }
    }

    void loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isCurrent) {
        setEmail(session?.user.email ?? null);
        setIsReady(true);
      }
    });

    return () => {
      isCurrent = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage("Your password could not be saved. Request a new link and try again.");
      setIsSaving(false);
      return;
    }

    window.location.assign("/partner");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(35,196,191,0.22),transparent_32%),hsl(var(--background))] px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound size={28} />
          </div>
          <CardTitle>Set your password</CardTitle>
          <CardDescription>
            {email ? `Choose a password for ${email}.` : "Open the invitation or password-reset link from your email first."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isReady ? <p className="text-sm text-muted-foreground">Checking your secure link...</p> : null}
          {isReady && email ? (
            <form className="grid gap-4" onSubmit={submit}>
              <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
                New password
                <Input autoComplete="new-password" name="password" required type="password" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
                Confirm password
                <Input autoComplete="new-password" name="confirmPassword" required type="password" />
              </label>
              {message ? <p className="rounded-md bg-destructive/10 p-3 text-sm font-bold text-destructive">{message}</p> : null}
              <Button disabled={isSaving} type="submit">{isSaving ? "Saving..." : "Save password"}</Button>
            </form>
          ) : null}
          {isReady && !email ? <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">This setup link is missing, expired, or has already been used. Return to Partner Login to request another password-reset link.</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
