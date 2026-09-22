# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RISE Counselor Portal — a Next.js 16 (App Router) internal dashboard for RISE's team, partners (education counselors), and mentors. Most data lives in Airtable (multiple bases); there is no application database of its own. The exception is student *progress* (session feedback, bookings, assigned mentor/coach), which now comes from the Supabase-backed RISE LMS, read over a direct Postgres connection — see "RISE LMS (Supabase)" below. Auth is cookie-based per role, no external auth provider.

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

### Route structure

- `src/app/[secret]/` — team/admin dashboard: `calendar-bookings`, `mentor-pipeline` (mentors + writing coaches, each with interview sub-flows), `student-pipeline` (funnel stages: parent-discovery → shortlisting → interview-stage → acceptance), `conversations` (Insights - Conversations), `partners`, `dashboard`. Nested `layout.tsx` files provide sub-tab navigation (`SubTabNav.tsx`/`TabNav.tsx`) per section; `past`/`upcoming` splits are a recurring pattern for interview/booking lists.
- `src/app/partner/[slug]/` — partner-facing pages (separate from the secret-gated dashboard), keyed by counselor slug.
- `src/app/api/` — route handlers; mirrors the `lib/` domain split (`auth/`, `calcom/`, `counselors/`, `student-pipeline/`, etc.).
- `src/lib/` — all data access, business logic, and cross-cutting utilities (Airtable, analytics/funnel calculations, health checks, email/meeting-feedback, program-team lookups). UI components should not talk to Airtable directly — go through `lib/`.

### RISE LMS (Supabase)

Student progress — session feedback, bookings, the assigned mentor and writing coach — moved out of Airtable into the Supabase-backed RISE LMS, and the portal reads that database **directly**.

[src/lib/lms-db.ts](src/lib/lms-db.ts) is the single query/cache layer, mirroring `airtable.ts`: `query(tag, sql, params)` runs a read against a module-level `pg.Pool` and is wrapped in `unstable_cache` (60s, tagged), with the wrapper memoized in a `Map` because tags are fixed at wrap time. The pool is cached on `globalThis` so dev hot-reload does not leak pools, and capped at `max: 3` because each serverless instance holds its own and the shared pooler has finite slots.

Connecting directly authenticates as the **table owner**, which bypasses RLS — none of these tables set `FORCE ROW LEVEL SECURITY`. That is why no service key is needed. Note RLS *is* enabled on all seven tables with **zero policies**, so any other role (`anon`, `authenticated`) reads nothing at all.

Because the connection enforces nothing, authorization is entirely the route handler's job: [api/meeting-feedback](src/app/api/meeting-feedback/route.ts) verifies the student belongs to the counselor behind the slug (against Airtable) *before* any query runs. Keep that check ahead of the data calls. `lms-db.ts` is server-only and must never be imported from a client component.

Only identifiers drawn from `lms-schema.ts` are ever interpolated into SQL text; every value goes through a `$n` parameter.

**[src/lib/lms-schema.ts](src/lib/lms-schema.ts) holds every LMS table and column name.** Reading the database directly couples this repo to the LMS schema, so all of that coupling lives in one file — a renamed column is a one-line fix there, not a hunt through the data layer. Every name was verified against the live schema with [scripts/inspect-lms-schema.mjs](scripts/inspect-lms-schema.mjs); re-run it after any LMS migration. A wrong name surfaces as a Postgres `42P01` (unknown table) or `42703` (unknown column) error.

Domain wrappers: [programs.ts](src/lib/programs.ts) (resolves a pipeline student *name* → program, and joins the mentor and coach names off the same row — the only bridge between Airtable and the LMS), [program-meetings.ts](src/lib/program-meetings.ts) (all bookings, which is what upcoming sessions are derived from), [meeting-feedback.ts](src/lib/meeting-feedback.ts) (mentor + writing-coach feedback in one `UNION ALL`), [upcoming-sessions.ts](src/lib/upcoming-sessions.ts).

