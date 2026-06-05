create or replace view public.leaderboard
with (security_invoker = false)
as
select
  u.id as user_id,
  u.email,
  u.name,
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
group by u.id, u.email, u.name;

revoke all on public.leaderboard from anon;
grant select on public.leaderboard to authenticated;

create or replace function public.get_leaderboard()
returns table (
  user_id uuid,
  email text,
  name text,
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
  group by u.id, u.email, u.name
  order by points desc, u.name asc, u.email asc;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;

notify pgrst, 'reload schema';
