create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role text not null default 'Player',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  timezone text default 'America/Costa_Rica'
    check (
      timezone in (
        'America/Edmonton',
        'America/Chicago',
        'America/New_York',
        'America/Bogota',
        'America/Costa_Rica',
        'America/Los_Angeles',
        'Europe/Berlin',
        'Europe/London',
        'America/Toronto',
        'America/Vancouver'
      )
    )
);

create table if not exists public.matches (
  match_id text primary key,
  group_name text,
  date_time timestamptz not null,
  team_a text not null,
  team_b text not null,
  score_a integer,
  score_b integer,
  penalty_winner text check (penalty_winner in ('team_a', 'team_b') or penalty_winner is null),
  status text not null default 'open'
    check (status in ('open', 'closed', 'pending_teams', 'final')),
  stage text default 'group',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  match_id text not null references public.matches(match_id) on delete cascade,
  pred_score_a integer not null check (pred_score_a >= 0),
  pred_score_b integer not null check (pred_score_b >= 0),
  pred_penalty_winner text
    check (pred_penalty_winner in ('team_a', 'team_b') or pred_penalty_winner is null),
  submitted_at timestamptz not null default now(),
  points integer not null default 0,
  constraint predictions_user_match_unique unique (user_id, match_id)
);

create index if not exists users_auth_user_id_idx on public.users(auth_user_id);
create index if not exists users_email_lower_idx on public.users(lower(email));
create index if not exists matches_date_time_idx on public.matches(date_time);
create index if not exists predictions_match_id_idx on public.predictions(match_id);
create index if not exists predictions_user_id_idx on public.predictions(user_id);

create or replace function public.set_matches_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_matches_updated_at_trigger on public.matches;

create trigger set_matches_updated_at_trigger
before update on public.matches
for each row
execute function public.set_matches_updated_at();

create or replace function public.calculate_prediction_points(
  pred_a integer,
  pred_b integer,
  real_a integer,
  real_b integer,
  pred_penalty_winner text,
  real_penalty_winner text
) returns integer
language sql
immutable
as $$
  select
    case
      when pred_a is null or pred_b is null or real_a is null or real_b is null then 0
      else
        case
          when sign(pred_a - pred_b) = sign(real_a - real_b) then 1
          else 0
        end +
        case
          when pred_a = real_a and pred_b = real_b then 2
          else 0
        end +
        case
          when pred_penalty_winner is not null
            and real_penalty_winner is not null
            and pred_penalty_winner = real_penalty_winner then 1
          else 0
        end
    end;
$$;

create or replace function public.refresh_match_prediction_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.status) = 'final' and new.score_a is not null and new.score_b is not null then
    update public.predictions
    set points = public.calculate_prediction_points(
      pred_score_a,
      pred_score_b,
      new.score_a,
      new.score_b,
      pred_penalty_winner,
      new.penalty_winner
    )
    where match_id = new.match_id;
  else
    update public.predictions
    set points = 0
    where match_id = new.match_id;
  end if;

  return new;
end;
$$;

drop trigger if exists refresh_match_prediction_points_trigger on public.matches;

create trigger refresh_match_prediction_points_trigger
after insert or update of score_a, score_b, penalty_winner, status on public.matches
for each row
execute function public.refresh_match_prediction_points();

create or replace function public.validate_prediction_deadline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  match_kickoff timestamptz;
  match_status text;
begin
  select date_time, status
  into match_kickoff, match_status
  from public.matches
  where match_id = new.match_id;

  if match_kickoff is null then
    raise exception 'Partido no encontrado.';
  end if;

  if lower(match_status) <> 'open' then
    raise exception 'Este partido no está abierto para predicciones.';
  end if;

  if now() > match_kickoff - interval '1 hour' then
    raise exception 'Predictions for this match are already closed. Predictions must be submitted at least 1 hour before kickoff.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_prediction_deadline_trigger on public.predictions;

create trigger validate_prediction_deadline_trigger
before insert or update of match_id, pred_score_a, pred_score_b, pred_penalty_winner on public.predictions
for each row
execute function public.validate_prediction_deadline();

