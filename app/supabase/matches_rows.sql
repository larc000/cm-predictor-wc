-- FIFA World Cup 2026 - complete matches SQL regenerated from NBC ET schedule
-- Team names in English. date_time values are UTC/GMT-0 timestamptz.
-- Times are stored as real UTC/GMT-0 instants. Costa Rica is UTC-6, so
-- 2026-06-13 22:00 in Costa Rica must be stored as 2026-06-14T04:00:00+00:00.

alter table public.matches add column if not exists stage text;

alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check check (status in ('open', 'closed', 'pending_teams', 'final'));

insert into public.matches (
  match_id, group_name, date_time, team_a, team_b, score_a, score_b, status, stage
)
values
  ('M073', NULL, '2026-06-28T19:00:00+00:00', 'SOUTH AFRICA', 'CANADA', NULL, NULL, 'open', 'round_of_32'),
  ('M074', NULL, '2026-06-29T20:30:00+00:00', 'BRAZIL', 'JAPAN', NULL, NULL, 'open', 'round_of_32'),

  -- Group F winner vs Group C runner-up
  ('M075', NULL, '2026-06-30T01:00:00+00:00', 'GERMANY', 'SCOTLAND', NULL, NULL, 'open', 'round_of_32'),

  -- Group C winner vs Group F runner-up
  ('M076', NULL, '2026-06-29T17:00:00+00:00', 'NETHERLANDS', 'MOROCCO', NULL, NULL, 'open', 'round_of_32'),

  -- Group I winner vs best third-place team
  ('M077', NULL, '2026-06-30T21:00:00+00:00', 'IVORY COAST', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Group E runner-up vs Group I runner-up
  ('M078', NULL, '2026-06-30T17:00:00+00:00', 'ECUADOR', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Group A winner vs best third-place team
  ('M079', NULL, '2026-07-01T01:00:00+00:00', 'MEXICO', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Group L winner vs best third-place team
  ('M080', NULL, '2026-07-01T16:00:00+00:00', 'ENGLAND', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Group D winner vs best third-place team
  ('M081', NULL, '2026-07-02T00:00:00+00:00', 'UNITED STATES', 'BOSNIA AND HERZEGOVINA', NULL, NULL, 'open', 'round_of_32'),

  -- Group G winner vs best third-place team
  ('M082', NULL, '2026-07-01T20:00:00+00:00', 'TBD', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Group K runner-up vs Group L runner-up
  ('M083', NULL, '2026-07-02T23:00:00+00:00', 'TBD', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Group H winner vs Group J runner-up
  ('M084', NULL, '2026-07-02T19:00:00+00:00', 'TBD', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Group B winner vs best third-place team
  ('M085', NULL, '2026-07-03T03:00:00+00:00', 'SWITZERLAND', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Group J winner vs Group H runner-up
  ('M086', NULL, '2026-07-03T22:00:00+00:00', 'ARGENTINA', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Group K winner vs best third-place team
  ('M087', NULL, '2026-07-04T01:30:00+00:00', 'TBD', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Group D runner-up vs Group G runner-up
  ('M088', NULL, '2026-07-03T18:00:00+00:00', 'AUSTRALIA', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- ROUND OF 16
  ('M089', NULL, '2026-07-04T21:00:00+00:00', 'WINNER M073', 'WINNER M074', NULL, NULL, 'pending_teams', 'round_of_16'),
  ('M090', NULL, '2026-07-04T17:00:00+00:00', 'WINNER M075', 'WINNER M076', NULL, NULL, 'pending_teams', 'round_of_16'),
  ('M091', NULL, '2026-07-05T20:00:00+00:00', 'WINNER M077', 'WINNER M078', NULL, NULL, 'pending_teams', 'round_of_16'),
  ('M092', NULL, '2026-07-06T00:00:00+00:00', 'WINNER M079', 'WINNER M080', NULL, NULL, 'pending_teams', 'round_of_16'),
  ('M093', NULL, '2026-07-06T19:00:00+00:00', 'WINNER M081', 'WINNER M082', NULL, NULL, 'pending_teams', 'round_of_16'),
  ('M094', NULL, '2026-07-07T00:00:00+00:00', 'WINNER M083', 'WINNER M084', NULL, NULL, 'pending_teams', 'round_of_16'),
  ('M095', NULL, '2026-07-07T16:00:00+00:00', 'WINNER M085', 'WINNER M086', NULL, NULL, 'pending_teams', 'round_of_16'),
  ('M096', NULL, '2026-07-07T20:00:00+00:00', 'WINNER M087', 'WINNER M088', NULL, NULL, 'pending_teams', 'round_of_16'),

  -- QUARTERFINALS
  ('M097', NULL, '2026-07-09T20:00:00+00:00', 'WINNER M089', 'WINNER M090', NULL, NULL, 'pending_teams', 'quarterfinal'),
  ('M098', NULL, '2026-07-10T19:00:00+00:00', 'WINNER M091', 'WINNER M092', NULL, NULL, 'pending_teams', 'quarterfinal'),
  ('M099', NULL, '2026-07-11T21:00:00+00:00', 'WINNER M093', 'WINNER M094', NULL, NULL, 'pending_teams', 'quarterfinal'),
  ('M100', NULL, '2026-07-12T01:00:00+00:00', 'WINNER M095', 'WINNER M096', NULL, NULL, 'pending_teams', 'quarterfinal'),

  -- SEMIFINALS
  ('M101', NULL, '2026-07-14T19:00:00+00:00', 'WINNER M097', 'WINNER M098', NULL, NULL, 'pending_teams', 'semifinal'),
  ('M102', NULL, '2026-07-15T19:00:00+00:00', 'WINNER M099', 'WINNER M100', NULL, NULL, 'pending_teams', 'semifinal'),

  -- THIRD PLACE
  ('M103', NULL, '2026-07-18T21:00:00+00:00', 'LOSER M101', 'LOSER M102', NULL, NULL, 'pending_teams', 'third_place'),

  -- FINAL
  ('M104', NULL, '2026-07-19T19:00:00+00:00', 'WINNER M101', 'WINNER M102', NULL, NULL, 'pending_teams', 'final')

on conflict (match_id) do update
set
  group_name = excluded.group_name,
  date_time = excluded.date_time,
  team_a = excluded.team_a,
  team_b = excluded.team_b,
  status = excluded.status,
  stage = excluded.stage;

-- Audit helpers:
-- select match_id, team_a, team_b, date_time as utc_time, date_time at time zone 'America/Costa_Rica' as costa_rica_time from public.matches order by date_time;
-- select status, stage, count(*) from public.matches group by status, stage order by stage, status;