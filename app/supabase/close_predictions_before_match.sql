create or replace function public.close_predictions_before_match()
returns void
language plpgsql
security definer
as $$
begin

  update public.matches
  set status = 'closed'
  where status = 'open'
    and date_time > now()
    and date_time <= (now() + interval '24 hours');

end;
$$;