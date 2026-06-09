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
