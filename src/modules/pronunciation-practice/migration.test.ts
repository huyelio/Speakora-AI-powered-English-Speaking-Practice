import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const path = resolve(process.cwd(), "supabase/migrations/202609270001_pronunciation_practice.sql");
const migration = existsSync(path) ? readFileSync(path, "utf8") : "";

describe("pronunciation practice migration", () => {
  it("creates owned sessions, immutable items, and idempotent attempts behind RLS", () => {
    expect(migration).toMatch(/create table if not exists public\.pronunciation_sessions[\s\S]*user_id uuid not null references auth\.users/i);
    expect(migration).toMatch(/source_session_id uuid[\s\S]*references public\.pronunciation_sessions/i);
    expect(migration).toMatch(/create table if not exists public\.pronunciation_session_items[\s\S]*snapshot jsonb not null/i);
    expect(migration).toMatch(/create table if not exists public\.pronunciation_attempts[\s\S]*normalized_result jsonb[\s\S]*raw_result jsonb[\s\S]*sanitized_error_message text/i);
    expect(migration).toMatch(/status text not null default 'UPLOADED' check \(status in \('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED'\)\)/i);
    expect(migration).toMatch(/unique \(session_item_id, idempotency_key\)/i);
    expect(migration.match(/enable row level security/g)).toHaveLength(3);
  });

  it("validates IPA-ready source items and restricts every RPC to the service role", () => {
    expect(migration).toMatch(/create or replace function public\.create_pronunciation_session/i);
    expect(migration).toMatch(/vi\.status = 'ACTIVE'[\s\S]*char_length\(trim\(vi\.pronunciation_ipa\)\) > 0/i);
    expect(migration).toMatch(/create or replace function public\.register_pronunciation_attempt/i);
    expect(migration).toMatch(/create or replace function public\.complete_pronunciation_attempt/i);
    expect(migration.match(/revoke all on function public\.(?:create_pronunciation_session|register_pronunciation_attempt|complete_pronunciation_attempt)[\s\S]*?from public, anon, authenticated;/g)).toHaveLength(3);
    expect(migration.match(/grant execute on function public\.(?:create_pronunciation_session|register_pronunciation_attempt|complete_pronunciation_attempt)[\s\S]*?to service_role;/g)).toHaveLength(3);
  });

  it("returns an existing idempotent registration even after its session completes", () => {
    const registerFunction = migration.slice(
      migration.indexOf("create or replace function public.register_pronunciation_attempt"),
      migration.indexOf("create or replace function public.complete_pronunciation_attempt"),
    );
    expect(registerFunction.indexOf("select * into v_attempt")).toBeGreaterThan(0);
    expect(registerFunction.indexOf("if v_session_status <> 'IN_PROGRESS'")).toBeGreaterThan(
      registerFunction.indexOf("select * into v_attempt"),
    );
  });

  it("completes a session only when every item has a completed attempt", () => {
    expect(migration).toMatch(/not exists \([\s\S]*from public\.pronunciation_session_items psi[\s\S]*not exists \([\s\S]*pa\.status = 'COMPLETED'/i);
    expect(migration).toMatch(/update public\.pronunciation_sessions[\s\S]*status = 'COMPLETED'[\s\S]*completed_at = coalesce\(completed_at, now\(\)\)/i);
  });
});
