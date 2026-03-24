#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running secret scan on tracked files..."

PATTERN='AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z\-_]{35}|ghp_[A-Za-z0-9]{36}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN (RSA|EC|OPENSSH|DSA|PRIVATE) KEY-----|(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*["'"'"'][^"'"'"']{12,}["'"'"']'

# Scan only tracked files to avoid noise from local artifacts.
if git ls-files | rg -v '^frontend/package-lock\.json$' | xargs rg -n --no-heading -P "$PATTERN" >/tmp/dcf_secret_scan_matches.txt 2>/dev/null; then
  echo "Potential secrets found:"
  cat /tmp/dcf_secret_scan_matches.txt
  echo "Secret scan failed."
  exit 1
fi

rm -f /tmp/dcf_secret_scan_matches.txt
echo "Secret scan passed."
