import "server-only";

type SupabaseConfiguration = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

function requireServerEnvironment(name: string, value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${name} is not configured on the Next.js server.`);
  }

  return normalized;
}

function validateProjectUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      throw new Error();
    }

    return url.origin;
  } catch {
    throw new Error("PROJECT_URL must be a valid Supabase project URL.");
  }
}

/**
 * Reads Supabase credentials only on the server.
 *
 * SECRET_KEY bypasses Row Level Security and must never be exported from a
 * client component or renamed with a NEXT_PUBLIC_ prefix.
 */
export function getSupabaseConfiguration(): SupabaseConfiguration {
  const url = validateProjectUrl(
    requireServerEnvironment("PROJECT_URL", process.env.PROJECT_URL),
  );

  return {
    url,
    publishableKey: requireServerEnvironment("PUBLISHABLE_KEY", process.env.PUBLISHABLE_KEY),
    secretKey: requireServerEnvironment("SECRET_KEY", process.env.SECRET_KEY),
  };
}
