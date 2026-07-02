import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { readEnv } from "@/lib/utils";

type CookieToSet = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        }
      }
    }
  );
}

export function createSupabaseAdminClient() {
  return createClient(
    readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
