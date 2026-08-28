/*
 * Release-only guardrail. This is intentionally separate from ordinary CI:
 * feature branches may legitimately contain an unregistered store app, but a
 * production build may not be created around placeholder signing metadata.
 *
 * Run with `npm run release:check`. In the release environment set
 * RELEASE_REQUIRE_ENV=1 as well, which verifies the two public build values
 * and the EAS project id without ever printing their values.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];

function requireText(relative, pattern, message) {
  if (!pattern.test(read(relative))) failures.push(message);
}

function forbidText(relative, pattern, message) {
  if (pattern.test(read(relative))) failures.push(message);
}

function forbidPath(relative, message) {
  if (fs.existsSync(path.join(root, relative))) failures.push(message);
}

requireText('src/context/AppContext.js', /const DEMO_MODE = typeof __DEV__ !== 'undefined' && __DEV__;/,
  'Mobile demo data is no longer guarded exclusively by __DEV__.');
requireText('backend/src/seed-cars.js', /NODE_ENV === 'production' && process\.env\.SEED_DEMO_DATA !== 'true'/,
  'Sale seed script is missing its production guard.');
requireText('backend/src/seed-rentals.js', /NODE_ENV === 'production' && process\.env\.SEED_DEMO_DATA !== 'true'/,
  'Rental seed script is missing its production guard.');
requireText('app.config.js', /targetSdkVersion: 36/,
  'Android target SDK 36 is not configured.');
forbidText('eas.json', /REPLACE_WITH_APP_STORE_CONNECT_APP_ID/,
  'eas.json still contains the App Store Connect app ID placeholder.');
forbidText('web/public/.well-known/assetlinks.json', /REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT/,
  'assetlinks.json still contains the Play App Signing fingerprint placeholder.');
forbidText('web/public/.well-known/apple-app-site-association', /REPLACE_WITH_APPLE_TEAM_ID/,
  'apple-app-site-association still contains the Apple Team ID placeholder.');
requireText('src/screens/SellerContactScreen.js', /Direct-deal marketplace notice/,
  'Mobile seller contact is missing the direct-deal acknowledgement.');
requireText('src/screens/RentalInquiryScreen.js', /not a confirmed booking/,
  'Mobile rental inquiries are missing the independent-provider notice.');
forbidPath('src/screens/CheckoutScreen.js', 'The retired mobile purchase checkout still exists.');
forbidPath('src/screens/RentalBookingScreen.js', 'The retired mobile rental booking/checkout still exists.');
forbidPath('src/api/handovers.js', 'The retired mobile handover API still exists.');
forbidPath('src/api/disputes.js', 'The retired transaction-dispute API still exists.');

// Templates are committed, production credentials are not. Catch the two
// provider formats that were accidentally added to environment examples so a
// release cannot normalise secret leakage as a routine configuration change.
for (const relative of ['.env.production.template', 'backend/.env.example']) {
  forbidText(relative, /re_[A-Za-z0-9_-]{20,}/,
    `${relative} contains a Resend API key; revoke it and keep the replacement outside Git.`);
  forbidText(relative, /cloudinary:\/\/[^\s#]+:[^\s#]+@[^\s#]+/,
    `${relative} contains Cloudinary credentials; revoke them and keep the replacement outside Git.`);
}

// ─── Over-the-air updates actually reach somebody ───────────────────────────
//
// Publishing goes to an EAS Update BRANCH; an installed app subscribes to a
// CHANNEL declared in its build profile. This repo shipped for months with the
// workflow publishing to branch `production` and no build profile naming a
// channel at all — so nothing was subscribed and every update went nowhere,
// silently, with a green workflow each time.
//
// Nothing else would have caught it: the publish succeeds, the dashboard shows
// the update, and only a user's phone knows it never arrived.
{
  const eas = JSON.parse(read('eas.json'));
  for (const profile of ['production', 'preview']) {
    const channel = eas.build?.[profile]?.channel;
    if (!channel) {
      failures.push(
        `eas.json build.${profile} declares no "channel", so builds from it subscribe to no `
        + 'update branch and published OTA updates will reach nobody.'
      );
    }
  }

  const config = read('app.config.js');
  if (!/updates:\s*\{/.test(config) || !/u\.expo\.dev/.test(config)) {
    failures.push('app.config.js has no updates.url, so the app has no update server to ask.');
  }
  if (!/policy:\s*'appVersion'/.test(config)) {
    failures.push("app.config.js runtimeVersion policy is not 'appVersion'; OTA compatibility is undefined.");
  }
  // A published bundle referencing a module the installed binary lacks crashes
  // on launch, so the runtime has to be able to check and apply updates itself.
  const pkg = JSON.parse(read('package.json'));
  if (!pkg.dependencies?.['expo-updates']) {
    failures.push('expo-updates is not a dependency, so no build can receive an update.');
  }
  requireText('src/utils/updates.js', /checkForUpdateAsync/,
    'src/utils/updates.js does not check for updates; the update pipeline has no runtime half.');
  requireText('App.js', /UpdateBanner/,
    'App.js does not mount UpdateBanner, so a downloaded update is never offered to the user.');
}

if (process.env.RELEASE_REQUIRE_ENV === '1') {
  for (const name of ['EAS_PROJECT_ID', 'EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_SITE_URL']) {
    if (!process.env[name]) failures.push(`${name} is not set for the production release environment.`);
  }
}

if (failures.length) {
  console.error('Release preflight failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Release preflight passed.');
