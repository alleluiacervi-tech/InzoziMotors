#!/usr/bin/env bash
# Remove superseded Sawa deploy images without touching a shared host's images.
# Docker retags `sawa-*:latest` on load; replacing a tag is not garbage collection.
set -euo pipefail

DRY_RUN="${DRY_RUN:-}"

log() { printf '  %s\n' "$*"; }
# Empty sentinel keeps Bash 3.2 + `set -u` happy; loops skip it.
candidates=("")
protected=("")

contains() {
  local needle="$1" item
  shift
  for item in "$@"; do [ "$item" = "$needle" ] && return 0; done
  return 1
}

add_id() {
  local id="${1:-}"
  if [ -n "$id" ] && ! contains "$id" "${candidates[@]}"; then candidates+=("$id"); fi
  return 0
}

protect_id() {
  local id="${1:-}"
  if [ -n "$id" ] && ! contains "$id" "${protected[@]}"; then protected+=("$id"); fi
}

# Ownership is the hard boundary: never accept repository names, dangling state,
# age, or a caller-supplied ID list as proof. Those selectors can match another
# project on a shared daemon. Every Sawa image is labeled at build time.
while IFS= read -r id; do add_id "$id"; done < <(
  docker image ls -q --filter 'label=com.sawacars.managed=true' 2>/dev/null | sort -u
)

# Protect the three current tags even before Compose has attached containers.
for image in sawa-api:latest sawa-web:latest sawa-admin:latest; do
  id="$(docker image inspect -f '{{.Id}}' "$image" 2>/dev/null || true)"
  protect_id "$id"
done

# Protect images referenced by every container on the shared daemon, including stopped ones.
while IFS= read -r id; do
  protect_id "$id"
done < <(
  docker ps -aq 2>/dev/null \
    | while IFS= read -r cid; do docker inspect -f '{{.Image}}' "$cid" 2>/dev/null || true; done
)

removed=0
kept=0
for id in "${candidates[@]}"; do
  [ -n "$id" ] || continue
  if contains "$id" "${protected[@]}"; then
    log "keep  ${id#sha256:} — current or referenced by a container"
    kept=$((kept + 1))
  elif [ -n "$DRY_RUN" ]; then
    log "would remove ${id#sha256:}"
  elif docker image rm "$id" >/dev/null 2>&1; then
    log "removed ${id#sha256:}"
    removed=$((removed + 1))
  else
    # Fail closed if a container attached after the protection snapshot.
    log "keep  ${id#sha256:} — Docker refused removal"
    kept=$((kept + 1))
  fi
done

log "deploy-image cleanup: $removed removed, $kept protected"
