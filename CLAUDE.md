# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RISE Counselor Portal — a Next.js 16 (App Router) internal dashboard for RISE's team, partners (education counselors), and mentors. All data lives in Airtable (multiple bases); there is no application database. Auth is cookie-based per role, no external auth provider.

## Commands

```bash
npm run dev      # next dev --webpack (start dev server)
npm run build    # next build
npm run start    # next start (serve production build)
npm run lint      # eslint
```

There is no test suite configured in this repo.

## Architecture

### Secret-path routing + role-based access (middleware)

Team/admin routes are not under a fixed path — they're gated by a secret path segment matched against env vars, enforced in [src/middleware.ts](src/middleware.ts):

- `/{DASHBOARD_SECRET}/...` → CEO/admin role, requires `ceo_auth` cookie.
- `/{USER_SECRET}/...` → team role, requires `team_auth` cookie, and is further restricted by the `team_employee_types` cookie (e.g. only "Mentor Success" employees can access `/mentor-pipeline`; everyone else is redirected to `/student-pipeline`).
- Any other first path segment passes through untouched (this is how `/api/*`, `/partner/*`, and Next internals stay reachable).

[src/app/[secret]/layout.tsx](src/app/[secret]/layout.tsx) re-validates the secret against `DASHBOARD_SECRET`/`USER_SECRET` server-side (404s otherwise) and reads the pathname forwarded via the `x-pathname` request header (set in middleware) to decide whether to render the shared `NavBar`.

Partners have a separate, non-secret path: `/partner/[slug]` gated by its own `partner_auth` cookie (set per-counselor by slug, see below) — see [src/components/PartnerLoginGate.tsx](src/components/PartnerLoginGate.tsx).

### Three parallel auth flows, one pattern

