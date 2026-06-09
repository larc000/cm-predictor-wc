alter table public.predictions
  add column if not exists pred_penalty_winner text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'predictions_pred_penalty_winner_check'
  ) then
    alter table public.predictions
      add constraint predictions_pred_penalty_winner_check
      check (pred_penalty_winner in ('team_a', 'team_b') or pred_penalty_winner is null);
  end if;
end $$;
