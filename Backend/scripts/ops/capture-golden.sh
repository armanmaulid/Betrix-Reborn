#!/usr/bin/env bash
# T0.3 — Capture golden snapshots of the four hot-read endpoints.
#
# Usage:
#   BASE_URL=https://betrix-api.example.com \
#   ADMIN_TOKEN=<jwt> \
#   CAL_MONTH=2026-08 \
#   ./capture-golden.sh <label>     # e.g. ./capture-golden.sh pre-fase1
#
# Writes pretty JSON to ./.golden/<label>/*.json next to this script's repo.
# Re-run with a second label and diff via ./diff-json.mjs (§D T1.3 parity).

set -euo pipefail

LABEL="${1:?usage: capture-golden.sh <label>}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH=("Authorization: Bearer ${ADMIN_TOKEN:?ADMIN_TOKEN required}")
OUT="$(dirname "$0")/.golden/$LABEL"

mkdir -p "$OUT"

echo "→ metrics      -> $OUT/metrics.json"
curl -sf -H "${AUTH[0]}" "$BASE_URL/api/v1/admin/metrics" | node -e \
  'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.stringify(JSON.parse(d),null,2)))' \
  > "$OUT/metrics.json"

echo "→ analytics    -> $OUT/analytics.json"
curl -sf -H "${AUTH[0]}" "$BASE_URL/api/v1/admin/analytics" | node -e \
  'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.stringify(JSON.parse(d),null,2)))' \
  > "$OUT/analytics.json"

echo "→ news page1   -> $OUT/news.json"
curl -sf -H "${AUTH[0]}" "$BASE_URL/api/v1/news?limit=25" | node -e \
  'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.stringify(JSON.parse(d),null,2)))' \
  > "$OUT/news.json"

echo "→ calendar ${CAL_MONTH:-current} -> $OUT/calendar.json"
curl -sf -H "${AUTH[0]}" "$BASE_URL/api/v1/calendar?currency=USD&month=${CAL_MONTH:-$(date +%Y-%m)}&limit=250" | node -e \
  'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.stringify(JSON.parse(d),null,2)))' \
  > "$OUT/calendar.json"

echo "✔ Golden snapshots captured: $OUT"
