-- Host-editable quick buttons (shared per room) and free-text quick requests.

alter table public.rooms
  add column buttons jsonb not null default '[]'::jsonb
  check (jsonb_typeof(buttons) = 'array' and jsonb_array_length(buttons) <= 20);

-- Quick-button requests have no template steps, so `selections` may be empty.
alter table public.requests drop constraint requests_selections_check;
alter table public.requests
  add constraint requests_selections_check check (cardinality(selections) between 0 and 6);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.rooms;
  end if;
end;
$$;
