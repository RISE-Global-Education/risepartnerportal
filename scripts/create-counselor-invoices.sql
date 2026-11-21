-- Run once in the Supabase SQL editor. Safe to re-run.
-- Student count and referral % are NOT stored here. The portal works them out
-- from the Airtable student table by counselor and billing period.
-- Backs the Invoices tab on the partner portal (counselor referral invoices).
-- This is separate from the LMS "invoices" table, which holds mentor and
-- writing coach bills and is reconciled by the LMS backend.

CREATE TABLE IF NOT EXISTS counselor_invoices (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_id               text NOT NULL,                 -- counselor ID and month, e.g. PR1126_October2026, also the Drive file name
  counselor_id          text NOT NULL,                 -- matches counselors.id
  billing_month         text NOT NULL,                 -- named after the month the 26th-to-26th period ends in, e.g. November 2026 is October 26 to November 26
  payment_status        text NOT NULL DEFAULT 'Pending'
                        CHECK (payment_status IN ('Pending', 'Processing', 'Paid')),
  paid_at               timestamptz,
  invoice_drive_file_id text,
  invoice_file_name     text,
  invoice_uploaded_at   timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- When the "your invoice is paid" email went out. Added separately from the
-- CREATE above so the script upgrades a table created by an earlier version.
ALTER TABLE counselor_invoices ADD COLUMN IF NOT EXISTS paid_email_sent_at timestamptz;

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
-- pg_cron runs in UTC. 9:00 AM IST is 03:30 UTC all year (IST has no daylight
-- saving), so the job fires at 03:30 UTC and the function double-checks that it
-- is currently 9 o'clock in India before it calls the portal.
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
  IF EXTRACT(hour FROM (now() AT TIME ZONE 'Asia/Kolkata')) <> 9 THEN
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
  '30 3 * * *',
  $$SELECT reconcile_counselor_invoices();$$
);

-- ---------------------------------------------------------------------------
-- Monthly bill creation. Billing periods run from the 26th to the 26th, so on
-- the 26th of each month the portal creates one Pending bill (PR1126_November2026
-- style, named after the month the period ends in) for every counselor who
-- referred students in the period that just ended. Uses the same two vault secrets.
-- A period ends at midnight IST on the 26th, so by 9:00 AM IST (03:30 UTC) that
-- day it is closed. The function returns at once unless it is 9 o'clock in India.
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
  IF EXTRACT(hour FROM (now() AT TIME ZONE 'Asia/Kolkata')) <> 9 THEN
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
  '30 3 26 * *',
  $$SELECT generate_counselor_invoices();$$
);
