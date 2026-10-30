# Mobile app refinement delivery

30 October 2026. Preserves the existing palette, navigation destinations and customer capabilities. Implements the priority findings in [the design audit](mobile-app-audit-2026-10-30.md).

## Delivered

- Shared catalogue search now supports server pagination, stale-response protection, retained filter context and honest connection failures. Rental and offline filtering remain available.
- Saved vehicles remain visible independently of the initial browse page. Public card snapshots survive reload; unresolved vehicles stay removable and retryable. Recovery uses the public catalogue and does not manufacture detail-view counts. Successful recovery marks missing sale listings unavailable without showing an obsolete cached price. Only public card fields are persisted.
- Authentication resumes the intended customer journey, with guarded destinations, duplicate-submission protection and accessible form inputs.
- Readable price and status text, consistent cards and tabs, clearer steering-side/year labels, a brief static launch and reduced-motion onboarding improve presentation without changing brand colors. Featured vehicles remain manually swipeable.
- Mobile identity review explicitly hands staff to the authenticated web console. Document chips no longer imply evidence has been reviewed, and mobile controls no longer invite blind approval. The earlier website change keeps ID review within the staff session, rather than depending on a 15-minute document link.
- Seller submission warns before discarding edits; successful submission leaves the completed form. Removed confirmed unused review API wrapper and menu constants. Existing backend review records and active capabilities are retained.

## Validation

All checks passed on the final implementation:

- `node scripts/test-mobile-quality.mjs`: 16 utility regressions covering search, saved records, privacy and authentication continuation.
- `node scripts/verify-mobile-browser.cjs`: seven local Expo-web journey checks, including pagination beyond 20, failed search, saved recovery/reload without extra views, sign-in continuation, duplicate protection and cancel/discard behavior. Requires the local API, database fixtures, Expo web, Chromium and web workspace dependencies. Synthetic account cleanup is included.
- `npm run mobile:imports`, module-scope, undefined-reference and hook-order checks, plus `npm run release:check` and `git diff --check`.
- Expo production exports for Android, iOS and web with the production API URL. Export artifacts stayed outside the repository; no native binary or OTA update was published.
- 18 representative visual checks across Home, Cars and detail views: 320/390/768 widths, light/dark themes and English/French/Kinyarwanda. No horizontal overflow or browser JavaScript errors in those checks. Staff ID review handoff also checked.

## Remaining acceptance work

Expo web and production JavaScript exports do not certify native device behavior. Before a mobile release, test actual iOS and Android devices for maximum font scaling, VoiceOver/TalkBack, camera permissions, keyboard behavior, hardware-back/gesture navigation and performance. No claim of competitive market superiority is made without comparative research or user testing.
