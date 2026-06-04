create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  role text not null default 'Player',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  match_id text primary key,
  group_name text,
  date_time timestamptz not null,
  team_a text not null,
  team_b text not null,
  score_a integer,
  score_b integer,
  status text not null default 'Open' check (status in ('Open', 'Closed', 'Final'))
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  match_id text not null references public.matches(match_id) on delete cascade,
  pred_score_a integer not null check (pred_score_a >= 0),
  pred_score_b integer not null check (pred_score_b >= 0),
  submitted_at timestamptz not null default now(),
  points integer not null default 0,
  unique (user_id, match_id)
);

create or replace function public.calculate_prediction_points(
  pred_a integer,
  pred_b integer,
  real_a integer,
  real_b integer
) returns integer
language sql
immutable
as $$
  select
    case
      when pred_a is null or pred_b is null or real_a is null or real_b is null then 0
      else
        case
          when sign(pred_a - pred_b) = sign(real_a - real_b) then 3
          else 0
        end +
        case
          when pred_a = real_a and pred_b = real_b then 2
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
  if new.status = 'Final' and new.score_a is not null and new.score_b is not null then
    update public.predictions
    set points = public.calculate_prediction_points(
      pred_score_a,
      pred_score_b,
      new.score_a,
      new.score_b
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
after insert or update of score_a, score_b, status on public.matches
for each row
execute function public.refresh_match_prediction_points();

create or replace view public.leaderboard
with (security_invoker = true)
as
select
  u.id as user_id,
  u.email,
  u.name,
  coalesce(sum(p.points), 0)::integer as points
from public.users u
left join public.predictions p on p.user_id = u.id
where u.active = true
group by u.id, u.email, u.name;

alter table public.users enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

grant select, insert, update on public.users to authenticated;
grant select on public.matches to authenticated;
grant select, insert, update on public.predictions to authenticated;
grant select on public.leaderboard to authenticated;

drop policy if exists "users can read active users" on public.users;
create policy "users can read active users"
on public.users for select
to authenticated
using (active = true or id = auth.uid());

drop policy if exists "users can create own profile" on public.users;
create policy "users can create own profile"
on public.users for insert
to authenticated
with check (
  id = auth.uid()
  and lower(email) = lower(auth.jwt() ->> 'email')
  and lower(auth.jwt() ->> 'email') like '%@omc.com'
);

drop policy if exists "users can update own profile basics" on public.users;
create policy "users can update own profile basics"
on public.users for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "authenticated users can read matches" on public.matches;
create policy "authenticated users can read matches"
on public.matches for select
to authenticated
using (true);

drop policy if exists "users can read own predictions" on public.predictions;
create policy "users can read own predictions"
on public.predictions for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can insert own editable predictions" on public.predictions;
create policy "users can insert own editable predictions"
on public.predictions for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.matches m
    where m.match_id = predictions.match_id
      and m.status = 'Open'
      and m.date_time > now() + interval '24 hours'
  )
);

drop policy if exists "users can update own editable predictions" on public.predictions;
create policy "users can update own editable predictions"
on public.predictions for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.matches m
    where m.match_id = predictions.match_id
      and m.status = 'Open'
      and m.date_time > now() + interval '24 hours'
  )
);
