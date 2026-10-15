#!/usr/bin/env bash
# Replace LICENSE with the official GNU AGPL-3.0 text from gnu.org. Run once from a machine with internet access.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
curl -fsSL https://www.gnu.org/licenses/agpl-3.0.txt -o "$tmp"
head -n 5 "$tmp" | grep -q "GNU AFFERO GENERAL PUBLIC LICENSE" || { echo "unexpected content (title missing) - aborting" >&2; exit 1; }
grep -q "Version 3, 19 November 2007" "$tmp" || { echo "unexpected content (version line missing) - aborting" >&2; exit 1; }
[ "$(wc -c < "$tmp")" -gt 30000 ] || { echo "download too small - aborting" >&2; exit 1; }
cp "$tmp" LICENSE
echo "LICENSE now contains the official AGPL-3.0 text ($(wc -c < LICENSE) bytes). Review and commit it."
