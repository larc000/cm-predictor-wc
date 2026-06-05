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
group by u.id, u.email, u.name;

revoke all on public.leaderboard from anon;
grant select on public.leaderboard to authenticated;
