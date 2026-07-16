/*
# Create app_config table for server-side secrets

1. New Tables
- `app_config`
  - `key` (text, primary key) — config key name
  - `value` (text, not null) — config value
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- RLS enabled.
- No anon/authenticated policies — only the service role (edge functions) can read/write.
  The service role bypasses RLS, so no policies are needed for it.
  Frontend (anon key) cannot access this table at all.

3. Initial Data
- TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID inserted for the send-approval edge function.
*/

CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

INSERT INTO app_config (key, value) VALUES
  ('TELEGRAM_BOT_TOKEN', '8932533843:AAEN6BioiwBSzJcCw1XYtDAEb2ie8wSKo9A'),
  ('TELEGRAM_CHAT_ID', '-5395388714')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
