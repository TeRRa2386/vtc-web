"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

export type UserRow = {
  created_at?: string | null;
  email?: string | null;
  id: string;
  is_pro?: boolean | null;
  last_sign_in_at?: string | null;
  plan?: string | null;
  role?: string | null;
  subscription_status?: string | null;
};

type SortKey = "email" | "created_at" | "last_sign_in_at" | "role" | "subscription";
type SortDirection = "asc" | "desc";

const allValue = "all";

function subscriptionLabel(user: UserRow) {
  if (!user.is_pro) return "Free";
  return `Pro ${user.plan ?? ""}`.trim();
}

function compareText(left?: string | null, right?: string | null) {
  return (left ?? "").localeCompare(right ?? "", undefined, { sensitivity: "base" });
}

function compareDate(left?: string | null, right?: string | null) {
  return new Date(left ?? 0).getTime() - new Date(right ?? 0).getTime();
}

export function UsersWorkspace({ users }: { users: UserRow[] }) {
  const [roleFilter, setRoleFilter] = useState(allValue);
  const [subscriptionFilter, setSubscriptionFilter] = useState(allValue);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const roles = useMemo(() => {
    return Array.from(new Set(users.map((user) => user.role || "none"))).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => roleFilter === allValue || (user.role || "none") === roleFilter)
      .filter((user) => {
        if (subscriptionFilter === allValue) return true;
        return subscriptionFilter === "pro" ? Boolean(user.is_pro) : !user.is_pro;
      })
      .sort((left, right) => {
        let result = 0;

        if (sortKey === "created_at") result = compareDate(left.created_at, right.created_at);
        if (sortKey === "last_sign_in_at") result = compareDate(left.last_sign_in_at, right.last_sign_in_at);
        if (sortKey === "email") result = compareText(left.email, right.email);
        if (sortKey === "role") result = compareText(left.role, right.role);
        if (sortKey === "subscription") result = compareText(subscriptionLabel(left), subscriptionLabel(right));

        return sortDirection === "asc" ? result : -result;
      });
  }, [roleFilter, sortDirection, sortKey, subscriptionFilter, users]);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "email" || nextKey === "role" || nextKey === "subscription" ? "asc" : "desc");
  }

  function SortButton({ label, value }: { label: string; value: SortKey }) {
    const isActive = sortKey === value;

    return (
      <button
        className="inline-flex items-center gap-1 text-left uppercase transition hover:text-foreground"
        onClick={() => toggleSort(value)}
        type="button"
      >
        {label}
        {isActive ? (sortDirection === "asc" ? <ArrowUpAZ size={14} /> : <ArrowDownAZ size={14} />) : null}
      </button>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <p className="text-sm font-black text-primary">{filteredUsers.length} users</p>
          <p className="text-xs font-bold text-muted-foreground">Sort by any column and filter by role or subscription.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select className="w-44" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value={allValue}>All roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </Select>
          <Select
            className="w-44"
            value={subscriptionFilter}
            onChange={(event) => setSubscriptionFilter(event.target.value)}
          >
            <option value={allValue}>All subscriptions</option>
            <option value="pro">Pro</option>
            <option value="free">Free</option>
          </Select>
          <Button
            onClick={() => {
              setRoleFilter(allValue);
              setSubscriptionFilter(allValue);
              setSortKey("created_at");
              setSortDirection("desc");
            }}
            type="button"
            variant="outline"
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs font-black uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3"><SortButton label="Email" value="email" /></th>
              <th className="px-4 py-3"><SortButton label="Created" value="created_at" /></th>
              <th className="px-4 py-3"><SortButton label="Last sign-in" value="last_sign_in_at" /></th>
              <th className="px-4 py-3"><SortButton label="Role" value="role" /></th>
              <th className="px-4 py-3"><SortButton label="Subscription" value="subscription" /></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr className="border-t" key={user.id}>
                <td className="px-4 py-3 font-bold">{user.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(user.last_sign_in_at)}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.role || "none"}</td>
                <td className="px-4 py-3">
                  <Badge tone={user.is_pro ? "success" : "default"}>{subscriptionLabel(user)}</Badge>
                  {user.subscription_status ? (
                    <span className="ml-2 text-xs text-muted-foreground">{user.subscription_status}</span>
                  ) : null}
                </td>
              </tr>
            ))}
            {!filteredUsers.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                  No users match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
