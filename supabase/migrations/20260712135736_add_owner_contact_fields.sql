/*
# Add owner contact fields: messengers, messenger phone, additional contact

## Modified Tables

### appraisals — new columns:
- `owner_messengers` (text[], DEFAULT '{}') — list of selected messenger apps
- `owner_messenger_phone` (text, nullable) — separate phone for messengers (null = same as owner_phone)
- `additional_contact` (jsonb, nullable) — secondary contact person:
    { name, phone, contact_type, messengers: string[], messenger_phone? }
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appraisals' AND column_name='owner_messengers') THEN
    ALTER TABLE appraisals
      ADD COLUMN owner_messengers text[] DEFAULT '{}',
      ADD COLUMN owner_messenger_phone text,
      ADD COLUMN additional_contact jsonb;
  END IF;
END $$;
