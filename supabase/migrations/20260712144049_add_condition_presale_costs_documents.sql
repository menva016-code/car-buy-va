DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appraisals' AND column_name='car_condition_comment') THEN
    ALTER TABLE appraisals
      ADD COLUMN car_condition_comment text,
      ADD COLUMN car_condition_pdf_url text,
      ADD COLUMN presale_costs jsonb DEFAULT '[]';
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_select_documents" ON storage.objects;
CREATE POLICY "anon_select_documents" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "anon_insert_documents" ON storage.objects;
CREATE POLICY "anon_insert_documents" ON storage.objects FOR INSERT
TO anon, authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "anon_update_documents" ON storage.objects;
CREATE POLICY "anon_update_documents" ON storage.objects FOR UPDATE
TO anon, authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "anon_delete_documents" ON storage.objects;
CREATE POLICY "anon_delete_documents" ON storage.objects FOR DELETE
TO anon, authenticated USING (bucket_id = 'documents');
