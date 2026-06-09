create or replace function public.calculate_prediction_points(
  pred_a integer,
  pred_b integer,
  real_a integer,
  real_b integer,
  pred_penalty_winner text,
  real_penalty_winner text
) returns integer
language sql
immutable
as $$
  select
    case
      when pred_a is null or pred_b is null or real_a is null or real_b is null then 0
      else
        case
          when sign(pred_a - pred_b) = sign(real_a - real_b) then 1
          else 0
        end +
        case
          when pred_a = real_a and pred_b = real_b then 2
          else 0
        end +
        case
          when pred_penalty_winner is not null
            and real_penalty_winner is not null
            and pred_penalty_winner = real_penalty_winner then 1
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
$$;

create or replace function public.recalculate_points_for_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

notify pgrst, 'reload schema';
