-- PingQue initial schema.
--
-- Access model (first slice): the Next.js server talks to Postgres with the
-- service-role key and authenticates devices itself with opaque tokens whose
-- SHA-256 hashes live in `room_receivers.token_hash` / `participants.token_hash`.
-- RLS is enabled on every table with NO policies for `anon` / `authenticated`,
-- so the public API keys cannot read or write anything directly. Business rules
-- (capacity, expiry, rate limit, status transitions) are enforced by triggers so
-- they hold no matter which client writes.

create table public.rooms (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  template_id      text not null,
  max_participants int  not null default 10 check (max_participants between 1 and 20),
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null,
  check (expires_at > created_at)
);

-- Receivers are separate from rooms so paid tiers can add more than the host.
create table public.room_receivers (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  is_host    boolean not null default false,
  token_hash text not null,
  created_at timestamptz not null default now(),
  unique (room_id, token_hash)
);
create unique index room_receivers_one_host on public.room_receivers (room_id) where is_host;

create table public.participants (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 20),
  role       text not null check (char_length(role) between 1 and 40),
  token_hash text not null,
  joined_at  timestamptz not null default now(),
  unique (room_id, token_hash)
);
create index participants_room_idx on public.participants (room_id);

create table public.requests (
  -- Client-generated UUID: the primary key is the idempotency key.
  id           uuid primary key,
  room_id      uuid not null references public.rooms (id) on delete cascade,
  sender_id    uuid not null references public.participants (id) on delete cascade,
  target_id    uuid not null references public.room_receivers (id) on delete cascade,
  template_id  text not null,
  selections   text[] not null check (cardinality(selections) between 2 and 6),
  item         text not null,
  qualifiers   text[] not null default '{}',
  action       text not null,
  label        text not null,
  status       text not null default 'received'
               check (status in ('received', 'confirmed', 'done', 'cancelled')),
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  done_at      timestamptz,
  cancelled_at timestamptz
);
create index requests_room_created_idx on public.requests (room_id, created_at);
create index requests_sender_created_idx on public.requests (sender_id, created_at desc);

-- Capacity and expiry for new participants.
create function public.pq_participants_before_insert() returns trigger
language plpgsql as $$
declare
  r public.rooms;
begin
  select * into r from public.rooms where id = new.room_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if now() >= r.expires_at then
    raise exception 'room_expired';
  end if;
  if (select count(*) from public.participants where room_id = new.room_id) >= r.max_participants then
    raise exception 'room_full';
  end if;
  return new;
end;
$$;
create trigger participants_before_insert
  before insert on public.participants
  for each row execute function public.pq_participants_before_insert();

-- Expiry and ~1 request/second per device for new requests.
create function public.pq_requests_before_insert() returns trigger
language plpgsql as $$
declare
  r public.rooms;
begin
  select * into r from public.rooms where id = new.room_id;
  if not found then
    raise exception 'not_found';
  end if;
  if now() >= r.expires_at then
    raise exception 'room_expired';
  end if;
  if exists (
    select 1 from public.requests
    where sender_id = new.sender_id
      and created_at > now() - interval '1 second'
  ) then
    raise exception 'rate_limited';
  end if;
  new.status := 'received';
  new.created_at := now();
  return new;
end;
$$;
create trigger requests_before_insert
  before insert on public.requests
  for each row execute function public.pq_requests_before_insert();

-- Legal status transitions and timestamps. Who may perform them is decided by
-- the server (host/receiver: confirmed, done; sender: cancelled).
create function public.pq_requests_before_update() returns trigger
language plpgsql as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if not (
    (old.status = 'received'  and new.status in ('confirmed', 'done', 'cancelled')) or
    (old.status = 'confirmed' and new.status in ('done', 'cancelled'))
  ) then
    raise exception 'invalid_transition';
  end if;
  if new.status = 'confirmed' then new.confirmed_at := now(); end if;
  if new.status = 'done'      then new.done_at      := now(); end if;
  if new.status = 'cancelled' then new.cancelled_at := now(); end if;
  return new;
end;
$$;
create trigger requests_before_update
  before update on public.requests
  for each row execute function public.pq_requests_before_update();

alter table public.rooms          enable row level security;
alter table public.room_receivers enable row level security;
alter table public.participants   enable row level security;
alter table public.requests       enable row level security;

revoke all on public.rooms, public.room_receivers, public.participants, public.requests
  from anon, authenticated;

-- Realtime change feed (used by the server adapter; clients refetch on change).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.participants, public.requests;
  end if;
end;
$$;
