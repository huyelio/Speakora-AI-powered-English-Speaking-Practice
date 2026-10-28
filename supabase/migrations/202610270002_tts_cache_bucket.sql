-- Shared text-to-speech cache for fixed bank content (vocabulary words, question prompts,
-- role-play openings). Objects are keyed by a SHA-256 of text, model, voice, speed and
-- instructions, so a change to any of them misses the cache instead of serving stale audio.
-- AI-generated, per-learner text is never written here.
-- Private: only the service role reads and writes. Learners get audio through authorized
-- Next.js routes, never by direct Storage access.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tts-cache', 'tts-cache', false, 5242880, array['audio/mpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
