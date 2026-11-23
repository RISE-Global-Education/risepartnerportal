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
npm test         # vitest run
```

There is a small Vitest suite (`src/lib/*.test.ts`) covering the invoice logic that is costly to get wrong: bill ID parsing and matching, the reconcile cutoff guard, referral rate parsing, and the monthly date maths. Everything else is untested. Tests import only pure modules (no Drive or database), which is why the cutoff lives in its own [invoice-cutoff.ts](src/lib/invoice-cutoff.ts).

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

### Counselor invoices (Supabase + Google Drive)

The partner page has two tabs (`?tab=pipeline` and `?tab=invoices`), but the Invoices tab only exists for partners with a referral rate: the Counselor database's `Referral Amount` must be above 0 ([referral-rate.ts](src/lib/referral-rate.ts)). For partners at 0% or with no rate the tab bar is not shown at all (the page looks as it did before invoices), a link to `?tab=invoices` falls back to the pipeline, and no bills are created for them. Invoices live in `counselor_invoices` (created by [scripts/create-counselor-invoices.sql](scripts/create-counselor-invoices.sql), applied by hand), separate from the LMS `invoices` table, which holds mentor and writing coach bills and is reconciled by the LMS backend. A bill's `bill_id` is the counselor ID and the month its period ends in, e.g. `PR1126_November2026`: unique, needs no numbering, and is also the Drive file name. The whole format lives in [bill-id.ts](src/lib/bill-id.ts).

- [counselor-invoices.ts](src/lib/counselor-invoices.ts) is the data layer. Client-bound data says whether a file exists, never which Drive file it is.
- [drive-invoices.ts](src/lib/drive-invoices.ts) walks the shared folder (one subfolder per month) read-only and downloads files. [counselor-invoice-reconcile.ts](src/lib/counselor-invoice-reconcile.ts) matches file names to bill IDs (case-insensitive, tolerating a space, `_` or `-` between month and year), ignores files created before `INVOICES_RECONCILE_FROM` (fails closed if unset or invalid), and marks matched bills Paid idempotently.
- `POST /api/cron/reconcile-counselor-invoices` is called daily by Supabase `pg_cron` at 9 AM IST (03:30 UTC, no daylight saving to account for; the SQL also checks the India hour). It needs the `x-cron-secret` header to equal `CRON_WEBHOOK_SECRET`.
- `GET /api/invoices/[billId]/file` streams the PDF. Authorization runs before any Drive call ([partner-access.ts](src/lib/partner-access.ts)): the matching `partner_auth` counselor, `ceo_partner_auth`, or `ceo_auth`. Everyone else gets 404. The same rule as the partner page applies: a partner who has set a password must be logged in to it (the page's login gate), and a partner with no password has an open page, so the Invoices tab and downloads are open too. "Has set a password" is read from the same Airtable `Partner Password` field the page uses.
- **Billing periods run from the 26th to the 26th** (read in IST, `Asia/Kolkata`, start inclusive, end exclusive, so a period runs from 12:00 AM IST on the 26th to 12:00 AM IST on the next 26th) and are named after the month they end in: `November 2026` is October 26 to November 26, raised on November 26. The rules live in [bill-id.ts](src/lib/bill-id.ts) (`billLabelForInstant`, `lastClosedBillLabel`). `scripts/generate-counselor-invoices.mjs` mirrors `billLabelForInstant`, so keep the two in step.
- Student count and referral % come from the RISE LMS Airtable student table ([referral-months.ts](src/lib/referral-months.ts)), read directly and NOT through a view: the view it used to read was an email-sending queue (students left it once their email was marked Sent), so counts would have shrunk over time. The base and table come from `AIRTABLE_REFERRAL_BASE_ID` and `AIRTABLE_REFERRAL_TABLE_ID`, required with no defaults and a loud error if missing (the Airtable layer silently returns nothing on an auth failure, which would show 0 students). Every student with a counselor counts, with no other filter. One row per student: each is assigned to a bill by its "Record Created" time, grouped by counselor PR code (parsed from "Counselor Name"). Student count is the row count, the rate is that row's "Referral %". A counselor's rate on the student rows matches the Counselor database's `Referral Amount` (checked against live data).
- Bills are created automatically: `POST /api/cron/generate-counselor-invoices` runs on the 26th of each month (pg_cron, 9 AM IST, same secret as the reconciler) and inserts one Pending bill per counselor with students and a referral rate above 0 in the period that just ended ([counselor-invoice-generate.ts](src/lib/counselor-invoice-generate.ts)). Existing bills are skipped, so a repeat run creates nothing. A body of `{"month": "November 2026"}` backfills a specific bill. [scripts/generate-counselor-invoices.mjs](scripts/generate-counselor-invoices.mjs) is the manual version: it reads Airtable and writes a reviewable `.sql` file, never touching the database.

- **Paid email:** at the end of each reconcile run, [counselor-invoice-emails.ts](src/lib/counselor-invoice-emails.ts) emails the counselor (the `email` on their row in the Supabase `counselors` table, read fresh via `getCounselorEmails`; it may hold several addresses) once a bill is Paid with its file, with a link to the Invoices tab; the subject and body are the RISE team's own wording, fixed in [invoice-email-content.ts](src/lib/invoice-email-content.ts) (the subject has non-ASCII dashes, so [mime.ts](src/lib/mime.ts) RFC 2047 encodes it). It sends through [gmail.ts](src/lib/gmail.ts) with its own dedicated credentials (`INVOICE_GMAIL_*`), separate from the ones `/api/send-email` uses, so the two can be different Gmail accounts. Nothing is sent, or marked sent, while `NEXT_PUBLIC_BASE_URL` is unset, because the email is useless without its link. Safeguards: off unless `INVOICE_EMAILS_ENABLED=true`; `INVOICE_EMAIL_TEST_TO` redirects every email to a test address and marks nothing as sent; each bill is claimed via `paid_email_sent_at` before sending so it is emailed at most once (a failed send releases the claim and retries next run); only bills paid on or after `INVOICES_RECONCILE_FROM` are considered.

Env vars (none have defaults): `AIRTABLE_REFERRAL_BASE_ID`, `AIRTABLE_REFERRAL_TABLE_ID`; Drive: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN` (needs `drive.readonly`), `GOOGLE_DRIVE_INVOICES_FOLDER_ID`, `INVOICES_RECONCILE_FROM` (ISO 8601); `CRON_WEBHOOK_SECRET`; paid email: `INVOICE_GMAIL_CLIENT_ID`, `INVOICE_GMAIL_CLIENT_SECRET`, `INVOICE_GMAIL_REFRESH_TOKEN`, `INVOICE_GMAIL_FROM`, `INVOICE_EMAILS_ENABLED` and optionally `INVOICE_EMAIL_TEST_TO`; the email link uses the existing `NEXT_PUBLIC_BASE_URL`. These names are deliberately distinct from the older `GOOGLE_CLIENT_ID/SECRET`, `GMAIL_REFRESH_TOKEN` and `GMAIL_FROM`, which keep serving `/api/send-email` unchanged.

### Other integrations

- **Cal.com** (`src/app/api/calcom/`) — booking data (`CALCOM_API_KEY`).
- **Google/Gmail** (`GOOGLE_CLIENT_ID/SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_FROM`) — used for sending emails (e.g. mentor contracts, MOUs) via `googleapis` (`src/app/api/send-email/`). The counselor invoice emails and Drive use separate, prefixed variables; see "Counselor invoices".
- **docx-templates** — generates MOU/contract documents (`src/app/api/counselors/mou/generate`, `src/app/api/mentor-contract`, `src/app/api/wc-contract`) from Airtable data, with a PDF conversion step (`PDF_CONVERT_API_KEY`).
- **fuse.js** — fuzzy search (e.g. duplicate-lead detection, partner search).
- **recharts** — all dashboard charts under `src/components/dashboard/`.

### Env vars

No `.env.example` is checked in (`.env*` is gitignored). Required vars are discoverable via `process.env.*` references throughout `src/`: `AIRTABLE_TOKEN`, `AIRTABLE_COUNSELOR_TOKEN`, `DASHBOARD_SECRET`, `USER_SECRET`, `DASHBOARD_PASSWORD`, `PARTNER_PASSWORD`, `CALCOM_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_FROM`, `PDF_CONVERT_API_KEY`, `NEXT_PUBLIC_BASE_URL`, `SUPABASE_DB_URL`.

`SUPABASE_DB_URL` is the LMS Postgres connection string (Supabase → Project Settings → Database → Connection string). It is read at runtime by [lms-db.ts](src/lib/lms-db.ts) and by [scripts/inspect-lms-schema.mjs](scripts/inspect-lms-schema.mjs). `SUPABASE_URL` is accepted as a fallback only because that is where the connection string was first configured; no Supabase API key of any kind is needed, since the connection authenticates as the table owner.

### Path alias

`@/*` maps to `src/*` (see [tsconfig.json](tsconfig.json)).
