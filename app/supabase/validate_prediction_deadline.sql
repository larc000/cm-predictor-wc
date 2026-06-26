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
