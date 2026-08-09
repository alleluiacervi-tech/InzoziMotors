# Deploy Phase 2 — the registry migration, and what must be true first

Status: **deferred, not abandoned.** Written when commit `a68c96b` was split into a
minimal Phase 1 (keep the root-cause fix, restore the known-good deploy shape) and
this Phase 2 (move image delivery to a registry). An adversarial review of `a68c96b`
found 23 reported findings collapsing to **13 distinct defects, 6 of them blockers**,
two of which fire on the very first run. This file is the record of what the
migration was for and the checklist it has to clear.

---

## What Phase 1 actually shipped, and why that was enough

The 27-minute "deploy" that motivated all of this was **not** slow image transfer.
From the real Actions logs (runs `31252077894`, `31055830123`): build all three images
on the runner **2m26s**, ship them to the VPS **37s**, then `Deploy` **27m07s** until
the job timeout killed it.

The whole 27 minutes was one command. `backend/entrypoint.sh` ended in an
unconditional `exec node server.js` and never referenced `"$@"`, while the Dockerfile
sets `ENTRYPOINT ["./entrypoint.sh"]`. So `docker compose run --rm api node
src/migrate.js` silently discarded the command and booted a **second long-lived API
listener in the foreground**, which `compose run` can never return from. The migration
itself finished in three seconds; the log then shows 108 identical `/health` lines
until cancellation.

That is fixed in `backend/entrypoint.sh` (dispatch on `"$@"`) and double-guarded in
`ops/deploy.sh` (`run --rm -T --entrypoint node api src/migrate.js`, inside
`run_bounded`). **The fix lives in the image and in the script, not in how the image
travels.** Phase 1 therefore keeps the fix and reverts the delivery change.

Phase 1 is also bootstrap-safe for a reason worth stating: the host executes the
`ops/deploy.sh` it already has on disk, and the restored workflow asks that script for
nothing it does not already understand — `COMPOSE` and `SKIP_BUILD=1`, both present
since `e032f09`. The corrected entrypoint arrives *inside the image built on the
runner*, so even the host's older script migrates correctly on the first run.

## What Phase 2 is for

Two things, both real:

1. **Only changed layers move.** `docker save | ssh docker load` ships every byte of
   all three images on every deploy — a code-only change costs the same as a
   dependency bump. A registry pull moves a few MB and seconds.
2. **The VPS never compiles anything, ever, including during a rollback.**
   `ops/rollback.sh` still runs `docker compose build api web admin` **on the
   production host** — two Next.js compiles, 20-40 minutes, on the critical path of an
   incident — because there is nowhere else to get the previous images from. Immutable
   per-commit tags in a registry make the way back a `pull`, not a rebuild. This is the
   single biggest remaining hole in the recovery story.

The architecture in `a68c96b` was right: build off-box, immutable per-commit tags, pull
only changed layers, restart only changed services, bound everything, cheap preflight.
What was not ready was everything around it.

---

## The blockers — none of this can run before these are solved

### B1. The host runs the OLD `ops/deploy.sh` on the first run *(findings: blocker #2)*

`ops/deploy.sh "$REVISION"` executes the script **already on the host**, and the new
script only arrives via the `git checkout` *inside* it. On the first deploy after a
registry-shaped rewrite lands, that is the pre-change version: it knows nothing of
`PULL_IMAGES` / `SERVICES` / `IMAGE_TAG`, has `SKIP_BUILD` unset, and falls through to
`docker compose build api web admin` **on the VPS**, unbounded, inside a step capped at
10 minutes. It dies at 10 minutes with **git HEAD advanced and the old containers still
serving** — bit-for-bit the failure the rewrite was written to eliminate. It also writes
an old-format rollback pointer with no `PREVIOUS_IMAGE_TAG`, which arms B3.

It self-heals on the *second* run, so it presents as "one mysterious failed deploy, then
it worked" — the worst possible way to learn about it.

Deliver the target revision's script **before** invoking it. Either:

```sh
git fetch --quiet --all --tags
git show "$REVISION:ops/deploy.sh" > /tmp/sawa-deploy-target.sh
DEPLOY_SELF_COPY=1 DEPLOY_ORIGIN="$APP_DIR/ops/deploy.sh" \
  bash /tmp/sawa-deploy-target.sh "$REVISION"
```

