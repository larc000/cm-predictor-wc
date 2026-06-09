create or replace function public.open_match_predictions()
returns void
language plpgsql
security definer
as $$
begin
  update public.matches
  set status = 'open'
  where status = 'pending_teams'
    and team_a is not null
    and team_b is not null
    and trim(team_a) <> ''
    and trim(team_b) <> ''
    and upper(trim(team_a)) <> 'TBD'
    and upper(trim(team_b)) <> 'TBD'
    and date_time > (now() + interval '24 hours');
end;
$$;