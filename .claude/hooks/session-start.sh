#!/bin/bash
# SessionStart-Hook nur fuer Cloud-Sitzungen (Claude Code im Web). Lokal auf dem Mac passiert nichts.
# Idempotent: darf beliebig oft laufen.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

# Build-Nummer: Der Pre-Commit-Hook wirkt nur mit lokalem core.hooksPath, und jede Cloud-Sitzung klont frisch.
git config core.hooksPath tools/hooks

# Der Cloud-Klon ist flach, der Pre-Commit-Hook zaehlt aber Commits (git rev-list --count): Mit abgeschnittener Historie waere die Build-Nummer viel zu klein (am 23. Oktober 2026 59 statt 93).
if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
  git fetch --unshallow --quiet origin || echo "git fetch --unshallow ist fehlgeschlagen, die Build-Nummer waere zu klein" >&2
fi

# Testabhaengigkeit (playwright-core). npm install statt npm ci, damit der Container-Cache greift.
(cd tests && npm install --no-audit --no-fund --loglevel=error)

# tests/lib.js sucht Chromium nur im Mac-Pfad, HOLDUP_CHROME uebersteuert das.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export HOLDUP_CHROME=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi
