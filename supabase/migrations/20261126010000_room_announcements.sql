-- Latest host announcement first, plus a short recent history (trimmed by the app).
alter table public.rooms
  add column announcements jsonb not null default '[]'::jsonb
  check (jsonb_typeof(announcements) = 'array' and jsonb_array_length(announcements) <= 20);
