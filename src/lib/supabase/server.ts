import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfiguration } from "./config";

let publicClient: SupabaseClient | undefined;
let adminClient: SupabaseClient | undefined;

const serverAuthOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
} as const;

/** Server-side client subject to the database's Row Level Security policies. */
export function getSupabasePublicServerClient() {
  if (!publicClient) {
    const { url, publishableKey } = getSupabaseConfiguration();
    publicClient = createClient(url, publishableKey, serverAuthOptions);
  }

  return publicClient;
}

/**
 * Trusted backend client. This key bypasses RLS; use only after the API has
 * performed its own authentication, authorization and input validation.
 */
export function getSupabaseAdminClient() {
  if (!adminClient) {
    const { url, secretKey } = getSupabaseConfiguration();
    adminClient = createClient(url, secretKey, serverAuthOptions);
  }

  return adminClient;
}
