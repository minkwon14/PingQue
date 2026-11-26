-- Host can close a room early; participants can leave.

alter table public.rooms add column closed_at timestamptz;

-- Leaving deletes the participant but keeps their (cancelled) requests as history.
alter table public.requests alter column sender_id drop not null;
alter table public.requests drop constraint requests_sender_id_fkey;
alter table public.requests
  add constraint requests_sender_id_fkey
  foreign key (sender_id) references public.participants (id) on delete set null;

-- Realtime DELETE events must carry room_id so the room filter matches.
alter table public.participants replica identity full;
