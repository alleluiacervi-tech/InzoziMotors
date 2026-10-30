Sawa design direction

Preserve Signal Red #CC050F, paper #FBFAF8, white #FFFFFF, warm panel #F2EFEA, ink #14110F and all existing dark theme tokens. Retain self-hosted Satoshi: bold, carefully sized headings; regular body; tabular numerical data.

Homepage: [promise + compact search | large inspection/vehicle photograph], then stock, inspection standard, imports and valuation. Left-aligned text, controlled line lengths. Keep the strongest visual emphasis on actual vehicles and inspection photography, including an honest stock-photography fallback when inventory is empty.
Marketplace: [compact search and heading] above [filter rail | aligned photo-led cards]. Stronger price and vehicle hierarchy, consistent image framing. Details: gallery and facts paired with a clear contact panel. Reports look like evidence, with findings visible.
Account/admin: more distinct page headings, restrained surfaces, aligned data, visible interaction states. Verification links follow live admin authentication through the existing same-origin proxy rather than an expiring URL credential.

Critique: the skill's generated liquid-glass/scroll-story recommendation does not fit an inventory-led marketplace or the instruction to keep colors. Use restrained solid surfaces, photography and deliberate spacing. No new features, invented inventory, decorative counters, palette changes, or scroll choreography.

Implementation

- Refined the homepage hierarchy and search surface; search modes are available on phones as well as desktop.
- Aligned sales and rental cards, standardized their focus and hover states, and kept vehicle names readable over two lines.
- Rebalanced the vehicle gallery/contact columns and brought specifications and inspection reports into the shared surface system.
- Refined customer and operations page headings, navigation targets, form fields, upload panels, and admin sign-in.
- Kept navigation labels stable instead of animating each letter.
- Routed admin document links through the existing authenticated proxy, discarding signed URL credentials. The backend verifies the live account, current admin role, and account restrictions for every authenticated document request. Short-lived direct signed URLs remain unchanged for other clients.
- Resolved relative upload paths before serving ID evidence, matching the documented local configuration. Document responses use no-store and no-referrer.

Verification

- Browser review: 375px, 768px and 1440px; marketplace, vehicle detail, homepage; customer dashboard and verification; operations dashboard and identity queue.
- French and Kinyarwanda homepage and marketplace layouts checked at 375px.
- Existing smoke suite exercises homepage to vehicle detail to sign-in, plus safe sign-in return paths.
- `node --test admin/test/id-document.test.mjs` checks URL expiry removal, filename encoding, and malformed/traversal inputs. It uses the installed TypeScript compiler and supports the repository's Node 20 runtime.
- Backend regression: `cd backend && NODE_ENV=test node -r dotenv/config --test test/id-document-session.test.js`. Use a disposable migrated database through DB_* variables. Tests cover expired/unauthenticated links, active review, held/suspended/demoted users, revoked sessions, and private response headers.
- Full backend suite: `cd backend && UPLOAD_DIR="$PWD/uploads" NODE_ENV=test NODE_OPTIONS='--require=dotenv/config' npm test`, against a fresh disposable database.
- Production verification: `npx tsc --noEmit` and `npm run build` in both web/ and admin/.

The local browser review uses E2E fixtures, with bundled photography replacing the fixture's blocked remote stock-image host. This is test inventory, not a claim about real vehicles. No production deployment is part of this change.

Use an absolute UPLOAD_DIR for the full backend suite: the existing image-variant and import-proof paths assume it. The ignored local development .env was adjusted accordingly. The ID regression deliberately exercises the documented relative setting as well.

Recorded results

Both production builds and TypeScript checks passed. Existing Chromium smoke journeys: 2 passed. Document URL tests: 3 passed. Focused identity/attestation/upload checks: 13 passed. The complete backend run finished with 629 passed, 1 intentionally skipped, and 3 local upload-configuration failures. After correcting the ignored local UPLOAD_DIR setting, all 16 tests in the affected image/import files plus the relative-path ID regression passed. The full suite was not repeated after that targeted correction.

The production-built homepage-to-vehicle-detail journey and admin sign-in passed. A synthetic-document integration check confirmed successful active-admin access, private response headers, and refusal after demotion, revocation, and logout. Production Secure cookies were preserved; the local HTTP integration harness adjusted only its own temporary cookie jar.
