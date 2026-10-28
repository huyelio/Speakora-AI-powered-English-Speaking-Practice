# Weekly XP leaderboard

Date: 2026-10-28. Status: done. The RPC was checked in PGlite: the week window, ties broken by who reached the total first, opt-out, the viewer with neighbours after the top 10, last week, and no user IDs in the result.

## Decisions

- **Weekly XP**, summed from `xp_events` since Monday 00:00 Vietnam time (Asia/Ho_Chi_Minh). Everyone starts at zero each week, so new learners can compete. All-time XP and scores or bands are not ranked.
- **One board for now.** Splitting boards by level (`profiles.level`) comes later. The RPC takes no level argument yet, but the design allows adding one.
- **Visible by default, opt-out.** `profiles.show_on_leaderboard` defaults to true. The learner switches it off on the leaderboard page. Only display names are shown: no emails and no user IDs leave the database.
- Only learners with XP this week are ranked. Ties keep the same rank (`rank()`), and whoever reached the total first is listed first.

## Changes

- Migration `202610280002_weekly_leaderboard.sql`:
  - `profiles.show_on_leaderboard`;
  - an index on `xp_events(created_at)`;
  - RPC `get_weekly_leaderboard(p_user_id, p_weeks_ago)`. It returns the top 10, plus the viewer and one learner on each side of the viewer when they are outside the top 10, plus the participant count and the week bounds. Each row has `position`, `display_name`, `weekly_xp` and `is_viewer`. The RPC is restricted to `service_role`.
- `src/modules/leaderboard/`:
  - the repository and a pure mapper ("còn N XP để vượt …");
  - a server action that changes visibility for the signed-in user only.
- `/leaderboard`:
  - "Tuần này" and "Tuần trước" tabs;
  - a podium for the top 3, then the ranked list with the viewer highlighted;
  - the week dates and the reset day;
  - how XP is earned;
  - the visibility switch.
- Home: a small card under the progress tiles shows the viewer's rank this week and the gap to the next learner, with a link to the board. If the query fails, the card is hidden.
- Avatar menu: "Bảng xếp hạng". The nav maps `/leaderboard` to the account section.

## Out of scope

Level leagues, friends, notifications, end-of-week badges.

## Verification

- The migration is checked in PGlite: the week window, opt-out, ties, the neighbours and that no user IDs are returned.
- `npm test`, `npm run check`, `npm run build`, then a desktop screenshot through `/dev-preview`.
