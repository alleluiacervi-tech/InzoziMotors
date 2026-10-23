#!/bin/bash
# Installs the graphify CLI and (re)builds the code graph for each new cloud session.
# AST-only build: no LLM calls, no API cost. Never blocks session start.
export PATH="$HOME/.local/bin:$PATH"
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! command -v graphify >/dev/null 2>&1; then
  command -v uv >/dev/null 2>&1 || pip install --quiet uv >/dev/null 2>&1
  uv tool install graphifyy >/dev/null 2>&1 || pip install --quiet graphifyy >/dev/null 2>&1
fi
if command -v graphify >/dev/null 2>&1; then
  graphify update . >/dev/null 2>&1 || true
fi
exit 0
