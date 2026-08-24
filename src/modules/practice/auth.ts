import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getRequestUser } from "../../lib/supabase/auth-server";

export type SessionPrincipal =
  | { kind: "user"; userId: string }
  | { kind: "guest"; token: string };

type SessionOwnerRecord = {
  user_id: string | null;
  guest_token_hash: string | null;
};

export function createGuestCredentials() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function readSessionToken(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export function tokenMatches(token: string, expectedHash: string | null) {
  if (!token || !expectedHash) return false;
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function authorizeSessionRecord(
  session: SessionOwnerRecord,
  principal: SessionPrincipal,
): boolean {
  if (principal.kind === "user") {
    return session.user_id !== null && session.user_id === principal.userId;
  }

  return session.user_id === null
    && tokenMatches(principal.token, session.guest_token_hash);
}

export async function resolveSessionPrincipal(request: Request): Promise<SessionPrincipal | null> {
  const token = readSessionToken(request);
  if (token) return { kind: "guest", token };

  const user = await getRequestUser();
  if (user) return { kind: "user", userId: user.id };
  return null;
}
