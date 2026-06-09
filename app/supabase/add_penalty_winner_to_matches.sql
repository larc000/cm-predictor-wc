alter table public.matches
  add column if not exists penalty_winner text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_penalty_winner_check'
  ) then
    alter table public.matches
      add constraint matches_penalty_winner_check
      check (penalty_winner in ('team_a', 'team_b') or penalty_winner is null);
  end if;
end $$;
