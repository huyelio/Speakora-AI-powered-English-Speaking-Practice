import { execFileSync, spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Opt-in isolated PostgreSQL tests: V2_SQL_TEST=1 npx vitest run .../sql.integration.test.ts
const enabled = process.env.V2_SQL_TEST === "1";
const name = `speakora-v2-test-${process.pid}`;
function sql(query: string) {
  const result = spawnSync("docker", ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], { input: query, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
function concurrentSql(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"]);
    let output = "", error = "";
    child.stdout.on("data", data => { output += String(data); });
    child.stderr.on("data", data => { error += String(data); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
    child.stdin.end(query);
  });
}
const user = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const topic = "20000000-0000-4000-8000-000000000001";
const word = "30000000-0000-4000-8000-000000000001";
let session = "", item = "", pron = "";
describe.skipIf(!enabled)("V2 PostgreSQL transactions", () => {
  beforeAll(async () => {
    execFileSync("docker", ["run", "--rm", "-d", "--name", name, "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:16-alpine"]);
    for (let i = 0; i < 40; i++) {
      if (spawnSync("docker", ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"]).status === 0) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    sql(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create table public.practice_modes(id uuid primary key, code text, is_active boolean);
      create table public.topics(id uuid primary key, mode_id uuid, name text, slug text, is_active boolean);
      insert into auth.users values ('${user}'),('${other}');
      insert into practice_modes values ('00000000-0000-4000-8000-000000000001','GENERAL',true);
      insert into topics values ('${topic}','00000000-0000-4000-8000-000000000001','Travel','travel',true);`);
    for (const file of ["202609130001_vocabulary_practice.sql", "202609270001_pronunciation_practice.sql", "202610250001_vocabulary_learning_v2.sql"]) {
      sql(readFileSync(`supabase/migrations/${file}`, "utf8"));
    }
    sql(`insert into vocabulary_items(id,topic_id,word,meaning_vi,example_sentence,pronunciation_ipa,level)
      values ('${word}','${topic}','travel','du lịch','We travel.','/travel/','BEGINNER');`);
  }, 30000);
  afterAll(() => { if (enabled) spawnSync("docker", ["rm", "-f", name]); });
  it("creates one linked pair on repeated request and preserves snapshots", () => {
    const query = `select create_vocabulary_learning_session('${user}','${topic}','BEGINNER','40000000-0000-4000-8000-000000000001',array['${word}']::uuid[],'{"${word}":"We _____."}'::jsonb,null,false);`;
    session = sql(query);
    expect(sql(query)).toBe(session);
    expect(sql("select count(*) from vocabulary_sessions")).toBe("1");
    pron = sql(`select pronunciation_session_id from vocabulary_sessions where id='${session}'`);
    item = sql(`select id from vocabulary_session_items where session_id='${session}'`);
    expect(sql(`select vocabulary_item_id from pronunciation_session_items where session_id='${pron}'`)).toBe(word);
    expect(sql(`select snapshot->>'word' from pronunciation_session_items where session_id='${pron}'`)).toBe("travel");
    expect(sql(`select snapshot->>'initial_learning_state' from vocabulary_session_items where id='${item}'`)).toBe("NEW");
  });
  it("rejects wrong ownership, level and rolls back creation", () => {
    expect(() => sql(`select mutate_vocabulary_learning_session('${session}','${other}','advance','LEARN','${item}',null)`)).toThrow();
    expect(() => sql(`select create_vocabulary_learning_session('${user}','${topic}','ADVANCED','40000000-0000-4000-8000-000000000002',array['${word}']::uuid[],'{}',null,false)`)).toThrow();
    expect(sql("select count(*) from vocabulary_sessions")).toBe("1");
    expect(sql("select count(*) from pronunciation_sessions")).toBe("1");
  });
  it("persists stages and rejects premature recall or pronunciation advance", () => {
    expect(() => sql(`select mutate_vocabulary_learning_session('${session}','${user}','answer','RECALL','${item}','travel')`)).toThrow();
    sql(`select mutate_vocabulary_learning_session('${session}','${user}','advance','LEARN','${item}',null)`);
    sql(`select mutate_vocabulary_learning_session('${session}','${user}','advance','LEARN','${item}',null)`);
    expect(sql(`select learning_stage from vocabulary_sessions where id='${session}'`)).toBe("PRONOUNCE");
    expect(() => sql(`select mutate_vocabulary_learning_session('${session}','${user}','advance','PRONOUNCE','${item}',null)`)).toThrow();
  });
  it("uses completed pronunciation, freezes context, and keeps first recall answer", () => {
    const pi = sql(`select id from pronunciation_session_items where session_id='${pron}'`);
    sql(`select * from register_pronunciation_attempt('50000000-0000-4000-8000-000000000001','${user}','${pi}','test/v2.webm','audio/webm',1000,100,'60000000-0000-4000-8000-000000000001');
      update pronunciation_attempts set status='PROCESSING',processing_started_at=now() where session_item_id='${pi}';
      select * from complete_pronunciation_attempt('50000000-0000-4000-8000-000000000001','${user}','azure',
      '{"overall":{"accuracy":90},"words":[{"syllables":[{"accuracy":90,"isMissing":false,"isExtra":false}]}]}','{}');`);
    sql(`select mutate_vocabulary_learning_session('${session}','${user}','advance','PRONOUNCE','${item}',null)`);
    expect(sql(`select learning_stage from vocabulary_sessions where id='${session}'`)).toBe("RECALL");
    sql(`select mutate_vocabulary_learning_session('${session}','${user}','answer','RECALL','${item}','wrong')`);
    sql(`select mutate_vocabulary_learning_session('${session}','${user}','answer','RECALL','${item}','travel')`);
    expect(sql(`select result from vocabulary_reviews where session_item_id='${item}'`)).toBe("NOT_REMEMBERED");
    expect(sql(`select learning_stage || ':' || status from vocabulary_sessions where id='${session}'`)).toBe("CONTEXT:IN_PROGRESS");
    sql(`select mutate_vocabulary_learning_session('${session}','${user}','answer','CONTEXT','${item}','travel')`);
    expect(sql(`select learning_stage || ':' || status from vocabulary_sessions where id='${session}'`)).toBe("SUMMARY:COMPLETED");
    expect(sql(`select result || ':' || context_result from vocabulary_reviews where session_item_id='${item}'`)).toBe("NOT_REMEMBERED:REMEMBERED");
  });

  it("does not grant mastery for malformed or out-of-range assessment data", () => {
    for (const result of [{}, { overall: { accuracy: 101 }, words: [{ syllables: [{ accuracy: 90, isMissing: false, isExtra: false }] }] },
      { overall: { accuracy: 90 }, words: [{ syllables: [] }] }]) {
      expect(sql(`select vocabulary_learning_pronunciation_state('${JSON.stringify(result)}'::jsonb)`)).toBe("UNKNOWN");
    }
    expect(sql(`select vocabulary_learning_state(get_vocabulary_learning_history('${user}',array['${word}']::uuid[])->'${word}')`)).toBe("WEAK");
    expect(sql("select has_function_privilege('authenticated','get_vocabulary_learning_history(uuid,uuid[])','execute')")).toBe("f");
  });

  it("grants mastery only after two distinct typed recalls and skips unavailable context", () => {
    // Exercise the real mutation path twice; context intentionally unavailable for these snapshots.
    for (let round = 3; round <= 4; round++) {
      const next = sql(`select create_vocabulary_learning_session('${user}','${topic}','BEGINNER','40000000-0000-4000-8000-00000000000${round}',array['${word}']::uuid[],'{}',null,false)`);
      const nextItem = sql(`select id from vocabulary_session_items where session_id='${next}'`);
      const nextPronItem = sql(`select pi.id from pronunciation_session_items pi join vocabulary_sessions s on pi.session_id=s.pronunciation_session_id where s.id='${next}'`);
      const attempt = `50000000-0000-4000-8000-00000000000${round}`;
      sql(`select mutate_vocabulary_learning_session('${next}','${user}','advance','LEARN','${nextItem}',null);
        select * from register_pronunciation_attempt('${attempt}','${user}','${nextPronItem}','test/v2-${round}.webm','audio/webm',1000,100,'60000000-0000-4000-8000-00000000000${round}');
        update pronunciation_attempts set status='PROCESSING',processing_started_at=now() where id='${attempt}';
        select * from complete_pronunciation_attempt('${attempt}','${user}','azure','{"overall":{"accuracy":90},"words":[{"syllables":[{"accuracy":90,"isMissing":false,"isExtra":false}]}]}','{}');
        select mutate_vocabulary_learning_session('${next}','${user}','advance','PRONOUNCE','${nextItem}',null);
        select mutate_vocabulary_learning_session('${next}','${user}','answer','RECALL','${nextItem}','travel');
        select mutate_vocabulary_learning_session('${next}','${user}','answer','RECALL','${nextItem}','wrong');`);
      expect(sql(`select learning_stage || ':' || status from vocabulary_sessions where id='${next}'`)).toBe("SUMMARY:COMPLETED");
      expect(sql(`select vocabulary_learning_state(get_vocabulary_learning_history('${user}',array['${word}']::uuid[])->'${word}')`)).toBe(round === 3 ? "LEARNING" : "MASTERED");
    }
    expect(() => sql(`select create_vocabulary_learning_session('${user}','${topic}','BEGINNER','40000000-0000-4000-8000-000000000005',array['${word}']::uuid[],'{}',null,false)`)).toThrow("SELECTION_CHANGED");
    expect(() => sql(`select create_vocabulary_learning_session('${user}','${topic}','BEGINNER','40000000-0000-4000-8000-000000000005',array['${word}']::uuid[],'{}','${session}',false)`)).toThrow("NO_WEAK_ITEMS");
    expect(sql(`select create_vocabulary_learning_session('${user}','${topic}','BEGINNER','40000000-0000-4000-8000-000000000005',array['${word}']::uuid[],'{}',null,true)`)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("serializes simultaneous create requests and preserves both item orders", async () => {
    const second = "30000000-0000-4000-8000-000000000002";
    sql(`insert into vocabulary_items(id,topic_id,word,meaning_vi,example_sentence,pronunciation_ipa,level)
      values ('${second}','${topic}','train','tau','A train.','/train/','BEGINNER')`);
    const query = `select create_vocabulary_learning_session('${other}','${topic}','BEGINNER','40000000-0000-4000-8000-000000000006',array['${second}','${word}']::uuid[],'{}',null,false)`;
    const [one, two] = await Promise.all([concurrentSql(query), concurrentSql(query)]);
    expect(one).toBe(two);
    expect(sql(`select count(*) from vocabulary_sessions where user_id='${other}'`)).toBe("1");
    expect(sql(`select count(*) from pronunciation_sessions where user_id='${other}'`)).toBe("1");
    const linked = sql(`select pronunciation_session_id from vocabulary_sessions where id='${one}'`);
    expect(sql(`select string_agg(vocabulary_item_id::text,',' order by sequence_no) from vocabulary_session_items where session_id='${one}'`)).toBe(`${second},${word}`);
    expect(sql(`select string_agg(vocabulary_item_id::text,',' order by sequence_no) from pronunciation_session_items where session_id='${linked}'`)).toBe(`${second},${word}`);
    const pi = sql(`select id from pronunciation_session_items where session_id='${linked}' and vocabulary_item_id='${word}'`);
    sql(`select * from register_pronunciation_attempt('50000000-0000-4000-8000-000000000006','${other}','${pi}','test/failed.webm','audio/webm',1000,100,'60000000-0000-4000-8000-000000000006')`);
    expect(sql(`select vocabulary_learning_state(get_vocabulary_learning_history('${other}',array['${word}']::uuid[])->'${word}')`)).toBe("NEW");
    expect(() => sql(`select create_vocabulary_learning_session('${user}','${topic}','BEGINNER','40000000-0000-4000-8000-000000000007',array['${word}']::uuid[],'{}','${one}',false)`)).toThrow("INVALID_SOURCE");
  });
});
