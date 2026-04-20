#!/usr/bin/env bash
#
# Regression guard for the PII debug-log leak that PR #15 fixed in the
# frontend, PR #16 in routes/auth.py, and PR #24 in 12 more backend files.
#
# The offending pattern wrote session data (emails, patient_ids, error
# bodies, full Meta API responses) to a hardcoded `.cursor/debug.log` on
# disk on every hot path. Running this script from CI prevents it from
# coming back silently.
#
# Exit codes:
#   0 — no forbidden patterns found
#   1 — at least one forbidden pattern found (includes the offending lines
#       in the output so reviewers don't have to grep themselves)
#   2 — misuse (run from wrong directory, grep not available, etc.)
#
# Intended to be invoked from repo root:
#   bash backend/scripts/check_no_pii_debug_logs.sh

set -euo pipefail

if [[ ! -d backend ]]; then
  echo "[check_no_pii_debug_logs] expected to run from repo root; no backend/ here." >&2
  exit 2
fi

if ! command -v grep >/dev/null 2>&1; then
  echo "[check_no_pii_debug_logs] grep is required." >&2
  exit 2
fi

# Patterns that MUST NOT appear in backend source. Each one was used to
# write PII to /.cursor/debug.log in the bad pattern.
PATTERNS=(
  '#region agent log'
  '\.cursor/debug\.log'
  '/app/\.cursor'
)

# Directories to exclude from the scan. __pycache__ holds compiled
# artifacts; tests/ may intentionally reference these strings in future
# regression tests.
EXCLUDES=(
  --exclude-dir=__pycache__
  --exclude-dir=.pytest_cache
  # This script documents the forbidden patterns as string literals; don't
  # let the guard trip on its own documentation.
  --exclude=check_no_pii_debug_logs.sh
)

found=0
for pattern in "${PATTERNS[@]}"; do
  # -E for extended regex, -n for line numbers, -R recursive. The grep
  # is read-only and exits nonzero when nothing matches — we invert that
  # so the script's overall exit reflects any-pattern-found.
  if grep -R -n -E "${EXCLUDES[@]}" -- "${pattern}" backend/ 2>/dev/null; then
    found=1
  fi
done

if [[ $found -ne 0 ]]; then
  cat >&2 <<'EOF'

--------------------------------------------------------------------------------
PII debug-log guard FAILED.

The matches above write session data to a hardcoded /.cursor/debug.log
path. They were removed from the tree in PRs #15/#16/#24 and should not
be reintroduced.

If you have a legitimate need for ad-hoc debugging, use the structured
logger (`logger = get_logger("medical_records.api")`) so output lands in
Cloud Logging with normal redaction and retention — not in a file on the
container filesystem.
--------------------------------------------------------------------------------
EOF
  exit 1
fi

echo "[check_no_pii_debug_logs] OK — no forbidden patterns found in backend/"
exit 0
