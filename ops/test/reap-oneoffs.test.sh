#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Tests for ops/reap-oneoffs.sh.
#
# This script removes running containers on a production host that is SHARED
# with another project, so the interesting properties are all about what it must
# NOT do. Those cannot be checked by reading it, and they cannot be checked by
# running it against the real box — by the time you find out, the neighbour's
# container is gone.
#
# So `docker` is stubbed. Each stub prints a fixture and FAILS LOUDLY (exit 99)
# if the reaper reaches for something it should never touch, which makes the
# safety properties assertions rather than intentions.
#
# The fixture is the real state from Ops run #4, the morning after sixteen
# cancelled deploys:
#
#   sawa-api-1 / sawa-db-1 / sawa-web-1 / sawa-admin-1   the live stack
#   sawa-api-run-<hash> × 5                             stranded, 21h to 3d old
#   ora-app-1, ora-app-run-deadbeef                     SOMEBODY ELSE'S
#
#   ops/test/reap-oneoffs.test.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

REAPER="$(cd "$(dirname "$0")/.." && pwd)/reap-oneoffs.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0; fail=0
ok()   { pass=$(( pass + 1 )); printf '  ok    %s\n' "$1"; }
bad()  { fail=$(( fail + 1 )); printf '  FAIL  %s\n' "$1"; [ -n "${2:-}" ] && printf '        %s\n' "$2"; }

# Run the reaper with a given stub on PATH, from a dir that looks like the repo.
run_with() {
  local stub="$1"; shift
  local dir="$TMP/wd"; mkdir -p "$dir"; : > "$dir/docker-compose.prod.yml"
  # `env` and not a bare prefix: a variable assignment has to be a literal word
  # at parse time, so "$@" expanding to DRY_RUN=1 would be read as the command.
  ( cd "$dir" && PATH="$TMP/$stub:$PATH" env "$@" bash "$REAPER" 2>&1 )
}

mkstub() { mkdir -p "$TMP/$1"; cat > "$TMP/$1/docker"; chmod +x "$TMP/$1/docker"; }

# ─── The real host ──────────────────────────────────────────────────────────
mkstub vps <<'STUB'
#!/usr/bin/env bash
# id|name|project|oneoff|age|state
FIXTURES='
c001|sawa-web-1|sawa|False|6 minutes|running
c002|sawa-admin-1|sawa|False|6 minutes|running
c003|sawa-api-1|sawa|False|6 minutes|running
c004|sawa-api-run-312e4444fcd3|sawa|True|21 hours|running
c005|sawa-api-run-f990e9a4992b|sawa|True|3 days|running
c006|sawa-api-run-32e000cc995a|sawa|True|3 days|running
c007|sawa-api-run-bd394911aca3|sawa|True|3 days|running
c008|sawa-api-run-3212594065f9|sawa|True|3 days|running
c009|sawa-db-1|sawa|False|3 days|running
c010|ora-app-1|ora|False|3 days|running
c011|ora-app-run-deadbeef|ora|True|5 days|running
c012|sawa-api-run-livemigration|sawa|True|60 seconds|running
c013|sawa-api-run-oldexited|sawa|True|2 days|exited
'
field() { echo "$FIXTURES" | grep -v '^$' | awk -F'|' -v id="$1" -v n="$2" '$1==id{print $n}'; }
case "$1" in
  compose) svc="${!#}"
    case "$svc" in db) echo c009 ;; api) echo c003 ;; web) echo c001 ;; admin) echo c002 ;; esac ;;
  ps) proj=''; oneoff=''
    while [ $# -gt 0 ]; do
      case "$1" in
        --filter) case "$2" in
            label=com.docker.compose.project=*) proj="${2##*=}" ;;
            label=com.docker.compose.oneoff=*)  oneoff="${2##*=}" ;;
            *) echo "STUB FAILURE: unexpected filter $2" >&2; exit 99 ;;
          esac; shift 2 ;;
        *) shift ;;
      esac
    done
    # Refusing an unscoped listing is the point: a project-less filter would
    # sweep the whole shared host.
    [ -n "$proj" ] || { echo "STUB FAILURE: listed containers with no project filter" >&2; exit 99; }
    echo "$FIXTURES" | grep -v '^$' | awk -F'|' -v p="$proj" -v o="$oneoff" \
      '$3==p && (o==""||$4==o){print $1}' ;;
  inspect) fmt=""; id=""
    while [ $# -gt 0 ]; do
      case "$1" in -f|--format) fmt="$2"; shift 2 ;; *) id="$1"; shift ;; esac
    done
    case "$fmt" in
      *project*) field "$id" 3 ;;
      *oneoff*)  field "$id" 4 ;;
      *) printf '/%s\t%s\t%s\n' "$(field "$id" 2)" \
           "$(date -u -d "$(field "$id" 5) ago" +%Y-%m-%dT%H:%M:%S.000000000Z)" "$(field "$id" 6)" ;;
    esac ;;
  rm) for a in "$@"; do
        case "$a" in rm|-f) continue ;; esac
        n="$(field "$a" 2)"
        case "$n" in
          sawa-api-1|sawa-db-1|sawa-web-1|sawa-admin-1)
            echo "STUB FAILURE: removed live service container $n" >&2; exit 99 ;;
          ora-*) echo "STUB FAILURE: removed another project's container $n" >&2; exit 99 ;;
        esac
        echo "REMOVED $n"
      done ;;
  info) echo / ;;
  *) echo "STUB FAILURE: unhandled: $*" >&2; exit 99 ;;
