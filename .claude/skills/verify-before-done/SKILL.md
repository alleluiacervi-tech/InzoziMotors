---
name: verify-before-done
description: Use before claiming any code change is fixed, working, passing, or done — bug fixes, features, CI repairs, and refactors.
---

# Verify before you say it's done

Never report success from reading the diff. Show evidence.

1. **Reproduce first.** For a bug or red CI, run the failing command or test and see it fail. If you cannot reproduce it, say so rather than guessing a fix.
2. **Make the smallest change** that addresses the cause, not the symptom. "Flaky" is not a cause.
3. **Run the same check again** and see it pass. Then run the neighbours: the package's whole test file, lint and typecheck.
4. **Run what this repo actually uses:**
   - backend: `cd backend && npm test` (needs Postgres)
   - web / admin: `npm run typecheck`, `npm run lint`, `npm run build` as the change warrants
   - app: `npm run release:check` and `npm run mobile:imports`
5. **Cross-client changes.** A backend change affects web, admin and app. A user-facing feature ships on web and app, or say why not. `web/src/lib/business.ts` and mobile `src/data/*` change in the same commit.
6. **Re-read your diff adversarially.** What would make CI reject it? What input is null, empty or hostile? Does any surface now contradict "Sawa is not a party to any deal"?
7. **Report faithfully.** State what you ran and the real result. If a test failed, was skipped or could not be run (no Postgres, CI-only specs), say exactly that. Never skip, disable or delete a test to get green.

For UI changes, load the page and look at it (the playwright skill), including empty, loading and error states and a phone-width viewport.
