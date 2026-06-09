
begin
  perform public.open_match_predictions();
  perform public.close_predictions_before_match();
end;
