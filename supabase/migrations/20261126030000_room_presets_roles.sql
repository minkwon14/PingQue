-- Host-managed announcement presets and join role choices. Null keeps the app defaults
-- (default presets / the template's roles), so existing rooms need no backfill.
alter table public.rooms
  add column announcement_presets jsonb
  check (announcement_presets is null or (jsonb_typeof(announcement_presets) = 'array' and jsonb_array_length(announcement_presets) <= 20)),
  add column roles jsonb
  check (roles is null or (jsonb_typeof(roles) = 'array' and jsonb_array_length(roles) <= 20));
