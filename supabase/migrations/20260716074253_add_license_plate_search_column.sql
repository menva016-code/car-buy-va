-- Add a generated column that stores the license plate with spaces removed
-- so that searching "А111АА193" matches a stored "А 111 АА 193"
ALTER TABLE appraisals ADD COLUMN IF NOT EXISTS license_plate_search text
  GENERATED ALWAYS AS (
    CASE
      WHEN license_plate IS NOT NULL
        THEN lower(regexp_replace(license_plate, '\s+', '', 'g'))
      ELSE NULL
    END
  ) STORED;

-- Index for faster search
CREATE INDEX IF NOT EXISTS idx_appraisals_plate_search
  ON appraisals (license_plate_search);