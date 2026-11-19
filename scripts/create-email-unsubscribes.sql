-- Run once in the Supabase SQL editor. Backs the Partners → Unsubscribed tab.
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email        text NOT NULL,
  name         text,
  company_name text,
  country      text,
  rise_poc     text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_unsubscribes_email_key
  ON email_unsubscribes (lower(email));

-- Match the other portal tables: RLS on, no policies (the portal connects as owner).
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
