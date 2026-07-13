ALTER TABLE appraisals
  ADD COLUMN IF NOT EXISTS autoteka_url TEXT,
  ADD COLUMN IF NOT EXISTS autoteka_pdf_url TEXT;