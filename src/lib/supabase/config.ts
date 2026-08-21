type SupabaseConfiguration = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

function requireEnvironment(name: string, value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${name} is not configured.`);
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

export function validateApplicationUrl(value: string) {
  try {
    const url = new URL(value);
    const isLocalhost = url.hostname === "localhost" &&
      (url.protocol === "http:" || url.protocol === "https:");

    if (url.protocol !== "https:" && !isLocalhost) throw new Error();

    return url.origin;
  } catch {
    throw new Error("APP_URL must be an HTTPS URL or use localhost.");
  }
}

export function getApplicationUrl(environment: NodeJS.ProcessEnv = process.env) {
  const configured = environment.APP_URL?.trim();

  if (!configured && environment.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return validateApplicationUrl(requireEnvironment("APP_URL", configured));
}

/**
 * Reads Supabase credentials only on the server.
 *
 * SECRET_KEY bypasses Row Level Security and must never be exported from a
 * client component or renamed with a NEXT_PUBLIC_ prefix.
 */
export function getSupabaseConfiguration(): SupabaseConfiguration {
  const url = validateProjectUrl(
    requireEnvironment("PROJECT_URL", process.env.PROJECT_URL),
  );

  return {
    url,
    publishableKey: requireEnvironment("PUBLISHABLE_KEY", process.env.PUBLISHABLE_KEY),
    secretKey: requireEnvironment("SECRET_KEY", process.env.SECRET_KEY),
  };
}
