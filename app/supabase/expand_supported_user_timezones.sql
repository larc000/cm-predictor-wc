do $$
declare
  constraint_to_drop text;
begin
  select c.conname
  into constraint_to_drop
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'users'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%timezone%'
  limit 1;

  if constraint_to_drop is not null then
    execute format('alter table public.users drop constraint %I', constraint_to_drop);
  end if;
end $$;

alter table public.users
  add constraint users_timezone_check
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
  );

drop view if exists public.leaderboard;

create view public.leaderboard
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

revoke all on public.leaderboard from anon;
grant select on public.leaderboard to authenticated;

drop function if exists public.get_leaderboard();

create function public.get_leaderboard()
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

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;

notify pgrst, 'reload schema';
