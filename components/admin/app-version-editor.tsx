"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AppVersionEditorInfo = {
  latestVersion: string;
  minimumRequiredVersion: string;
  platform: "ios" | "android";
};

export function AppVersionEditor({ versions }: { versions: AppVersionEditorInfo[] }) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState("");

  async function saveVersion(event: React.FormEvent<HTMLFormElement>, platform: "ios" | "android") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setErrorMessage("");
    setSavingPlatform(platform);

    try {
      const response = await fetch("/api/admin/app-versions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latest_version: form.get("latest_version"),
          minimum_required_version: form.get("minimum_required_version"),
          platform
        })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Unable to update app version.");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update app version.");
    } finally {
      setSavingPlatform("");
    }
  }

  return (
    <div className="rounded-lg border bg-card px-4 py-3 text-right shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">App version</p>
        <Button onClick={() => setIsEditing((current) => !current)} size="sm" type="button" variant="outline">
          {isEditing ? "Close" : "Update"}
        </Button>
      </div>

      <div className="mt-2 grid gap-1">
        {versions.map((version) => (
          <p className="text-sm font-black" key={version.platform}>
            {version.platform.toUpperCase()} {version.latestVersion}
          </p>
        ))}
        {!versions.length ? (
          <p className="text-sm font-semibold text-muted-foreground">Unavailable</p>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-4 grid gap-3 text-left">
          {errorMessage ? (
            <p className="rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">{errorMessage}</p>
          ) : null}
          {versions.map((version) => (
            <form className="grid gap-2 rounded-md border bg-background p-3" key={version.platform} onSubmit={(event) => saveVersion(event, version.platform)}>
              <p className="text-sm font-black">{version.platform.toUpperCase()}</p>
              <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                Latest version
                <Input defaultValue={version.latestVersion} name="latest_version" required />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                Minimum required version
                <Input defaultValue={version.minimumRequiredVersion} name="minimum_required_version" required />
              </label>
              <Button disabled={savingPlatform === version.platform} size="sm" type="submit">
                {savingPlatform === version.platform ? "Saving..." : "Save"}
              </Button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
