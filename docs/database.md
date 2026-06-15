# Database

## New environment setup

Use `app/supabase/setup.sql` to create the full database baseline in a new Supabase environment.
It includes tables, indexes, constraints, RLS policies, grants, views, functions, and triggers.

Match seed files such as `matches_rows.sql` and `worldcup_2026_matches_es_utc_complete.sql`
are intentionally kept separate from the schema setup.

## Tables

- `users`
- `matches`
- `predictions`
- `leaderboard` view

## Match statuses

- `open`: users can predict if kickoff is more than 1 hour away.
- `closed`: manually or automatically unavailable.
- `pending_teams`: knockout match exists but teams are TBD.
- `final`: score is loaded and points can be calculated.

## Match stages

- `group`
- `round_of_32`
- `round_of_16`
- `quarterfinal`
- `semifinal`
- `third_place`
- `final`

## Matches

- `penalty_winner`: actual penalty shootout winner for knockout matches.
  - Allowed values: `team_a`, `team_b`, `null`.
  - Use `null` when the match did not go to penalties or the winner is not loaded yet.
- `created_at`: timestamp for when the match row was created.
- `updated_at`: timestamp for the last update to the match row.
  - Maintained automatically by `set_matches_updated_at_trigger`.
  - Intended to support future admin workflows and audit visibility.

## Predictions

- `pred_score_a`: predicted score for team A.
- `pred_score_b`: predicted score for team B.
- `pred_penalty_winner`: optional penalty winner prediction for knockout matches.
  - Allowed values: `team_a`, `team_b`, `null`.
  - Adds 1 point when it matches `matches.penalty_winner`.

## Time policy

All `matches.date_time` values are stored in UTC.
Frontend converts to `users.timezone`.