Each role has its own login API route under `src/app/api/auth/`, all following the same shape: validate credentials against Airtable data (not a users table — e.g. team login checks the Contacts base's Team table), then set an httpOnly cookie the middleware/layouts check.

- `team-login` — email/password against Airtable's Team table; sets `team_auth` (name) + `team_employee_types`.
- `ceo-login` / `ceo-partner-login` — password against `DASHBOARD_PASSWORD` / admin-view-of-partner.
- `partner-login` / `partner-set-password` — password stored per-counselor in Airtable (`Partner Password` field); sets `partner_auth` as a comma-joined set of counselor IDs (so one browser can be logged into multiple partner accounts at once).

When adding a new protected area, decide which of these three cookie/role systems it belongs to rather than inventing a fourth.

### Airtable as the data layer

[src/lib/airtable.ts](src/lib/airtable.ts) is the single fetch/cache/mutate layer for all Airtable access — everything else in `src/lib/` (`counselors.ts`, `students.ts`, `conversations.ts`, `analytics.ts`, etc.) calls into it rather than hitting the Airtable REST API directly.

- `fetchAllRecords(baseId, tableId, options)` auto-paginates and is wrapped per-`(baseId, tableId)` in `unstable_cache` (60s revalidate, tagged `airtable:{baseId}:{tableId}`). The wrapper is memoized in a module-level `Map` because `unstable_cache` tags are fixed at wrap time — don't call `unstable_cache` inline per-request.
- `createRecord` / `updateRecord` / `deleteRecord` all call `revalidateTag` on that table's tag after mutating, so cached reads self-invalidate.
- Base IDs and table IDs are hardcoded constants at the top of each `lib/*.ts` file (e.g. `COUNSELOR_DB_BASE`, `STUDENT_PIPELINE_BASE` in [src/lib/counselors.ts](src/lib/counselors.ts)) — there are multiple distinct Airtable bases in play (Counselor DB, Student Pipeline, Contacts). Check which base/table a feature needs before assuming they're unified.
- `getField<T>(record, fieldName)` reads Airtable's raw field-name-keyed `fields` object; domain code maps these into the typed shapes in [src/lib/types.ts](src/lib/types.ts) (`Counselor`, `Student`, `Contact`, `Conversation`, `PartnerData`).

### Mixmax refresh: fan-out via QStash + Redis, not a long request

Mixmax sequence/recipient data is too slow to fetch in one serverless invocation, so it's refreshed as a chunked background chain instead of a single API call:

1. `startMixmaxRefresh()` ([src/lib/mixmax-refresh.ts](src/lib/mixmax-refresh.ts)) lists all sequences (cheap), seeds Upstash Redis (`mixmax:sequences`, `mixmax:partial`, `mixmax:progress`), and enqueues the first chunk via Upstash QStash to `/api/mixmax/process-chunk`.
2. Each `/api/mixmax/process-chunk` invocation processes one chunk and re-publishes itself via QStash for the next chunk, until done.
3. `/api/mixmax/status` and the `useMixmaxRefresh` hook ([src/lib/hooks/useMixmaxRefresh.ts](src/lib/hooks/useMixmaxRefresh.ts)) poll Redis progress for the UI.
4. If a chain is already in flight (`SEQUENCES_KEY` set in Redis), `startMixmaxRefresh` is a no-op — it does **not** reset state, since that would race a running chain. Both the daily cron ([src/app/api/cron/mixmax/route.ts](src/app/api/cron/mixmax/route.ts)) and the manual refresh button trigger the same function; only one chain runs at a time.

Cron endpoints (`/api/cron/*`) authenticate via `Authorization: Bearer {CRON_SECRET}`, matching the schedule in [vercel.json](vercel.json) (Vercel Cron).

### Route structure

- `src/app/[secret]/` — team/admin dashboard: `calendar-bookings`, `mentor-pipeline` (mentors + writing coaches, each with interview sub-flows), `student-pipeline` (funnel stages: parent-discovery → shortlisting → interview-stage → acceptance), `insights`, `partners`, `dashboard`. Nested `layout.tsx` files provide sub-tab navigation (`SubTabNav.tsx`/`TabNav.tsx`) per section; `past`/`upcoming` splits are a recurring pattern for interview/booking lists.
- `src/app/partner/[slug]/` — partner-facing pages (separate from the secret-gated dashboard), keyed by counselor slug.
- `src/app/api/` — route handlers; mirrors the `lib/` domain split (`auth/`, `calcom/`, `mixmax/`, `cron/`, `counselors/`, `student-pipeline/`, etc.).
- `src/lib/` — all data access, business logic, and cross-cutting utilities (Airtable, analytics/funnel calculations, health checks, email/meeting-feedback, program-team lookups). UI components should not talk to Airtable directly — go through `lib/`.

### Other integrations

- **Cal.com** (`src/app/api/calcom/`) — booking data (`CALCOM_API_KEY`).
- **Google/Gmail** (`GOOGLE_CLIENT_ID/SECRET`, `GMAIL_*`) — used for sending emails (e.g. mentor contracts, MOUs) via `nodemailer`.
- **docx-templates** — generates MOU/contract documents (`src/app/api/counselors/mou/generate`, `src/app/api/mentor-contract`, `src/app/api/wc-contract`) from Airtable data, with a PDF conversion step (`PDF_CONVERT_API_KEY`).
- **fuse.js** — fuzzy search (e.g. duplicate-lead detection, partner search).
- **recharts** — all dashboard charts under `src/components/dashboard/`.

### Env vars

No `.env.example` is checked in (`.env*` is gitignored). Required vars are discoverable via `process.env.*` references throughout `src/`: `AIRTABLE_TOKEN`, `AIRTABLE_COUNSELOR_TOKEN`, `DASHBOARD_SECRET`, `USER_SECRET`, `DASHBOARD_PASSWORD`, `PARTNER_PASSWORD`, `CRON_SECRET`, `MIXMAX_API_KEY`, `QSTASH_TOKEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CALCOM_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `GMAIL_REFRESH_TOKEN`, `GMAIL_FROM`, `NOTIFY_EMAIL`, `PDF_CONVERT_API_KEY`, `NEXT_PUBLIC_BASE_URL`.

### Path alias

`@/*` maps to `src/*` (see [tsconfig.json](tsconfig.json)).
