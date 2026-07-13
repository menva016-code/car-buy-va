/*
# Create appraisal_photos table + car-photos storage bucket

## New Tables

### appraisal_photos
Stores individual photo URLs attached to an appraisal, organised by slot name.

Columns:
- `id` — UUID primary key
- `appraisal_id` — FK to appraisals(id), cascades on delete
- `slot` — Machine-readable slot name (e.g. 'front', 'left', 'body_defects')
- `url` — Public URL of the uploaded photo
- `created_at` — Insert timestamp

## Storage

Creates a public `car-photos` bucket for exterior/optics/tire/defect photos.
Policies allow anon + authenticated full CRUD on objects in this bucket.

## Notes
1. `slot` is an open text field so new photo types can be added without migrations.
2. RLS policies mirror the single-tenant pattern (anon + authenticated, USING(true)).
*/

CREATE TABLE IF NOT EXISTS appraisal_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_id uuid NOT NULL REFERENCES appraisals(id) ON DELETE CASCADE,
  slot text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appraisal_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_appraisal_photos" ON appraisal_photos;
CREATE POLICY "anon_select_appraisal_photos" ON appraisal_photos FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_appraisal_photos" ON appraisal_photos;
CREATE POLICY "anon_insert_appraisal_photos" ON appraisal_photos FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_appraisal_photos" ON appraisal_photos;
CREATE POLICY "anon_update_appraisal_photos" ON appraisal_photos FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_appraisal_photos" ON appraisal_photos;
CREATE POLICY "anon_delete_appraisal_photos" ON appraisal_photos FOR DELETE
TO anon, authenticated USING (true);

-- Storage bucket for car photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-photos', 'car-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_select_car_photos" ON storage.objects;
CREATE POLICY "anon_select_car_photos" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'car-photos');

DROP POLICY IF EXISTS "anon_insert_car_photos" ON storage.objects;
CREATE POLICY "anon_insert_car_photos" ON storage.objects FOR INSERT
TO anon, authenticated WITH CHECK (bucket_id = 'car-photos');

DROP POLICY IF EXISTS "anon_update_car_photos" ON storage.objects;
CREATE POLICY "anon_update_car_photos" ON storage.objects FOR UPDATE
TO anon, authenticated USING (bucket_id = 'car-photos') WITH CHECK (bucket_id = 'car-photos');

DROP POLICY IF EXISTS "anon_delete_car_photos" ON storage.objects;
CREATE POLICY "anon_delete_car_photos" ON storage.objects FOR DELETE
TO anon, authenticated USING (bucket_id = 'car-photos');
