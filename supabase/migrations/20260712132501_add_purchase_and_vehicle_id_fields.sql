/*
# Add mileage, purchase fields, VIN, license plate to appraisals

## Modified Tables

### appraisals — new columns (all nullable, added to existing table):
- `vin` (text) — Vehicle Identification Number
- `license_plate` (text) — State license plate number (ГРЗ)
- `mileage` (integer) — Odometer reading in km
- `purchase_price` (numeric) — Dealer's buyout offer price (цена за сколько выкупим)
- `is_purchased` (boolean, DEFAULT false) — Whether the car was ultimately purchased

## Notes
1. `is_purchased` defaults to false so existing and new rows start as "не выкуплен".
2. All other columns are nullable since they are optional fields.
*/

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
