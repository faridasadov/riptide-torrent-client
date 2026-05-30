#!/usr/bin/env bash
set -euo pipefail

URL="${TORRENT_CLIENT_HEALTH_URL:-http://127.0.0.1:8123/api/health}"

if ! curl -fsS --max-time 5 "$URL" >/dev/null; then
  systemctl restart torrent-client.service
fi