esac
STUB

echo "the real VPS state"
out="$(run_with vps)"
case "$out" in *"STUB FAILURE"*) bad "touched something it must not" "$out" ;; *) ok "never reached a service or a neighbour container" ;; esac
[ "$(printf '%s\n' "$out" | grep -c '^  reap ')" = 6 ] \
  && ok "reaps the 5 stranded + 1 old exited one-off" \
  || bad "wrong reap count" "$out"
printf '%s\n' "$out" | grep -q 'keep  sawa-api-run-livemigration' \
  && ok "keeps a 60s-old one-off (could be the live migration)" \
  || bad "reaped a one-off young enough to be an in-flight migration" "$out"
printf '%s\n' "$out" | grep -q 'ora-app-run-deadbeef' \
  && bad "considered another project's one-off" "$out" \
  || ok "another project's 5-day-old one-off is invisible to it"
printf '%s\n' "$out" | grep -q 'removed 6 abandoned' || bad "no summary line" "$out"

echo "DRY_RUN"
out="$(run_with vps DRY_RUN=1)"
printf '%s\n' "$out" | grep -q 'REMOVED' \
  && bad "DRY_RUN removed something" "$out" || ok "DRY_RUN removes nothing"
[ "$(printf '%s\n' "$out" | grep -c '^  reap ')" = 6 ] \
  && ok "DRY_RUN lists exactly what a live run would remove" || bad "DRY_RUN listing differs" "$out"

echo "MIN_AGE=0 (operator override)"
out="$(run_with vps MIN_AGE=0)"
[ "$(printf '%s\n' "$out" | grep -c '^  reap ')" = 7 ] \
  && ok "MIN_AGE=0 also takes the 60s one-off" || bad "MIN_AGE not honoured" "$out"

# ─── Stack down: the project cannot be resolved ──────────────────────────────
mkstub down <<'STUB'
#!/usr/bin/env bash
case "$1" in
  compose) exit 1 ;;
  ps) echo "STUB FAILURE: filtered with no project" >&2; exit 99 ;;
  *) exit 1 ;;
esac
STUB
echo "stack down"
out="$(run_with down)"
printf '%s\n' "$out" | grep -q 'not reaping' \
  && ok "refuses rather than filtering on one label" || bad "did not refuse" "$out"
case "$out" in *"STUB FAILURE"*) bad "listed containers anyway" "$out" ;; esac

# ─── A creation time that cannot be parsed ───────────────────────────────────
# `date -d ""` does not fail — GNU date returns midnight today — so a blank
# timestamp used to read as "a few hours old" and qualify for removal.
mkstub blankdate <<'STUB'
#!/usr/bin/env bash
case "$1" in
  compose) echo c009 ;;
  ps) echo c777 ;;
  inspect) case "$3" in
      *project*) echo sawa ;;
      *) printf '/sawa-api-run-blankdate\t\trunning\n' ;;
    esac ;;
  rm) echo "STUB FAILURE: removed a container with an unreadable date" >&2; exit 99 ;;
esac
STUB
echo "unreadable creation time"
out="$(run_with blankdate)"
printf '%s\n' "$out" | grep -q 'keep  sawa-api-run-blankdate' \
  && ok "keeps what it cannot date" || bad "did not keep it" "$out"
case "$out" in *"STUB FAILURE"*) bad "removed it" "$out" ;; esac

# ─── The label vocabulary is not what we filter on ───────────────────────────
mkstub lowercase <<'STUB'
#!/usr/bin/env bash
case "$1" in
  compose) echo c009 ;;
  ps) for a in "$@"; do case "$a" in label=com.docker.compose.oneoff=*) exit 0 ;; esac; done
      echo c009; echo c777 ;;
  inspect) case "$3" in
      *project*) echo sawa ;;
      *oneoff*) [ "$4" = c777 ] && echo true || echo false ;;
    esac ;;
  rm) echo "STUB FAILURE: removed something via a filter that matched nothing" >&2; exit 99 ;;
esac
STUB
echo "label written lowercase"
out="$(run_with lowercase)"
printf '%s\n' "$out" | grep -q 'WARNING' \
  && ok "says it is blind instead of reporting a clean host" || bad "silently reported success" "$out"

# ─── A host that really is clean ─────────────────────────────────────────────
mkstub clean <<'STUB'
#!/usr/bin/env bash
case "$1" in
  compose) echo c009 ;;
  ps) for a in "$@"; do case "$a" in label=com.docker.compose.oneoff=*) exit 0 ;; esac; done
      echo c009 ;;
  inspect) case "$3" in *project*) echo sawa ;; *oneoff*) echo False ;; esac ;;
esac
STUB
echo "clean host"
out="$(run_with clean)"
printf '%s\n' "$out" | grep -q 'WARNING' \
  && bad "false alarm on a clean host" "$out" || ok "no false alarm"
printf '%s\n' "$out" | grep -q 'no abandoned one-off' \
  && ok "says there is nothing to do" || bad "unclear on a clean host" "$out"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
