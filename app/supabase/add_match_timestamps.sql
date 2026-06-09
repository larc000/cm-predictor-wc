alter table public.matches
  add column if not exists created_at timestamptz not null default now();

alter table public.matches
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_matches_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_matches_updated_at_trigger on public.matches;

create trigger set_matches_updated_at_trigger
before update on public.matches
for each row
execute function public.set_matches_updated_at();