create or replace function public.open_match_predictions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches
  set status = 'open'
  where lower(status) = 'pending_teams'
    and team_a is not null
    and team_b is not null
    and trim(team_a) <> ''
    and trim(team_b) <> ''
    and upper(trim(team_a)) <> 'TBD'
    and upper(trim(team_b)) <> 'TBD'
    and date_time > (now() + interval '1 hour');
end;
$$;

create or replace function public.close_predictions_before_match()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches
  set status = 'closed'
  where lower(status) = 'open'
    and date_time > now()
    and date_time <= (now() + interval '1 hour');
end;
$$;

create or replace function public.refresh_match_prediction_statuses()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.open_match_predictions();
  perform public.close_predictions_before_match();
end;
$$;

create or replace view public.leaderboard
with (security_invoker = false)
as
select
  u.id as user_id,
  u.email,
  u.name,
  u.timezone,
  coalesce(sum(p.points), 0)::integer as points
from public.users u
left join public.predictions p on p.user_id = u.id
where u.active = true
  and exists (
    select 1
    from public.users requester
    where requester.active = true
      and (
        requester.auth_user_id = auth.uid()
        or lower(requester.email) = lower(auth.jwt() ->> 'email')
      )
  )
group by u.id, u.email, u.name, u.timezone;

