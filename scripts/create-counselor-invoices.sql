-- Run once in the Supabase SQL editor. Safe to re-run.
-- Student count and referral % are NOT stored here. The portal reads them from
-- the Airtable referral view by counselor and month.
-- Backs the Invoices tab on the partner portal (counselor referral invoices).
-- This is separate from the LMS "invoices" table, which holds mentor and
-- writing coach bills and is reconciled by the LMS backend.

CREATE TABLE IF NOT EXISTS counselor_invoices (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_id               text NOT NULL,                 -- counselor ID and month, e.g. PR1126_October2026, also the Drive file name
  counselor_id          text NOT NULL,                 -- matches counselors.id
  billing_month         text NOT NULL,                 -- e.g. October 2026, must match the Month text in the Airtable referral view
  payment_status        text NOT NULL DEFAULT 'Pending'
                        CHECK (payment_status IN ('Pending', 'Processing', 'Paid')),
  paid_at               timestamptz,
  invoice_drive_file_id text,
  invoice_file_name     text,
  invoice_uploaded_at   timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Bill IDs are unique, case-insensitively. The reconciler upper-cases the ID
-- it pulls out of a file name before looking it up.
CREATE UNIQUE INDEX IF NOT EXISTS counselor_invoices_bill_id_key
  ON counselor_invoices (upper(bill_id));

CREATE INDEX IF NOT EXISTS counselor_invoices_counselor_id_idx
  ON counselor_invoices (counselor_id);

-- Match the other portal tables: RLS on, no policies (the portal connects as owner).
ALTER TABLE counselor_invoices ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Daily reconciliation trigger (Supabase pg_cron + pg_net).
--
-- Before this works, create two vault secrets (Project Settings > Vault, or
-- vault.create_secret):
--   portal_base_url  the address of this portal, e.g. https://your-portal-domain
--                    It MUST be the host that serves the Next.js app and its
--                    /api routes, not a marketing or static site (a POST there
--                    returns HTTP 405).
--   portal_cron_secret  any long random string. Set the SAME value as the
--                    CRON_WEBHOOK_SECRET environment variable on the portal.
--
-- pg_cron runs in UTC. 9:00 AM Pacific is 16:00 UTC in summer and 17:00 UTC in
-- winter, so the job fires at both hours and the function returns at once
-- unless it is currently 9 o'clock in Los Angeles.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION reconcile_counselor_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret   text;
  base_url text;
BEGIN
  IF EXTRACT(hour FROM (now() AT TIME ZONE 'America/Los_Angeles')) <> 9 THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO secret
    FROM vault.decrypted_secrets WHERE name = 'portal_cron_secret';
  SELECT decrypted_secret INTO base_url
    FROM vault.decrypted_secrets WHERE name = 'portal_base_url';

  IF secret IS NULL OR base_url IS NULL THEN
    RAISE WARNING 'reconcile_counselor_invoices: vault secrets portal_cron_secret and portal_base_url must both exist';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(base_url, '/') || '/api/cron/reconcile-counselor-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
END;
$$;

SELECT cron.schedule(
  'reconcile-counselor-invoices',
  '0 16,17 * * *',
  $$SELECT reconcile_counselor_invoices();$$
);

-- ---------------------------------------------------------------------------
-- Monthly bill creation. On the 1st of each month the portal creates one
-- Pending bill (PR1126_October2026 style) for every counselor who referred
-- students in the month that just ended. Uses the same two vault secrets.
-- 16:00 and 17:00 UTC cover 9:00 AM Pacific in summer and winter; the function
-- returns at once unless it is currently 9 o'clock in Los Angeles.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_counselor_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret   text;
  base_url text;
BEGIN
  IF EXTRACT(hour FROM (now() AT TIME ZONE 'America/Los_Angeles')) <> 9 THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO secret
    FROM vault.decrypted_secrets WHERE name = 'portal_cron_secret';
  SELECT decrypted_secret INTO base_url
    FROM vault.decrypted_secrets WHERE name = 'portal_base_url';

  IF secret IS NULL OR base_url IS NULL THEN
    RAISE WARNING 'generate_counselor_invoices: vault secrets portal_cron_secret and portal_base_url must both exist';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(base_url, '/') || '/api/cron/generate-counselor-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
END;
$$;

SELECT cron.schedule(
  'generate-counselor-invoices',
  '0 16,17 1 * *',
  $$SELECT generate_counselor_invoices();$$
);
