-- FIFA World Cup 2026 - complete matches SQL regenerated from NBC ET schedule
-- Team names in Spanish. date_time values are UTC/GMT-0 timestamptz.
-- Times are stored as real UTC/GMT-0 instants. Costa Rica is UTC-6, so
-- 2026-06-13 22:00 in Costa Rica must be stored as 2026-06-14T04:00:00+00:00.

alter table public.matches add column if not exists stage text;

alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check check (status in ('open', 'closed', 'pending_teams', 'final'));

insert into public.matches (
  match_id, group_name, date_time, team_a, team_b, score_a, score_b, status, stage
)
values
  ('M073', NULL, '2026-06-28T19:00:00+00:00', 'SUDÁFRICA', 'CANADÁ', NULL, NULL, 'open', 'round_of_32'),
  ('M074', NULL, '2026-06-29T20:30:00+00:00', 'BRASIL', 'JAPÓN', NULL, NULL, 'open', 'round_of_32'),

  -- Grupo F ganador vs Grupo C segundo
  ('M075', NULL, '2026-06-30T01:00:00+00:00', 'ALEMANIA', 'ESCOCIA', NULL, NULL, 'open', 'round_of_32'),

  -- Grupo C ganador vs Grupo F segundo
  ('M076', NULL, '2026-06-29T17:00:00+00:00', 'PAÍSES BAJOS', 'MARRUECOS', NULL, NULL, 'open', 'round_of_32'),

  -- Grupo I ganador vs mejor tercero
  ('M077', NULL, '2026-06-30T21:00:00+00:00', 'COSTA DE MARFIL', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Grupo E segundo vs Grupo I segundo
  ('M078', NULL, '2026-06-30T17:00:00+00:00', 'ECUADOR', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Ganador Grupo A vs mejor tercero
  ('M079', NULL, '2026-07-01T01:00:00+00:00', 'MÉXICO', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Ganador Grupo L vs mejor tercero
  ('M080', NULL, '2026-07-01T16:00:00+00:00', 'INGLATERRA', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Ganador Grupo D vs mejor tercero
  ('M081', NULL, '2026-07-02T00:00:00+00:00', 'ESTADOS UNIDOS', 'BOSNIA Y HERZEGOVINA', NULL, NULL, 'open', 'round_of_32'),

  -- Ganador Grupo G vs mejor tercero
  ('M082', NULL, '2026-07-01T20:00:00+00:00', 'TBD', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Segundo Grupo K vs Segundo Grupo L
  ('M083', NULL, '2026-07-02T23:00:00+00:00', 'TBD', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Ganador Grupo H vs Segundo Grupo J
  ('M084', NULL, '2026-07-02T19:00:00+00:00', 'TBD', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Ganador Grupo B vs mejor tercero
  ('M085', NULL, '2026-07-03T03:00:00+00:00', 'SUIZA', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Ganador Grupo J vs Segundo Grupo H
  ('M086', NULL, '2026-07-03T22:00:00+00:00', 'ARGENTINA', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Ganador Grupo K vs mejor tercero
  ('M087', NULL, '2026-07-04T01:30:00+00:00', 'TBD', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),

  -- Segundo Grupo D vs Segundo Grupo G
  ('M088', NULL, '2026-07-03T18:00:00+00:00', 'AUSTRALIA', 'TBD', NULL, NULL, 'pending_teams', 'round_of_32'),
  
  -- OCTAVOS DE FINAL
('M089', NULL, '2026-07-04T21:00:00+00:00', 'GANADOR M073', 'GANADOR M074', NULL, NULL, 'pending_teams', 'round_of_16'),
('M090', NULL, '2026-07-04T17:00:00+00:00', 'GANADOR M075', 'GANADOR M076', NULL, NULL, 'pending_teams', 'round_of_16'),
('M091', NULL, '2026-07-05T20:00:00+00:00', 'GANADOR M077', 'GANADOR M078', NULL, NULL, 'pending_teams', 'round_of_16'),
('M092', NULL, '2026-07-06T00:00:00+00:00', 'GANADOR M079', 'GANADOR M080', NULL, NULL, 'pending_teams', 'round_of_16'),
('M093', NULL, '2026-07-06T19:00:00+00:00', 'GANADOR M081', 'GANADOR M082', NULL, NULL, 'pending_teams', 'round_of_16'),
('M094', NULL, '2026-07-07T00:00:00+00:00', 'GANADOR M083', 'GANADOR M084', NULL, NULL, 'pending_teams', 'round_of_16'),
('M095', NULL, '2026-07-07T16:00:00+00:00', 'GANADOR M085', 'GANADOR M086', NULL, NULL, 'pending_teams', 'round_of_16'),
('M096', NULL, '2026-07-07T20:00:00+00:00', 'GANADOR M087', 'GANADOR M088', NULL, NULL, 'pending_teams', 'round_of_16'),

-- CUARTOS DE FINAL
('M097', NULL, '2026-07-09T20:00:00+00:00', 'GANADOR M089', 'GANADOR M090', NULL, NULL, 'pending_teams', 'quarterfinal'),
('M098', NULL, '2026-07-10T19:00:00+00:00', 'GANADOR M091', 'GANADOR M092', NULL, NULL, 'pending_teams', 'quarterfinal'),
('M099', NULL, '2026-07-11T21:00:00+00:00', 'GANADOR M093', 'GANADOR M094', NULL, NULL, 'pending_teams', 'quarterfinal'),
('M100', NULL, '2026-07-12T01:00:00+00:00', 'GANADOR M095', 'GANADOR M096', NULL, NULL, 'pending_teams', 'quarterfinal'),

-- SEMIFINALES
('M101', NULL, '2026-07-14T19:00:00+00:00', 'GANADOR M097', 'GANADOR M098', NULL, NULL, 'pending_teams', 'semifinal'),
('M102', NULL, '2026-07-15T19:00:00+00:00', 'GANADOR M099', 'GANADOR M100', NULL, NULL, 'pending_teams', 'semifinal'),

-- TERCER LUGAR
('M103', NULL, '2026-07-18T21:00:00+00:00', 'PERDEDOR M101', 'PERDEDOR M102', NULL, NULL, 'pending_teams', 'third_place'),

-- FINAL
('M104', NULL, '2026-07-19T19:00:00+00:00', 'GANADOR M101', 'GANADOR M102', NULL, NULL, 'pending_teams', 'final')

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
