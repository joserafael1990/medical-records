#!/usr/bin/env python3
"""Fail if the alembic DAG has more than one head.

A parallel head means two migrations declare the same `down_revision`, which
makes `alembic upgrade head` ambiguous and the pipeline silently picks a
branch. Today that bit us: `b8c9d0e1f2a3` (already merged) and `b1c2d3e4f5a6`
(new) both pointed to `a7b8c9d0e1f2`, so the repair migration was never
applied through the linear chain. This check runs before the docker build in
Cloud Build and catches that before anything hits the DB.

Pure stdlib so it can run on `python:*-alpine` with no pip install.
"""
import re
import sys
from pathlib import Path

VERSIONS = Path(__file__).resolve().parent.parent / "migrations_alembic" / "versions"

REV_RE = re.compile(r'^revision\s*(?::[^=]*)?=\s*["\']([^"\']+)["\']', re.M)
DOWN_RE = re.compile(r'^down_revision\s*(?::[^=]*)?=\s*["\']([^"\']+)["\']', re.M)


def main() -> int:
    if not VERSIONS.is_dir():
        print(f"ERROR: versions dir not found: {VERSIONS}", file=sys.stderr)
        return 2

    revisions: dict[str, str | None] = {}
    for py in sorted(VERSIONS.glob("*.py")):
        text = py.read_text(encoding="utf-8")
        rev = REV_RE.search(text)
        down = DOWN_RE.search(text)
        if not rev:
            continue
        revisions[rev.group(1)] = down.group(1) if down else None

    down_revs = {d for d in revisions.values() if d}
    heads = sorted(r for r in revisions if r not in down_revs)

    print(f"alembic revisions={len(revisions)} heads={len(heads)}")
    for h in heads:
        print(f"  head: {h}")

    if len(heads) != 1:
        print(
            f"ERROR: expected exactly 1 alembic head, found {len(heads)}: {heads}. "
            "Re-chain the new migration(s) so the DAG stays linear.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
