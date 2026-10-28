-- Weekly XP leaderboard. Read-only over xp_events; learners can hide themselves.
begin;

alter table public.profiles
  add column show_on_leaderboard boolean not null default true;

create index if not exists xp_events_created_at_idx on public.xp_events(created_at);

-- Weeks run Monday 00:00 to Monday 00:00 in Vietnam time. Returns the top 10 plus the viewer and
-- one learner on each side, never user IDs. Hidden learners and learners without XP this week are not ranked.
-- list_index is the gap-free order (ties broken by who reached the total first); a jump marks the cut
-- between the top 10 and the viewer's neighbourhood.
create function public.get_weekly_leaderboard(p_user_id uuid, p_weeks_ago integer default 0)
returns table (
  "position" integer,
  list_index integer,
  display_name text,
  weekly_xp integer,
  is_viewer boolean,
  participants integer,
  week_start timestamptz,
  week_end timestamptz
)
language sql stable security definer set search_path = public as $$
  with bounds as (
    select (date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh') - make_interval(weeks => greatest(p_weeks_ago, 0)))
             at time zone 'Asia/Ho_Chi_Minh' as starts
  ),
  totals as (
    select e.user_id, sum(e.amount)::integer as xp, max(e.created_at) as reached_at
    from xp_events e, bounds b
    where e.created_at >= b.starts and e.created_at < b.starts + interval '7 days'
    group by e.user_id
  ),
  ranked as (
    select t.user_id, p.display_name, t.xp,
      rank() over (order by t.xp desc)::integer as pos,
      row_number() over (order by t.xp desc, t.reached_at asc)::integer as ord,
      count(*) over ()::integer as total
    from totals t
    join profiles p on p.user_id = t.user_id
    where p.show_on_leaderboard and t.xp > 0
  ),
  viewer as (select ord from ranked where user_id = p_user_id)
  select r.pos, r.ord, r.display_name, r.xp, r.user_id = p_user_id, r.total, b.starts, b.starts + interval '7 days'
  from ranked r, bounds b
  where r.ord <= 10 or r.ord between (select ord from viewer) - 1 and (select ord from viewer) + 1
  order by r.ord;
$$;

revoke all on function public.get_weekly_leaderboard(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_weekly_leaderboard(uuid, integer) to service_role;
commit;
