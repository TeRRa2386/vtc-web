import { AlertTriangle, CheckCircle2, ReceiptText, ShieldQuestion } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { countRows } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type RevenueCatEventRow = {
  app_user_id: string | null;
  currency: string | null;
  environment: string;
  event_timestamp: string | null;
  event_type: string;
  id: string;
  plan_type: string | null;
  price: number | null;
  product_id: string | null;
  purchased_at: string | null;
  received_at: string;
  revenuecat_event_id: string;
  store: string | null;
  transaction_id: string | null;
  user_id: string | null;
};

function money(value: number | null, currency?: string | null) {
  if (value === null || value === undefined) return "-";
  return `${currency ?? ""} ${value.toFixed(2)}`.trim();
}

function environmentTone(environment?: string | null) {
  return environment === "production" ? "success" : "warning";
}

function planTone(plan?: string | null) {
  return plan === "unknown" ? "warning" : "default";
}

export default async function RevenueCatAdminPage() {
  const session = await requireAdmin("admin");
  const supabase = createSupabaseAdminClient();
  const [{ data: events, error }, totalEvents, unresolvedUsers, unknownProducts, sandboxEvents] = await Promise.all([
    supabase
      .from("revenuecat_events")
      .select("id, revenuecat_event_id, app_user_id, user_id, environment, event_type, store, product_id, plan_type, price, currency, transaction_id, purchased_at, event_timestamp, received_at")
      .order("received_at", { ascending: false })
      .limit(100),
    countRows("revenuecat_events"),
    countRows("revenuecat_events", (query) => query.is("user_id", null)),
    countRows("revenuecat_events", (query) => query.eq("plan_type", "unknown")),
    countRows("revenuecat_events", (query) => query.eq("environment", "sandbox"))
  ]);

  const rows = (events ?? []) as RevenueCatEventRow[];

  return (
    <AdminShell session={session}>
      <div className="grid gap-6">
        <div>
          <h1 className="text-3xl font-black">RevenueCat Events</h1>
          <p className="mt-2 text-muted-foreground">Webhook ingestion diagnostics for subscriptions, trials, cancellations, and refunds.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={ReceiptText} label="Total events" value={totalEvents} />
          <StatCard icon={ShieldQuestion} label="Unresolved users" value={unresolvedUsers} />
          <StatCard icon={AlertTriangle} label="Unknown products" value={unknownProducts} />
          <StatCard icon={CheckCircle2} label="Sandbox events" value={sandboxEvents} />
        </div>

        <Card className="overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-black">Latest webhook events</h2>
            <p className="mt-1 text-sm text-muted-foreground">Raw payloads stay server-side; this view shows normalized fields only.</p>
          </div>
          {error ? (
            <div className="p-5 text-sm text-destructive">RevenueCat events unavailable: {error.message}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Store</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Transaction</th>
                    <th className="px-5 py-3">Purchase time</th>
                    <th className="px-5 py-3">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((event) => (
                    <tr key={event.id} className="bg-background align-top">
                      <td className="px-5 py-4">
                        <p className="font-black">{event.event_type}</p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">{event.revenuecat_event_id}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={environmentTone(event.environment)}>{event.environment}</Badge>
                          {!event.user_id ? <Badge tone="warning">unresolved user</Badge> : <Badge tone="success">user resolved</Badge>}
                          {event.plan_type === "unknown" ? <Badge tone="warning">unknown product</Badge> : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p>{event.product_id ?? "-"}</p>
                        <Badge tone={planTone(event.plan_type)}>{event.plan_type ?? "unknown"}</Badge>
                      </td>
                      <td className="px-5 py-4">{event.store ?? "-"}</td>
                      <td className="px-5 py-4">{money(event.price, event.currency)}</td>
                      <td className="px-5 py-4 break-all text-xs text-muted-foreground">{event.transaction_id ?? "-"}</td>
                      <td className="px-5 py-4">{formatDate(event.purchased_at)}</td>
                      <td className="px-5 py-4">{formatDate(event.received_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length ? <div className="p-8 text-center text-muted-foreground">No RevenueCat webhook events stored yet.</div> : null}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
