/*
# Add vehicle information fields to appraisals table + storage bucket

## Modified Tables

### appraisals
Added vehicle-specific columns to support a second step in the appraisal form.

New columns (all nullable — added to existing table):
- `make` (text) — Vehicle brand/manufacturer, e.g. Toyota
- `model` (text) — Vehicle model, e.g. Camry
- `year` (integer) — Model year of the vehicle
- `engine_volume` (text) — Engine displacement (stored as text to support values like "1.6", "2.0")
- `power_hp` (integer) — Engine power in horsepower
- `transmission` (text) — One of: automatic, manual, robot, cvt
- `drive_type` (text) — One of: front, rear, all
- `fuel_type` (text) — One of: petrol, diesel, gas, hybrid, electric
- `owner_price` (numeric) — Owner's estimated selling price
- `sts_photo_url` (text) — Public URL to the uploaded STS (vehicle registration) photo

## Storage

Creates an 'sts-photos' bucket (public) for storing STS document photos.
Policies allow anon + authenticated to read and write objects.

## Notes
1. All new columns are nullable to avoid breaking existing rows.
2. CHECK constraints added for transmission, drive_type, fuel_type to ensure valid values.
3. Storage bucket is public so photo URLs can be used directly in <img> tags.
*/

-- Add vehicle columns to appraisals
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

-- Create storage bucket for STS photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('sts-photos', 'sts-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
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
