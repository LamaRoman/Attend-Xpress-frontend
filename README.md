# Smart Attendance — Frontend

Next.js 16 web client for the Smart Attendance system. Pairs with the
Express + Prisma API in `../backend`.

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure the backend URL:**

   Create `.env.local` and set the API base URL the client should call:

   ```
   NEXT_PUBLIC_API_URL=http://localhost:5001
   ```

   Defaults to `http://localhost:5001` if unset, which matches the
   backend's local dev port.

3. **Start the backend** (separate terminal — see `../backend` for its
   own setup).

4. **(Optional) Point at a self-hosted OSRM:**

   The admin route-replay map snaps GPS pings to actual roads via OSRM.
   By default it uses the public demo at `router.project-osrm.org`,
   which is fine for local development but rate-limits aggressively and
   has no SLA. For production, stand up your own OSRM instance and set:

   ```
   NEXT_PUBLIC_OSRM_URL=https://osrm.your-domain.com
   ```

   in `.env.local` (dev) or your deployment environment (prod). See
   `infra/osrm/README.md` for a Docker-based deployment guide.

   Note: this URL is also baked into the CSP `connect-src` directive at
   build time (`next.config.ts`), so if you change it you must rebuild.

5. **Start the dev server:**

   ```bash
   npm run dev
   ```

   The app runs on `http://localhost:3000`.

## Scripts

- `npm run dev` — Next.js dev server (binds `0.0.0.0` so other devices
  on the network can scan QR codes against it).
- `npm run build` — production build.
- `npm run start` — serve the production build.
- `npm run lint` / `npm run lint:fix` — ESLint.
- `npm run format` / `npm run format:check` — Prettier.

## Routing & auth

Auth is enforced by `src/proxy.ts` (Next.js 16 renamed `middleware.ts`
to `proxy.ts`). Routes are split into:

- **Public:** `/`, `/checkin`, `/scan`, `/reset-password`, `/c/*`
- **Auth-only:** `/login`
- **Protected:** `/admin`, `/employee`, `/users`, `/settings`,
  `/payroll`, `/leaves`, `/holidays`, `/my-info`, `/super-admin`

Protected routes redirect to `/login?redirect=…` when the `token`
cookie is missing. The cookie is set by the backend on successful
login; the frontend never reads or writes it directly.

## Architecture notes

- No Prisma or DB code lives here — all persistence is in `../backend`.
- All API calls go through `src/lib/api.ts`, which auto-prefixes
  `/api/` paths to `/api/v1/` for backend versioning.
- Translations live in `src/lib/i18n.ts`. Use `t(key, language)`.
