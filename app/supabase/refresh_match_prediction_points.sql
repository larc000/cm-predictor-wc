
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
