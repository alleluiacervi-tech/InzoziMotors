#!/usr/bin/env bash
set -euo pipefail

CLEANER="$(cd "$(dirname "$0")/.." && pwd)/prune-deploy-images.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin"

cat > "$TMP/bin/docker" <<'STUB'
#!/usr/bin/env bash
case "$1 $2" in
  "image ls")
    # The old/dangling images must only be discoverable through --all. This
    # reproduces the production bug where the cleaner saw only current tags.
    [ "${3:-}" = "--all" ] || { echo "STUB FAILURE image ls omitted --all" >&2; exit 99; }
    # Two old Sawa images, one current Sawa image. A neighbour image is
    # deliberately absent because it has no Sawa ownership label.
    printf '%s\n' sha256:old-labeled sha256:referenced-old sha256:current-api ;;
  "image inspect")
    case "${5:-}" in
      sawa-api:latest) echo sha256:current-api ;;
      sawa-web:latest) echo sha256:current-web ;;
      sawa-admin:latest) echo sha256:current-admin ;;
      *) exit 1 ;;
    esac ;;
  "image rm")
    case "$3" in
      sha256:current-*|sha256:referenced-old|sha256:neighbour)
        echo "STUB FAILURE removed protected $3" >&2; exit 99 ;;
      *) echo "RM $3" >> "$CALLS" ;;
    esac ;;
  "ps -aq") printf '%s\n' container-current container-stopped ;;
  "inspect -f")
    case "${4:-}" in
      container-current) echo sha256:current-api ;;
      container-stopped) echo sha256:referenced-old ;;
    esac ;;
  *) echo "STUB FAILURE unhandled docker $*" >&2; exit 99 ;;
esac
STUB
chmod +x "$TMP/bin/docker"

export PATH="$TMP/bin:$PATH" CALLS="$TMP/calls"
echo "dry run"
out="$(DRY_RUN=1 bash "$CLEANER")"
grep -q 'would remove old-labeled' <<< "$out"
grep -q 'keep  referenced-old' <<< "$out"
[ ! -e "$CALLS" ]

echo "live cleanup"
out="$(bash "$CLEANER")"
grep -q 'removed old-labeled' <<< "$out"
grep -q 'keep  current-api' <<< "$out"
grep -q 'keep  referenced-old' <<< "$out"
grep -qx 'RM sha256:old-labeled' "$CALLS"
[ "$(wc -l < "$CALLS" | tr -d ' ')" = 1 ]

# Deployment automation must never fall back to a daemon-wide prune. This is a
# repository-level invariant, not merely an implementation detail of CLEANER.
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if grep -REn --exclude='prune-deploy-images.test.sh' \
    'docker (image|builder|system|container|volume) prune' \
    "$ROOT/ops" "$ROOT/.github/workflows"; then
  echo "global Docker prune is forbidden on the shared production daemon" >&2
  exit 1
fi

echo "2 cleanup modes passed"
