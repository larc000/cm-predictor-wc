create or replace function public.get_predictions_audit()
returns table (
  match_id text,
  group_name text,
  stage text,
  date_time timestamptz,
  team_a text,
  team_b text,
  score_a integer,
  score_b integer,
  penalty_winner text,
  status text,
  user_id uuid,
  user_email text,
  user_name text,
  pred_score_a integer,
  pred_score_b integer,
  pred_penalty_winner text,
  submitted_at timestamptz,
  points integer
)
language sql
security definer
set search_path = public
as $$
  select
    m.match_id,
    m.group_name,
    m.stage,
    m.date_time,
    m.team_a,
    m.team_b,
    m.score_a,
    m.score_b,
    m.penalty_winner,
    m.status,
    u.id as user_id,
    u.email as user_email,
    u.name as user_name,
    p.pred_score_a,
    p.pred_score_b,
    p.pred_penalty_winner,
    p.submitted_at,
    p.points
  from public.predictions p
  join public.matches m on m.match_id = p.match_id
  join public.users u on u.id = p.user_id
  where lower(m.status) in ('closed', 'final')
  order by
    m.date_time desc,
    m.match_id asc,
    u.name asc nulls last,
    u.email asc;
$$;

revoke all on function public.get_predictions_audit() from public;
grant execute on function public.get_predictions_audit() to authenticated;
