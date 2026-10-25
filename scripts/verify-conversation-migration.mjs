// Optional isolated PostgreSQL verification. PGlite is a temporary test tool,
// not an application dependency. Pass its installed dist/index.js as argv[2].
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "@electric-sql/pglite");
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const session = "33333333-3333-4333-8333-333333333333";
const userMessage = "44444444-4444-4444-8444-444444444444";
const token = "55555555-5555-4555-8555-555555555555";
const token2 = "66666666-6666-4666-8666-666666666666";
const userMessage2 = "77777777-7777-4777-8777-777777777777";
async function rpc(name, params) {
  const slots = params.map((_, index) => `$${index + 1}`).join(",");
  return (await db.query(`select public.${name}(${slots}) as value`, params)).rows[0].value;
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema public, auth to authenticated, anon, service_role;
    insert into auth.users values ('${owner}'), ('${other}');
    create table public.practice_sessions(id uuid primary key, marker text);
    insert into public.practice_sessions values ('${session}', 'existing-topic-session');
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/202610040001_ai_conversation.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202610220001_conversation_scenario_goals.sql", import.meta.url), "utf8"));
  const snapshot = { key: "airplane-chat-v1", opening: "Are you travelling for business or pleasure?", goals: [{ id: "destination_reason" }, { id: "looking_forward" }] };
  await rpc("create_conversation_session", [session, owner, snapshot]);
  await rpc("create_conversation_session", [session, owner, snapshot]);
  assert.equal((await db.query("select count(*)::int as count from conversation_messages")).rows[0].count, 1);
  await assert.rejects(rpc("claim_conversation_turn", [session, other, userMessage, token]), /NOT_FOUND/);

  const pending = await rpc("claim_conversation_turn", [session, owner, userMessage, token]);
  assert.equal(pending.turn_index, 1);
  await assert.rejects(rpc("claim_conversation_turn", [session, owner, userMessage, token2]), /TURN_BUSY/);
  await assert.rejects(rpc("end_conversation_session", [session, owner]), /TURN_BUSY/);
  await assert.rejects(rpc("advance_conversation_turn", [session, owner, token2, "REPLY", "stale", null, []]), /STALE_TURN/);
  await rpc("advance_conversation_turn", [session, owner, token, "AUDIO", null, "private/audio.webm", []]);
  await rpc("advance_conversation_turn", [session, owner, token, "TRANSCRIPT", "I'm going to Japan for a holiday.", null, []]);
  await assert.rejects(rpc("claim_conversation_turn", [session, owner, userMessage2, token2]), /PENDING_TURN/);
  const ready = await rpc("claim_conversation_turn", [session, owner, userMessage, token2]);
  assert.equal(ready.content, "I'm going to Japan for a holiday.");
  await assert.rejects(rpc("advance_conversation_turn", [session, owner, token2, "REPLY", "Invalid goal", null, ["place_order"]]), /INVALID_GOALS/);
  await rpc("advance_conversation_turn", [session, owner, token2, "REPLY", "What will you do there?", null, ["destination_reason"]]);
  const replay = await rpc("claim_conversation_turn", [session, owner, userMessage, token]);
  assert.equal(replay.processing_status, "COMPLETED");
  assert.equal((await db.query("select count(*)::int as count from conversation_messages")).rows[0].count, 3);

  await rpc("claim_conversation_turn", [session, owner, userMessage2, token]);
  await rpc("advance_conversation_turn", [session, owner, token, "TRANSCRIPT", "I look forward to visiting a temple.", null, []]);
  await rpc("claim_conversation_turn", [session, owner, userMessage2, token2]);
  await rpc("advance_conversation_turn", [session, owner, token2, "REPLY", "That sounds wonderful!", null, ["looking_forward"]]);
  const progress = (await db.query("select user_turn_count, completed_goals, pending_message_id from conversation_sessions")).rows[0];
  assert.equal(progress.user_turn_count, 2);
  assert.deepEqual(progress.completed_goals, ["destination_reason", "looking_forward"]);
  assert.equal(progress.pending_message_id, null);

  // RLS and privileges with real PostgreSQL roles, rather than source-text checks.
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${other}';`);
  assert.equal((await db.query("select count(*)::int as count from conversation_sessions")).rows[0].count, 0);
  assert.equal((await db.query("select count(*)::int as count from conversation_messages")).rows[0].count, 0);
  await assert.rejects(rpc("end_conversation_session", [session, owner]), /permission denied/);
  await db.exec(`set request.jwt.claim.sub = '${owner}';`);
  assert.equal((await db.query("select count(*)::int as count from conversation_sessions")).rows[0].count, 1);
  assert.equal((await db.query("select count(*)::int as count from conversation_messages")).rows[0].count, 5);
  await assert.rejects(db.query("update conversation_sessions set status = 'COMPLETED'"), /permission denied/);
  await db.exec("reset role;");

  await rpc("end_conversation_session", [session, owner]);
  await rpc("end_conversation_session", [session, owner]);
  await assert.rejects(rpc("claim_conversation_turn", [session, owner, "88888888-8888-4888-8888-888888888888", token]), /SESSION_ENDED/);
  assert.equal((await db.query("select marker from practice_sessions")).rows[0].marker, "existing-topic-session");
  const cafeSession = "99999999-9999-4999-8999-999999999999";
  const cafeSnapshot = { key: "ordering-at-a-cafe-v1", opening: "What can I get you?", goals: [{ id: "place_order" }] };
  await rpc("create_conversation_session", [cafeSession, owner, cafeSnapshot]);
  await rpc("create_conversation_session", [cafeSession, owner, snapshot]);
  const savedCafe = (await db.query("select scenario_snapshot from conversation_sessions where id = $1", [cafeSession])).rows[0].scenario_snapshot;
  assert.deepEqual(savedCafe, cafeSnapshot);
  assert.equal((await db.query("select content from conversation_messages where session_id = $1", [cafeSession])).rows[0].content, cafeSnapshot.opening);
  await rpc("claim_conversation_turn", [cafeSession, owner, userMessage2.replace(/^7/, "a"), token]);
  await rpc("advance_conversation_turn", [cafeSession, owner, token, "TRANSCRIPT", "One coffee, please.", null, []]);
  await rpc("claim_conversation_turn", [cafeSession, owner, userMessage2.replace(/^7/, "a"), token2]);
  await assert.rejects(rpc("advance_conversation_turn", [cafeSession, owner, token2, "REPLY", "Certainly.", null, ["destination_reason"]]), /INVALID_GOALS/);
  await rpc("advance_conversation_turn", [cafeSession, owner, token2, "REPLY", "Certainly.", null, ["place_order"]]);
  assert.deepEqual((await db.query("select completed_goals from conversation_sessions where id = $1", [cafeSession])).rows[0].completed_goals, ["place_order"]);
  console.log("PASS: migration execution, ownership/RLS, duplicate requests, turn serialization, stale fencing, persisted transcript, goal union, completion, existing table preservation.");
} finally { await db.close(); }