create or replace function public.get_leaderboard()
returns table (
  user_id uuid,
  email text,
  name text,
  timezone text,
  points integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id as user_id,
    u.email,
    u.name,
    u.timezone,
    coalesce(sum(p.points), 0)::integer as points
  from public.users u
  left join public.predictions p on p.user_id = u.id
  where u.active = true
    and exists (
      select 1
      from public.users requester
      where requester.active = true
        and (
          requester.auth_user_id = auth.uid()
          or lower(requester.email) = lower(auth.jwt() ->> 'email')
        )
    )
  group by u.id, u.email, u.name, u.timezone
  order by points desc, u.name asc, u.email asc;
$$;

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
  where exists (
    select 1
    from public.users requester
    where requester.active = true
      and (
        requester.auth_user_id = auth.uid()
        or lower(requester.email) = lower(auth.jwt() ->> 'email')
      )
  )
    and lower(m.status) in ('closed', 'final')
  order by
    m.date_time desc,
    m.match_id asc,
    u.name asc nulls last,
    u.email asc;
$$;

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
  count(p.id) filter (where prediction_user.id is not null and p.points = 1)::integer as result_only_count,
  count(p.id) filter (where prediction_user.id is not null and p.points = 3)::integer as exact_score_count,
  count(p.id) filter (
    where prediction_user.id is not null
      and p.pred_penalty_winner is not null
      and m.penalty_winner is not null
      and p.pred_penalty_winner = m.penalty_winner
  )::integer as penalties_count,
  round(
    count(p.id) filter (where prediction_user.id is not null and p.points = 1)::numeric * 100.0 /
      nullif(au.total_active_users, 0)::numeric,
    1
  ) as result_only_pct,
  round(
    count(p.id) filter (where prediction_user.id is not null and p.points = 3)::numeric * 100.0 /
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
  case
    when got_penalty_point then 'penalties'
    when p.points = 1 then 'result_only'
    when p.points = 3 then 'exact_score'
    else null
  end as winner_type
from final_predictions p
where got_penalty_point
  or p.points in (1, 3);

create or replace view public.pending_match_participation
with (security_invoker = false)
as
with active_users as (
  select count(*)::integer as active_users
  from public.users
  where active = true
)
select
  m.match_id,
  m.team_a,
  m.team_b,
  m.status,
  m.date_time,
  count(p.id) filter (where prediction_user.id is not null)::integer as predictions_submitted,
  au.active_users,
  round(
    count(p.id) filter (where prediction_user.id is not null)::numeric * 100.0 /
      nullif(au.active_users, 0)::numeric,
    1
  ) as participation_pct
from public.matches m
cross join active_users au
left join public.predictions p on p.match_id = m.match_id
left join public.users prediction_user on prediction_user.id = p.user_id and prediction_user.active = true
where lower(m.status) in ('open', 'closed', 'pending_teams')
group by
  m.match_id,
  m.team_a,
  m.team_b,
  m.status,
  m.date_time,
  au.active_users;

create or replace view public.performance_report
with (security_invoker = false)
as
with participant_points as (
  select
    u.id as user_id,
    u.email,
    u.name,
    u.timezone,
    coalesce(sum(p.points), 0)::integer as total_points,
    count(p.id) filter (where p.points = 1)::integer as result_count,
    count(p.id) filter (where p.points = 3)::integer as exact_score_count,
    count(p.id) filter (where p.points = 4)::integer as penalties_count
  from public.users u
  left join public.predictions p on p.user_id = u.id
  where u.active = true
  group by u.id, u.email, u.name, u.timezone
)
select
  row_number() over (
    order by total_points desc, exact_score_count desc, result_count desc, name asc nulls last, email asc
  )::integer as position,
  user_id,
  email,
  name,
  timezone,
  name as participant,
  total_points,
  result_count,
  exact_score_count,
  penalties_count
from participant_points;

alter table public.users enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

grant usage on schema public to authenticated;
grant select, update on public.users to authenticated;
grant select on public.matches to authenticated;
grant select, insert, update on public.predictions to authenticated;
grant select on public.leaderboard to authenticated;
grant select on public.match_result_stats to authenticated;
grant select on public.match_result_winners to authenticated;
grant select on public.pending_match_participation to authenticated;
grant select on public.performance_report to authenticated;

revoke all on public.leaderboard from anon;
revoke all on public.match_result_stats from anon;
revoke all on public.match_result_winners from anon;
revoke all on public.pending_match_participation from anon;
revoke all on public.performance_report from anon;
revoke all on function public.get_leaderboard() from public;
revoke all on function public.get_predictions_audit() from public;
revoke all on function public.refresh_match_prediction_statuses() from public;

grant execute on function public.get_leaderboard() to authenticated;
grant execute on function public.get_predictions_audit() to authenticated;
grant execute on function public.refresh_match_prediction_statuses() to authenticated;

drop policy if exists "users can read active users" on public.users;
create policy "users can read active users"
on public.users for select
to authenticated
using (
  active = true
  or auth_user_id = auth.uid()
  or lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "users can update own profile basics" on public.users;
create policy "users can update own profile basics"
on public.users for update
to authenticated
using (
  auth_user_id = auth.uid()
  or (
    auth_user_id is null
    and lower(email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  auth_user_id = auth.uid()
  and lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "authenticated users can read matches" on public.matches;
create policy "authenticated users can read matches"
on public.matches for select
to authenticated
using (
  exists (
    select 1
    from public.users requester
    where requester.active = true
      and (
        requester.auth_user_id = auth.uid()
        or lower(requester.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

drop policy if exists "users can read own predictions" on public.predictions;
create policy "users can read own predictions"
on public.predictions for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = predictions.user_id
      and u.active = true
      and (
        u.auth_user_id = auth.uid()
        or lower(u.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

drop policy if exists "users can insert own editable predictions" on public.predictions;
create policy "users can insert own editable predictions"
on public.predictions for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = predictions.user_id
      and u.active = true
      and (
        u.auth_user_id = auth.uid()
        or lower(u.email) = lower(auth.jwt() ->> 'email')
      )
  )
  and exists (
    select 1
    from public.matches m
    where m.match_id = predictions.match_id
      and lower(m.status) = 'open'
      and m.date_time > now() + interval '1 hour'
  )
);

drop policy if exists "users can update own editable predictions" on public.predictions;
create policy "users can update own editable predictions"
on public.predictions for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = predictions.user_id
      and u.active = true
      and (
        u.auth_user_id = auth.uid()
        or lower(u.email) = lower(auth.jwt() ->> 'email')
      )
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = predictions.user_id
      and u.active = true
      and (
        u.auth_user_id = auth.uid()
        or lower(u.email) = lower(auth.jwt() ->> 'email')
      )
  )
  and exists (
    select 1
    from public.matches m
    where m.match_id = predictions.match_id
      and lower(m.status) = 'open'
      and m.date_time > now() + interval '1 hour'
  )
);

notify pgrst, 'reload schema';