(`DEPLOY_SELF_COPY=1` skips the re-exec guard; `DEPLOY_ORIGIN` is required or the
script's `cd "$(dirname …)/.."` resolves to `/`.) Or `scp` the new script up first, or
pipe it into `bash -s`. A one-time manual bootstrap by hand also works but leaves the
trap armed for anyone who ever restores this host from an older checkout.

### B2. GHCR credential lifecycle — the deploy revokes the rollback lever's ability to pull *(findings: blockers #4, and reported items 1, 7, 16, 20)*

Every deploy ended with `docker logout ghcr.io` under `if: always()` — i.e. precisely
when a rollback is next needed. `ops.yml` had no `docker login` step anywhere; the only
one in the repo was in `deploy.yml`, and the cleanup undid it. GHCR packages are private
by default (verified: `docker buildx imagetools inspect ghcr.io/…/api:latest` → **403
Forbidden**). The logout also wipes a hand-made standing login, which the compose file
explicitly instructs operators to create.

Worse and independent of credentials: **the first rollback can never pull at all.**
`rollback.sh` checks out `PREVIOUS_REVISION`, and every pre-`a68c96b` revision's
`docker-compose.prod.yml` names `sawa-api:latest` / `sawa-web:latest` /
`sawa-admin:latest` — no registry, no `IMAGE_TAG`. `compose pull` on those resolves to
Docker Hub and fails unconditionally.

Both paths fell into `run_bounded 2400 $COMPOSE build $SERVICES` inside an `ops.yml`
step capped at 15 minutes — SIGKILLed mid-build, *after* the checkout and *before* any
`up -d`: old code on disk, bad images still serving, pointer unconsumed, BuildKit
wedged. The bitter part: for the transition rollback the correct images
(`sawa-*:latest`) are **already local** and the script never looks.

Required before Phase 2:
- `ops.yml` gets `permissions: {contents: read, packages: read}` and a `docker login
  ghcr.io` step on the host before the `Run` step, or the host gets a long-lived
  `read:packages` PAT and the deploy stops logging it out.
- On pull failure, check local availability before building — `docker compose -f
  docker-compose.prod.yml config --images | xargs -r -n1 docker image inspect -q` — and
  if the images are present, log "using local images" and continue to `up -d`.
- Delete the 2400s build fallback or put it behind an explicit opt-in. It cannot fit in
  the step that invokes it, and a rollback that cannot pull should fail loudly with the
  old containers still serving.

### B3. The rollback pointer defaults to `latest`, making the first rollback a silent no-op *(findings: blocker #5, and reported items 2, 8, 13, 21)*

`$STATE_DIR/image-tag` is written **only** at the end of a *successful* deploy, so on
the first run the pointer records `PREVIOUS_IMAGE_TAG=latest`. Rollback then exports
`IMAGE_TAG=latest` and pulls `:latest` — which the build job just re-pushed for every
rebuilt service. **It re-pulls the images it is undoing.** Readiness passes (the new API
is answering), it prints `healthy — rolled back to <old sha>`, writes `latest` back, and
renames the pointer to `.used-<ts>`. The operator is told the rollback worked;
production is byte-identical to the broken deploy, code and image are now skewed, and a
second attempt dies with "no rollback pointer".

Same outcome by a second route: **re-running a failed deploy overwrites the pointer with
the failed deploy's own revision.** `PREVIOUS="$(git rev-parse HEAD)"` is already the bad
revision (the checkout ran), and `image-tag` is already the bad tag if the first attempt
got past the restart. Since the converge branch makes "just re-run it" the documented
response to a half-finished deploy, this is a normal path. `HAD_MIGRATIONS` is also
recomputed as `0`, silencing `rollback.sh`'s destructive-migration warning for
migrations that *were* applied.

Required:
- Never invent a tag: `PREVIOUS_IMAGE_TAG=$(cat "$STATE_DIR/image-tag" 2>/dev/null || true)`.
- Only write the pointer when the revision actually moves — wrap it in
  `if [ "$PREVIOUS" != "$NEXT" ]; then … else log "converge run — keeping the existing
  rollback pointer"; fi`.
- Refuse rather than pretend, and leave the pointer in place on that path:
  ```sh
  case "${PREVIOUS_IMAGE_TAG:-}" in
    ''|latest|"${DEPLOYED_IMAGE_TAG:-}")
      [ -n "${ROLLBACK_IMAGE_TAG:-}" ] || die "no distinct previous image tag (got '${PREVIOUS_IMAGE_TAG:-}') — re-run with ROLLBACK_IMAGE_TAG=<older sha>" ;;
  esac
  export IMAGE_TAG="${ROLLBACK_IMAGE_TAG:-$PREVIOUS_IMAGE_TAG}"
  ```
- Seed the state once on the host so the first pointer is honest:
  `docker inspect --format '{{.Config.Image}}' sawa-api-1` → `/var/lib/sawa/image-tag`.

### B4. Change detection keys off the host's git HEAD, which advances even when a deploy fails *(findings: blocker #6, and reported items 9, 19)*

`deployed_sha` came from `git rev-parse HEAD` on the host, but `ops/deploy.sh` checks
out **before** the pull, the migration and the restart. A deploy that dies at any of
those leaves HEAD at rev2 with rev1's containers running. Push rev3 touching only
`web/`: the plan job diffs rev2..rev3, sets `SERVICES="web"`, classifies `api` as
unchanged, tag-aliases it, and never restarts it — while migrations from rev2 *and* rev3
are applied through the api image. Production ends up running **rev1's API code against
a rev3 schema**, and every later web-only deploy keeps re-classifying api as unchanged.
The run summary asserts the opposite ("unchanged, tag aliased (no rebuild, no
transfer)"). The `DEPLOYED == REV` converge branch was added for exactly this hazard but
only covers the equal case.

The host already has the correct signal — `$STATE_DIR/image-tag` is written *only* after
the restart. Nothing reads it. Required: preflight the last successfully-restarted tag,
not git HEAD; treat `deployed_tag != deployed_sha`, unknown, or `latest` the same as an
unknown server revision and deploy everything.

### B5. `cache-to=type=gha` gets no credentials in a plain `run:` step *(findings: blocker #1)*

The GHA cache backend reads `ACTIONS_CACHE_URL` / `ACTIONS_RESULTS_URL` /
`ACTIONS_RUNTIME_TOKEN` from the environment. Those are injected into the buildx child
process by `docker/build-push-action` and `docker/bake-action` — **not** by
`docker/setup-buildx-action`, and never into a plain shell step.
`grep -rn 'ACTIONS_RUNTIME_TOKEN\|ghaction-github-runtime' .github/` returns nothing.

Best case both `cache-from` and `cache-to` silently do nothing, so every deploy
re-resolves three dependency trees and the "~4-minute deploy" claim is fiction. Worse
case BuildKit's gha exporter rejects the missing url/token as a solve error, `docker
buildx bake --push` fails under `set -euo pipefail`, the build job fails, and **no
deploy ever happens**.

Fix: `- uses: crazy-max/ghaction-github-runtime@v3` immediately after
`docker/setup-buildx-action@v3`, or use `docker/bake-action`. Appending
`,ignore-error=true` to `cache-to` keeps builds green but leaves the cache dead — a
stopgap, not the fix. **Prove this on a throwaway branch before anything else**: a build
job that pushes to GHCR and nothing else. It costs one CI run to find out.

### B6. Production mutation from a job outside the `production` environment gate *(findings: should-fix #9, and reported items 12, 17, 22)*

The `plan` job SSHed to the VPS and ran `docker ps -a --filter 'name=-run-' -q | xargs
-r docker rm -f`, and `plan` declared no `environment:` — only `deploy` did. So it
mutated production *before* any approval or protection rule could apply, including on a
deploy an approver later rejects.

The filter is also an unanchored substring match over **all** containers on the daemon,
and `-a` includes running ones: `otherproj-runner-1`, `ci-run-worker`, a co-tenant's
`compose run` pg_dump. `docker-compose.prod.yml` states this VPS is shared with another
project that owns `127.0.0.1:3000`. Removal was silent (`>/dev/null 2>&1 || true`),
reported only as a count.

Required: keep `plan` read-only (disk, reachability, deployed tag). Move the reap into
the first step of the gated `deploy` job, scope it to this compose project and print what
it is about to kill:

```sh
docker ps -a --filter label=com.docker.compose.oneoff=True \
             --filter label=com.docker.compose.project="$(basename "$APP_DIR")" \
             --format '{{.Names}}'
```

Add `--filter status=exited` if only genuine strays should be reaped.

---

## Should-fix — before Phase 2 carries real traffic

**S1. The deploy step's cap must exceed the remote script's own budgets.**
*(findings: should-fix #7.)* `a68c96b` capped the Deploy step at 10 minutes while
`ops/deploy.sh` budgeted 1860s, with two unbounded prunes on top. The outer bound
preempts every inner bound — the inverse of the design intent — and when it fires the
SSH session dies at an arbitrary point, including between migrate and `up -d`.
**Already fixed in Phase 1** for the save/load flow (Deploy step 50 min against a 2620s
worst case, arithmetic documented in the workflow, every call in `ops/deploy.sh` bounded
including `ops/backup.sh`). Re-derive the sum when the remote script changes shape — a
pull-based script has different budgets.

**S2. The mandatory-backup gate asks git, not the database, whether migrations will
run.** *(findings: should-fix #8, and reported items 10, 11.)* **Still open in Phase 1.**
`NEW_MIGRATIONS` is `git diff PREVIOUS..NEXT -- backend/migrations/`, where `PREVIOUS` is
the host's HEAD — which this whole change set documents as an unreliable proxy for the
applied set. Two holes: (a) deploy X adds migration M, backup taken, checkout succeeds,
pull/restart fails → M never applied; deploy Y (a workflow fix, no new migration)
computes 0, prints "no migrations in this deploy", takes **no backup**, and then applies
M — including `0005_contracts.sql`'s `UPDATE handovers SET agreed_at = …` and its
drop/re-add of `handovers_status_check`. (b) On any converge/retry `PREVIOUS == NEXT`, the
diff is empty, so the one path *designed* for retrying an interrupted deploy is the path
that migrates with no backup. `HAD_MIGRATIONS=0` also lands in the pointer, suppressing
`rollback.sh`'s warning. Fix: ask the database — `backend/src/migrate.js` already prints
`PENDING` via `node src/migrate.js status`:
```sh
PENDING=$($COMPOSE run --rm -T --entrypoint node api src/migrate.js status | grep -c PENDING || true)
```
Back up when `PENDING > 0` and write that number into `HAD_MIGRATIONS`. Cheaper
equivalent: always run `ops/backup.sh` unless `SKIP_BACKUP=1`.

**S3. Disk reclamation under pull-by-tag.** *(findings: should-fix #10.)* Superseded
images stay tagged `<prefix>/web:<oldsha>` — the immutable per-commit tags the design
deliberately pushes — so they are not dangling and dangling-only `prune -f` skips them.
`docker builder prune -af` frees nothing either once the VPS never builds. One full image
per changed service accumulates forever until the preflight refuses to deploy at 3072 MB.
**Already fixed in Phase 1**: `docker image prune -af --filter "until=336h"` (14 days
keeps a rollback window), bounded, with a comment that describes what it actually does.
Mirror it in `ops.yml`'s `prune-builders` lever when Phase 2 lands.

**S4. Deploying an older revision ships the newest front ends and rewrites the tag
rollback depends on.** *(findings: should-fix #11.)* On `workflow_dispatch` with
`revision: <older tag>` — the documented `ops/deploy.sh v1.2.0` path — the diff reports
only differing files. If only `backend/` differs, web and admin are aliased from
`:latest`, the **newest** build. So (a) current-HEAD web/admin go live while the summary,
the compose file and `/var/lib/sawa/image-tag` all say `v1.2.0`, and (b) `imagetools
create --tag …/web:v1.2.0` **overwrites** an existing tag, so it now resolves to
different content than it did — falsifying the stated invariant that image tags are the
immutable identity of a build, and poisoning any later rollback to that tag. Fix: trust
the changed-file subset only for a forward move —
```sh
if ! git merge-base --is-ancestor "$DEPLOYED" "$REV"; then
  echo "Target is not a descendant of the deployed revision — building everything."
  pick "api web admin"; exit 0
fi
```

**S5. The raw `revision` input must not become a Docker tag.** *(findings: should-fix
#12.)* `tag=${REV}` verbatim. `revision: origin/main` (which `ops/deploy.sh` documents and
falls back to) or `release/1.0` produces `ghcr.io/…/api:origin/main` — `invalid reference
format`, and the dispatch dies with a parser error naming nothing. A slash-free branch
name is worse: it succeeds, `IMAGE_TAG` becomes a **moving** tag, gets recorded in
`/var/lib/sawa/image-tag`, and the next deploy stores it as `PREVIOUS_IMAGE_TAG` —
reproducing B3. Phase 1 validates the input as a plausible ref (no whitespace, no shell
metacharacters, no `..`, no leading `-`), which is necessary but **not sufficient** for
Phase 2: pin it to an immutable 40-hex SHA once, after checkout, and use that everywhere.

**S6. "Backup succeeded" does not mean the uploads volume was backed up.** *(findings:
should-fix #13.)* **Still open, and not specific to Phase 2.** `ops/backup.sh` hardcodes
`UPLOADS_PATH=/var/lib/docker/volumes/sawa_uploads/_data`, yet the Docker root dir is not
fixed and no `COMPOSE_PROJECT_NAME` is set anywhere — the volume prefix comes from the
`VPS_APP_DIR` basename, a free-form secret. Locally the same compose file resolves to
`inzozimotors_uploads`, which that path would miss entirely. On a miss the script logs a
WARNING and still `exit 0`s, so `ops/backup.sh || die` reads it as a full backup and the
schema change proceeds. The database is dumped and table-verified; the 36-angle photo
sets, national-ID scans and generated contract PDFs have no copy, and nothing in the
output distinguishes that from a complete backup. Fix:
```sh
UPLOADS_PATH="${UPLOADS_PATH:-$(docker volume inspect "$(basename "$(pwd)")_uploads" --format '{{.Mountpoint}}' 2>/dev/null || true)}"
```
and make a miss fatal unless `SKIP_UPLOADS=1`.

**S7. Host key is trust-on-first-use, and Phase 2 puts a registry token on that
session.** *(findings: later #14.)* With `VPS_HOST_KEY` unset, every run writes whatever
`ssh-keyscan` returns into a fresh `known_hosts` with stderr discarded — no prior key to
compare against, ever. Phase 2 then pipes the job's `packages: write` `GITHUB_TOKEN` into
`docker login` over that unverified session, so an impostor host gets push access to the
production images. Make the pin mandatory (`[ -n "$HOST_KEY" ] || { echo '::error::
VPS_HOST_KEY is required'; exit 1; }`), or at minimum keep `docker login` off a TOFU
session. Also: both workflows still interpolate `${{ secrets.VPS_HOST_KEY }}` directly
into the `run:` body instead of via `env:`, which writes the secret into the step script
file on the runner and exposes it to shell-quoting accidents.

---

## The structural note

Three separate blockers — B1, B3 and B4 — are the same shape: **the host's git HEAD is
treated as the record of what is running, and it isn't.** `git checkout` happens before
the pull, before the migration and before the restart, so HEAD advances on deploys that
never put a container into service. `/var/lib/sawa/image-tag` is the honest record —
written only after a successful restart — and in `a68c96b` it was written but never read
for any decision. Making that file authoritative everywhere a decision depends on "what
is deployed" removes a whole class of these rather than three instances of it.

`ops/deploy.sh` carries a `KNOWN GAP` comment at its "already at target — nothing to do"
exit for the same reason: in Phase 1 that early exit is HEAD~1's behaviour, restored
deliberately, and it means a re-run cannot converge a half-finished deploy. Phase 2's
converge branch needs the image-tag record to be correct first, or converging just moves
the lie.

---

## Sequencing

None of `a68c96b` ever met a real Docker daemon, a real GHCR or the real VPS. Do it in
this order:

1. **Prove B5 on a throwaway branch** — a build job that pushes to GHCR and nothing
   else. It either works or it doesn't, and it costs one CI run to find out.
2. **Bootstrap the host by hand once**: `git fetch && git checkout <sha>`, `docker login
   ghcr.io`, seed `/var/lib/sawa/image-tag` with what is actually running, then
   `PULL_IMAGES=1 IMAGE_TAG=<sha> ops/deploy.sh <sha>`. This applies B1's manual remedy
   and is the only way to learn whether the remote half works.
3. **Rehearse a rollback before you need one**, with B2 and B3 fixed. Every symptom that
   ends in "reports success while nothing happened" lives on that path, and it has never
   been executed.
4. **Only then** enable the automatic `workflow_run` trigger — with the fork guard from
   Phase 1 still in place.

## One-time host cleanup owed from the incident

The cancelled 27-minute runs each stranded a `sawa-api-run-<hash>` container holding a
second API process against the live database. `a68c96b` added a preflight reaper for
those; Phase 1 removed it along with the `plan` job (see B6 — it was unscoped and
ungated). Nothing cleans them now, so do it by hand, scoped to this project, and look
before removing:

```sh
docker ps -a --filter label=com.docker.compose.oneoff=True \
             --filter label=com.docker.compose.project=sawa \
             --format '{{.Names}}\t{{.Status}}'
# then, for the exited strays only:
docker ps -aq --filter label=com.docker.compose.oneoff=True \
              --filter label=com.docker.compose.project=sawa \
              --filter status=exited | xargs -r docker rm -f
```