**Review Meet (the PM's `review_feedback` note to the counselor) is deliberately excluded from this view — not just hidden in the UI filter, but never queried.** `TABLES` in `lms-schema.ts` has no `reviewFeedback` entry and `FeedbackSource` has no `"Review Meet"` member; both were removed on purpose. If it needs to come back, re-add the table constant, the union branch in `meeting-feedback.ts`, and the filter option — don't just re-add the filter option, or the data will still be missing.

Three schema facts the code deliberately handles — don't "simplify" them away:

- **A feedback record's kind comes from its table, never from `meetings.meeting_type`.** `meeting_type` only ever takes `M` and `WC` in this database — no review meeting is booked as its own slot — so when Review Meet feedback was still read, classifying by meeting type would have labelled every review note as coach feedback. The RISE LMS integration notes advise the opposite ("classify by `meetingType`, drop the row that disagrees"); that guidance does not hold against this data.
- **One meeting legitimately carries records in both feedback tables** — 1188 meetings have both mentor and WC feedback, and no such pair shares summary text. These are distinct records, not duplicate filings, so *all* rows are kept and nothing is deduplicated. The unique index on `meeting_id` is per table, so a table can never contribute two rows for one meeting.
- **Session numbers are derived, not read from `meetings.meeting_number`.** Numbering runs per meeting type while feedback is routinely filed against a slot of the other type, so two mentor sessions can land on meetings sharing a number and both render as "Mentor Session 3". `assignSessionNumbers` counts each source's own records in date order instead.

The final mentor session has no `mentor_feedback` row — it files a structured evaluation into `final_evaluations`, which carries `program_id` directly, so it is fetched by program rather than by hunting for meetings with no feedback.

The progress modal is **partner-facing**, so `handoff_note_for_wc`, `extra_support`, `flagged_status` and `steps_taken_offtrack` are staff-only. They are left out of the SELECT lists entirely rather than filtered after the fact, so they cannot reach a counselor's browser by accident.

### Other integrations

- **Cal.com** (`src/app/api/calcom/`) — booking data (`CALCOM_API_KEY`).
- **Google/Gmail** (`GOOGLE_CLIENT_ID/SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_FROM`) — used for sending emails (e.g. mentor contracts, MOUs) via `googleapis` (`src/app/api/send-email/`).
- **docx-templates** — generates MOU/contract documents (`src/app/api/counselors/mou/generate`, `src/app/api/mentor-contract`, `src/app/api/wc-contract`) from Airtable data, with a PDF conversion step (`PDF_CONVERT_API_KEY`).
- **fuse.js** — fuzzy search (e.g. duplicate-lead detection, partner search).
- **recharts** — all dashboard charts under `src/components/dashboard/`.

### Env vars

No `.env.example` is checked in (`.env*` is gitignored). Required vars are discoverable via `process.env.*` references throughout `src/`: `AIRTABLE_TOKEN`, `AIRTABLE_COUNSELOR_TOKEN`, `DASHBOARD_SECRET`, `USER_SECRET`, `DASHBOARD_PASSWORD`, `PARTNER_PASSWORD`, `CALCOM_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_FROM`, `PDF_CONVERT_API_KEY`, `NEXT_PUBLIC_BASE_URL`, `SUPABASE_DB_URL`.

`SUPABASE_DB_URL` is the LMS Postgres connection string (Supabase → Project Settings → Database → Connection string). It is read at runtime by [lms-db.ts](src/lib/lms-db.ts) and by [scripts/inspect-lms-schema.mjs](scripts/inspect-lms-schema.mjs). `SUPABASE_URL` is accepted as a fallback only because that is where the connection string was first configured; no Supabase API key of any kind is needed, since the connection authenticates as the table owner.

### Path alias

`@/*` maps to `src/*` (see [tsconfig.json](tsconfig.json)).
