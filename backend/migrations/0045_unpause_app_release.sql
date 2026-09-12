-- Ensure over-the-air updates are not paused, and mark 1.0.3 as latest iOS release.
UPDATE platform_settings
SET value = jsonb_set(
  jsonb_set(value, '{ota_paused}', 'false'::jsonb),
  '{ios,latest_version}', '"1.0.3"'::jsonb
)
WHERE key = 'app_release';
