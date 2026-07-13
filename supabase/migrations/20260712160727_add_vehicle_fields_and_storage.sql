DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appraisals' AND column_name='make') THEN
    ALTER TABLE appraisals
      ADD COLUMN make text,
      ADD COLUMN model text,
      ADD COLUMN year integer,
      ADD COLUMN engine_volume text,
      ADD COLUMN power_hp integer,
      ADD COLUMN transmission text CHECK (transmission IN ('automatic', 'manual', 'robot', 'cvt')),
      ADD COLUMN drive_type text CHECK (drive_type IN ('front', 'rear', 'all')),
      ADD COLUMN fuel_type text CHECK (fuel_type IN ('petrol', 'diesel', 'gas', 'hybrid', 'electric')),
      ADD COLUMN owner_price numeric,
      ADD COLUMN sts_photo_url text;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sts-photos', 'sts-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_select_sts_photos" ON storage.objects;
CREATE POLICY "anon_select_sts_photos" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'sts-photos');

DROP POLICY IF EXISTS "anon_insert_sts_photos" ON storage.objects;
CREATE POLICY "anon_insert_sts_photos" ON storage.objects FOR INSERT
TO anon, authenticated WITH CHECK (bucket_id = 'sts-photos');

DROP POLICY IF EXISTS "anon_update_sts_photos" ON storage.objects;
CREATE POLICY "anon_update_sts_photos" ON storage.objects FOR UPDATE
TO anon, authenticated USING (bucket_id = 'sts-photos') WITH CHECK (bucket_id = 'sts-photos');

DROP POLICY IF EXISTS "anon_delete_sts_photos" ON storage.objects;
CREATE POLICY "anon_delete_sts_photos" ON storage.objects FOR DELETE
TO anon, authenticated USING (bucket_id = 'sts-photos');