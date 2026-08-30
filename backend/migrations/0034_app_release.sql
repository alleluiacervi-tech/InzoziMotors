-- What the newest installable build is, and what the oldest usable one is.
--
-- Over-the-air updates carry JavaScript. They cannot carry a native module, a
-- permission change, an SDK bump or a new `version` — those need a binary from
-- the store. The app had no concept of that: nothing in the tree knew a newer
-- BUILD could exist, so somebody on a stale binary was stuck silently.
--
-- This row is how an operator says "there is a newer build, here is where to
-- get it", and — via ota_paused — how they stop over-the-air publishing from
-- the admin console without a GitHub account or a deploy.
--
-- editable = TRUE. Nothing here re-enables a regulated capability; the policy
-- rails from 0019 stay locked. Validation lives in src/lib/app-release.js,
-- which refuses a min_supported_version newer than latest_version — the one
-- mistake here that cannot be undone from inside the app.
--
-- The store URLs start EMPTY on purpose, matching APP.storesLive elsewhere in
-- the tree: until the app is really on a store there is nowhere to send anyone,
-- and an empty url makes both the prompt and the hard block inert.
INSERT INTO platform_settings (key, value, description, editable) VALUES
  ('app_release',
   '{"ios":{"latest_version":"1.0.0","min_supported_version":"1.0.0","url":""},"android":{"latest_version":"1.0.0","min_supported_version":"1.0.0","url":""},"release_notes":"","ota_paused":false,"ota_pause_reason":""}'::jsonb,
   'Newest installable app build per platform, the oldest still allowed to run, and the over-the-air publishing stop switch.',
   TRUE)
ON CONFLICT (key) DO NOTHING;
