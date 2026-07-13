DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appraisals' AND column_name='vin') THEN
    ALTER TABLE appraisals
      ADD COLUMN vin text,
      ADD COLUMN license_plate text,
      ADD COLUMN mileage integer,
      ADD COLUMN purchase_price numeric,
      ADD COLUMN is_purchased boolean NOT NULL DEFAULT false;
  END IF;
END $$;