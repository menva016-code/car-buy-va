/*
# Add owner city and deal timeline fields

1. New Columns on `appraisals`
- `owner_city` (text, nullable) — free-text city where the owner lives, entered manually.
- `deal_timeline` (text, nullable) — when the deal is planned. Constrained to three values: 'today', 'this_week', 'this_month'. NULL means not specified.

2. Notes
- Both columns are optional (nullable) so existing rows are not affected.
- `deal_timeline` uses a CHECK constraint to ensure only the three allowed values.
*/

ALTER TABLE appraisals ADD COLUMN IF NOT EXISTS owner_city text;
ALTER TABLE appraisals ADD COLUMN IF NOT EXISTS deal_timeline text
  CHECK (deal_timeline IS NULL OR deal_timeline IN ('today', 'this_week', 'this_month'));
