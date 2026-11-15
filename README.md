# PingQue

Touch-based real-time signaling for teams. A host creates a room, participants join without signup (link, QR, or code), tap preset requests, and see their status (접수됨 → 확인됨 → 완료). Korean-first UI, dark by default.

Stack: Next.js (App Router) + TypeScript + Tailwind. Storage is behind a `RoomStore` interface with an in-memory adapter (zero configuration) and a Supabase adapter (Postgres + Realtime).

## Run it

```bash
npm install
npm run dev:lan        # next dev -H 0.0.0.0
```

### Test at home with several devices (MacBook host, iPhone/iPad participants)

1. Put all devices on the same Wi-Fi.
2. Start the server with `npm run dev:lan` (listens on all interfaces, port 3000).
3. Find the Mac's LAN IP, e.g. `ipconfig getifaddr en0` → `192.168.0.5`.
4. **On the Mac, open `http://192.168.0.5:3000`** (not `localhost`) and create a room. The join link and QR code are built from the address in the browser bar, so with `localhost` they would not work on phones.
5. Scan the QR code with the iPhone/iPad (or type the 6-character code on the home page).

Notes for plain-http LAN testing:

- Wake Lock (keeps the host screen on) and the clipboard API need HTTPS; over `http://192.168…` the host screen falls back to a "keep this screen on" hint. Turn off auto-lock on the host device.
- iOS Safari has no `navigator.vibrate`, so there is no haptic feedback on iPhone/iPad yet.
- The in-memory store lives in the server process: restarting the dev server drops all rooms.
- `next.config.ts` sets `allowedDevOrigins` for common private ranges (`192.168.*.*`, `10.*.*.*`, `172.*.*.*`, `*.local`) so the dev server accepts requests from other devices.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `npm run dev:lan` | Dev server (localhost only / all interfaces) |
| `npm run build` / `npm start` | Production build / server (`npm run start:lan` for all interfaces) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (request/status logic, idempotency, rate limit, capacity, expiry) |

## Behavior and limits

All tunables live in `src/lib/config.ts`:

- `ROOM_TTL_MINUTES = 30` – room lifetime (single constant)
- `MAX_PARTICIPANTS = 10`
- `REQUEST_RATE_LIMIT_MS = 1000` – per device
- `UNDO_WINDOW_MS = 5000`

Requests carry a client-generated UUID; retrying with the same id never creates a duplicate. Only the host can mark requests confirmed/done; participants can cancel their own active requests (which is also what "undo" does). Participants only ever see their own requests.

## Storage adapters

`src/lib/store/types.ts` defines `RoomStore`. `getStore()` (`src/lib/store/index.ts`) picks the adapter from env vars:

- **Memory (default):** no configuration.
- **Supabase:** set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (see `.env.example`), and apply `supabase/migrations/*.sql` to the project. `PINGQUE_STORE=memory|supabase` forces a choice.

Never commit real keys; `.env*` files other than `.env.example` are git-ignored. The Supabase schema enables RLS on every table with no public policies: the server uses the service-role key and authenticates devices with opaque per-device tokens (only SHA-256 hashes are stored). Capacity, expiry, rate limit and status transitions are also enforced by database triggers.

## Layout

- `src/lib/domain` – pure rules (templates, transitions, validation)
- `src/lib/store` – `RoomStore` interface, memory and Supabase adapters
- `src/app/api/rooms/**` – route handlers (REST + an SSE "changed" signal; clients refetch their own authorized snapshot)
- `src/components` – host, participant and join screens
- `supabase/migrations` – SQL schema
