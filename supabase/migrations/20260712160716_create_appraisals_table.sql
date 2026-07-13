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