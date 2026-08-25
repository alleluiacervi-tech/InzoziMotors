-- Rwanda import duty rates as configurable data.
--
-- The shipped calculator hardcoded excise at 10/20/25/35% against an actual
-- 5/10/15% schedule, omitted the 5% withholding tax, and ignored the EAC
-- depreciation allowance entirely — so it overstated excise while understating
-- relief, worst on exactly the older cars most buyers here are pricing.
--
-- The RATES move into this row so a correction is data entry rather than a
-- release. The BASES each rate applies to stay in code: choosing the wrong base
-- is a modelling error, not a typo, and it should cost a review and a deploy.
--
-- editable = TRUE, unlike the policy rails in 0019. Nothing here can turn a
-- regulated capability back on; it only changes an estimate the site labels as
-- an estimate, and every payload carries reviewed_on so an unverified schedule
-- reads as unverified rather than as confident.
--
-- Mirrored into src/schema.sql in the same commit. src/lib/duty-rates.js holds
-- the same defaults, and a test asserts the two have not drifted apart.
INSERT INTO platform_settings (key, value, description, editable) VALUES
  ('import_duty_rates',
   '{"freight_insurance_pct":12,"customs_pct":25,"vat_pct":18,"withholding_pct":5,"infrastructure_pct":1.5,"excise_brackets":[{"max_cc":1500,"rate_pct":5,"label":"Under 1500cc"},{"max_cc":2500,"rate_pct":10,"label":"1500 – 2500cc"},{"max_cc":null,"rate_pct":15,"label":"Over 2500cc"}],"depreciation":[{"min_age_years":0,"allowance_pct":0},{"min_age_years":2,"allowance_pct":20},{"min_age_years":4,"allowance_pct":30},{"min_age_years":6,"allowance_pct":40},{"min_age_years":8,"allowance_pct":50},{"min_age_years":10,"allowance_pct":80}],"reviewed_on":"2026-08-25","source":"Rwanda Revenue Authority published schedules and the EAC Common External Tariff"}'::jsonb,
   'Rwanda vehicle import duty rates. Rates are editable; the bases they apply to live in src/lib/duty-rates.js.',
   TRUE)
ON CONFLICT (key) DO NOTHING;
