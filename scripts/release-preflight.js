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

  // mobile-update.yml and mobile-build.yml split every commit between them:
  // one publishes over the air, the other cuts a binary, and each decides with
  // the SAME native-sensitive predicate. If the two ever disagree, a commit can
  // satisfy neither and reach nobody — silently, with both workflows green.
  //
  // A comment asking two files to stay in step is not a mechanism, so the
  // predicates are compared here instead.
  const predicateOf = (relative) => {
    const found = read(relative).match(/grep -qE '(\^\(package[^']*)'/);
    return found ? found[1] : null;
  };
  const publishes = predicateOf('.github/workflows/mobile-update.yml');
  const builds = predicateOf('.github/workflows/mobile-build.yml');
  if (!publishes || !builds) {
    failures.push('Could not read the native-change predicate from both mobile workflows; '
      + 'one of them may no longer route commits at all.');
  } else if (publishes !== builds) {
    failures.push(
      'mobile-update.yml and mobile-build.yml disagree about what counts as a native change, '
      + 'so some commits will be handled by neither and reach no user.\n'
      + `    publish refuses on: ${publishes}\n`
      + `    build triggers on:  ${builds}`
    );
  }
}

// ─── Photos are cached and right-sized ──────────────────────────────────────
//
// React Native's Image has no disk cache: a feed scrolled twice cost twice the
// data. Combined with the old `max-age=0` on /uploads, and with every photo
// stored only at 1600x1200, a twenty-car feed of covers came to 9.53 MB.
//
// Both halves have to stay in place for that to remain fixed, and either could
// be undone by a plausible-looking edit — swapping expo-image back for the
// react-native one, or dropping the cache policy — so both are asserted.
{
  const pkg = JSON.parse(read('package.json'));
  if (!pkg.dependencies?.['expo-image']) {
    failures.push('expo-image is not a dependency; listing photos would have no disk cache.');
  }
  requireText('src/components/Photo.js', /from 'expo-image'/,
    'src/components/Photo.js no longer uses expo-image, so photos are uncached again.');
  requireText('src/components/Photo.js', /cachePolicy="memory-disk"/,
    'src/components/Photo.js does not set cachePolicy, so a photo is re-downloaded every time it scrolls back.');
  requireText('src/utils/photo.js', /w=\$\{width\}/,
    'src/utils/photo.js no longer requests a width, so every card downloads the full-size photo.');
  requireText('backend/src/middleware/image-variants.js', /max-age=31536000/,
    'image variants are not cacheable, so the resize work repeats on every request.');
  requireText('backend/server.js', /imageVariants\(uploadDir\)/,
    'server.js does not mount imageVariants, so ?w= is ignored and full-size photos are served.');
  requireText('backend/server.js', /immutable: true/,
    'server.js serves /uploads without a cache lifetime; every phone revalidates every photo.');
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
