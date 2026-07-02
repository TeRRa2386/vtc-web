import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function countRows(table: string, filters?: (query: any) => any) {
  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    if (filters) {
      query = filters(query);
    }
    const { count } = await query;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function listRows<T>(table: string, orderColumn = "created_at", limit = 50): Promise<T[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase.from(table).select("*").order(orderColumn, { ascending: false }).limit(limit);
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}
