#!/bin/sh
# Pull the latest code and install dependencies for all four apps.
# Usage: npm run sync
set -e
cd "$(dirname "$0")/.."

GD="/Applications/GitHub Desktop.app/Contents/Resources/app/git"
if ! git --version >/dev/null 2>&1 || [ "$(command -v git)" = /usr/bin/git ]; then
  [ -x "$GD/bin/git" ] || { echo "No usable git. Install GitHub Desktop." >&2; exit 1; }
  export GIT_EXEC_PATH="$GD/libexec/git-core" GIT_TEMPLATE_DIR="$GD/share/git-core/templates"
  git() { "$GD/bin/git" "$@"; }
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes. Commit or stash them first:" >&2
  git status --short >&2
  exit 1
fi

git fetch --all --prune
branch=$(git rev-parse --abbrev-ref HEAD)

if git rev-parse --verify -q main >/dev/null && [ "$branch" != main ]; then
  git fetch origin main:main 2>/dev/null || echo "Local main has diverged from origin/main; left as is."
fi

if git rev-parse -q --verify "@{upstream}" >/dev/null 2>&1; then
  git merge --ff-only "@{upstream}"
elif [ "$branch" != main ]; then
  git merge origin/main
fi

for dir in . backend web admin; do
  echo "== npm ci in $dir"
  (cd "$dir" && npm ci --no-audit --no-fund)
done

echo "Up to date: $branch @ $(git rev-parse --short HEAD)"
