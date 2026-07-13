DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appraisals' AND column_name='owner_messengers') THEN
    ALTER TABLE appraisals
      ADD COLUMN owner_messengers text[] DEFAULT '{}',
      ADD COLUMN owner_messenger_phone text,
      ADD COLUMN additional_contact jsonb;
  END IF;
END $$;