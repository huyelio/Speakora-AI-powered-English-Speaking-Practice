import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabaseConfiguration } from "./config";

/** Request-scoped: reuse one auth client across layout + page in the same RSC render. */
export const createAuthServerClient = cache(async (): Promise<SupabaseClient> => {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfiguration();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Middleware refreshes cookies when a Server Component cannot set them.
        }
      },
    },
  });
});

/**
 * Request-scoped dedupe for layout + page auth checks. The token signature is verified locally,
 * so a signed-in request makes no Auth call. A token revoked elsewhere stays valid until it expires.
 */
export const getRequestUser = cache(async (): Promise<{ id: string } | null> => {
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.auth.getClaims();

  return error || !data?.claims.sub ? null : { id: data.claims.sub };
});
