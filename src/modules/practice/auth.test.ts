import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRequestUser } = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
}));

vi.mock("../../lib/supabase/auth-server", () => ({ getRequestUser }));

import {
  authorizeSessionRecord,
  createGuestCredentials,
  resolveSessionPrincipal,
  tokenMatches,
} from "./auth";

describe("session principals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authorizes only the matching authenticated user owner", () => {
    const owner = { user_id: "u1", guest_token_hash: null };

    expect(authorizeSessionRecord(owner, { kind: "user", userId: "u1" })).toBe(true);
    expect(authorizeSessionRecord(owner, { kind: "user", userId: "u2" })).toBe(false);
    expect(authorizeSessionRecord(owner, { kind: "guest", token: "u1" })).toBe(false);
  });

  it("preserves hashed guest authorization without accepting a user principal", () => {
    const credentials = createGuestCredentials();
    const owner = { user_id: null, guest_token_hash: credentials.hash };

    expect(authorizeSessionRecord(owner, { kind: "guest", token: credentials.token })).toBe(true);
    expect(authorizeSessionRecord(owner, { kind: "guest", token: `${credentials.token}x` })).toBe(false);
    expect(authorizeSessionRecord(owner, { kind: "user", userId: credentials.token })).toBe(false);
  });

  it("prefers a verified Supabase user over a bearer token", async () => {
    getRequestUser.mockResolvedValue({ id: "verified-user" });
    const request = new Request("http://localhost", {
      headers: { authorization: "Bearer guest-token" },
    });

    await expect(resolveSessionPrincipal(request)).resolves.toEqual({
      kind: "user",
      userId: "verified-user",
    });
  });

  it("falls back to a guest bearer token only when no verified user exists", async () => {
    getRequestUser.mockResolvedValue(null);

    await expect(resolveSessionPrincipal(new Request("http://localhost", {
      headers: { authorization: "Bearer guest-token" },
    }))).resolves.toEqual({ kind: "guest", token: "guest-token" });

    await expect(resolveSessionPrincipal(new Request("http://localhost"))).resolves.toBeNull();
  });
});

describe("guest session token", () => {
  it("stores a verifiable hash, not the token", () => {
    const credentials = createGuestCredentials();

    expect(credentials.hash).not.toBe(credentials.token);
    expect(tokenMatches(credentials.token, credentials.hash)).toBe(true);
    expect(tokenMatches(`${credentials.token}x`, credentials.hash)).toBe(false);
    expect(tokenMatches(credentials.token, null)).toBe(false);
  });
});
