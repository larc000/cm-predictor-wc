create or replace view public.match_result_stats
with (security_invoker = false)
as
with active_users as (
  select count(*)::integer as total_active_users
  from public.users
  where active = true
),
final_matches as (
  select *
  from public.matches
  where lower(status) = 'final'
)
select
  m.match_id,
  m.team_a,
  m.team_b,
  m.score_a,
  m.score_b,
  au.total_active_users,
  count(p.id) filter (
    where prediction_user.id is not null
      and m.score_a is not null
      and m.score_b is not null
      and sign(p.pred_score_a - p.pred_score_b) = sign(m.score_a - m.score_b)
  )::integer as result_only_count,
  count(p.id) filter (
    where prediction_user.id is not null
      and m.score_a is not null
      and m.score_b is not null
      and p.pred_score_a = m.score_a
      and p.pred_score_b = m.score_b
  )::integer as exact_score_count,
  count(p.id) filter (
    where prediction_user.id is not null
      and p.pred_penalty_winner is not null
      and m.penalty_winner is not null
      and p.pred_penalty_winner = m.penalty_winner
  )::integer as penalties_count,
  round(
    count(p.id) filter (
      where prediction_user.id is not null
        and m.score_a is not null
        and m.score_b is not null
        and sign(p.pred_score_a - p.pred_score_b) = sign(m.score_a - m.score_b)
    )::numeric * 100.0 /
      nullif(au.total_active_users, 0)::numeric,
    1
  ) as result_only_pct,
  round(
    count(p.id) filter (
      where prediction_user.id is not null
        and m.score_a is not null
        and m.score_b is not null
        and p.pred_score_a = m.score_a
        and p.pred_score_b = m.score_b
    )::numeric * 100.0 /
      nullif(au.total_active_users, 0)::numeric,
    1
  ) as exact_score_pct,
  round(
    count(p.id) filter (
      where prediction_user.id is not null
        and p.pred_penalty_winner is not null
        and m.penalty_winner is not null
        and p.pred_penalty_winner = m.penalty_winner
    )::numeric * 100.0 /
      nullif(au.total_active_users, 0)::numeric,
    1
  ) as penalties_pct
from final_matches m
cross join active_users au
left join public.predictions p on p.match_id = m.match_id
left join public.users prediction_user on prediction_user.id = p.user_id and prediction_user.active = true
group by
  m.match_id,
  m.team_a,
  m.team_b,
  m.score_a,
  m.score_b,
  au.total_active_users;

create or replace view public.match_result_winners
with (security_invoker = false)
as
with final_predictions as (
select
  m.match_id,
  u.id as user_id,
  u.email,
  u.name,
  u.timezone,
  case
    when u.timezone = 'America/Edmonton' then 'Calgary'
    when u.timezone = 'America/Chicago' then 'Chicago / Nashville'
    when u.timezone = 'America/New_York' then 'Cincinnati / New York'
    when u.timezone = 'America/Bogota' then 'Colombia'
    when u.timezone = 'America/Costa_Rica' then 'Costa Rica'
    when u.timezone = 'America/Los_Angeles' then 'Cupertino / Los Angeles'
    when u.timezone = 'Europe/Berlin' then 'Germany'
    when u.timezone = 'Europe/London' then 'London'
    when u.timezone = 'America/Toronto' then 'Toronto'
    when u.timezone = 'America/Vancouver' then 'Vancouver'
    else null
  end as location,
  p.pred_score_a,
  p.pred_score_b,
  p.pred_penalty_winner,
  p.points,
  (
    m.score_a is not null
    and m.score_b is not null
    and sign(p.pred_score_a - p.pred_score_b) = sign(m.score_a - m.score_b)
  ) as got_result_point,
  (
    m.score_a is not null
    and m.score_b is not null
    and p.pred_score_a = m.score_a
    and p.pred_score_b = m.score_b
  ) as got_exact_score_points,
  (
    p.pred_penalty_winner is not null
    and m.penalty_winner is not null
    and p.pred_penalty_winner = m.penalty_winner
  ) as got_penalty_point
from public.predictions p
join public.matches m on m.match_id = p.match_id
join public.users u on u.id = p.user_id
where lower(m.status) = 'final'
  and u.active = true
)
select
  match_id,
  user_id,
  email,
  name,
  timezone,
  location,
  pred_score_a,
  pred_score_b,
  pred_penalty_winner,
  points,
  scoring.winner_type
from final_predictions p
cross join lateral (
  values
    ('result_only', got_result_point),
    ('exact_score', got_exact_score_points),
    ('penalties', got_penalty_point)
) as scoring(winner_type, did_win)
where scoring.did_win;

revoke all on public.match_result_stats from anon;
revoke all on public.match_result_winners from anon;
grant select on public.match_result_stats to authenticated;
grant select on public.match_result_winners to authenticated;

notify pgrst, 'reload schema';
