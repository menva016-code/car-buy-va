/*
# Create appraisals table

Single-tenant Telegram Mini App for car appraisals. No user auth — all data
is shared/accessible via the anon key.

## New Tables

### appraisals
Stores vehicle appraisal entries submitted through the Telegram Mini App.

Columns:
- `id` — UUID primary key, auto-generated
- `owner_name` — Name of the vehicle owner
- `owner_phone` — Phone number of the owner
- `ownership_type` — Either 'individual' (физ. лицо) or 'reseller' (перекуп)
- `sale_type` — Either 'buyout' (выкуп) or 'trade_in' (трейд-ин)
- `sale_reason` — Optional free-text reason for selling
- `created_at` — Timestamp when the record was created

## Security
- RLS enabled on `appraisals`
- All four CRUD policies scoped to `anon, authenticated` (no sign-in required)
- `USING (true)` is intentional — this is a shared single-tenant app
*/

CREATE TABLE IF NOT EXISTS appraisals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name text NOT NULL,
  owner_phone text NOT NULL,
  ownership_type text NOT NULL CHECK (ownership_type IN ('individual', 'reseller')),
  sale_type text NOT NULL CHECK (sale_type IN ('buyout', 'trade_in')),
  sale_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appraisals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_appraisals" ON appraisals;
CREATE POLICY "anon_select_appraisals" ON appraisals FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_appraisals" ON appraisals;
CREATE POLICY "anon_insert_appraisals" ON appraisals FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_appraisals" ON appraisals;
CREATE POLICY "anon_update_appraisals" ON appraisals FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_appraisals" ON appraisals;
CREATE POLICY "anon_delete_appraisals" ON appraisals FOR DELETE
TO anon, authenticated USING (true);
