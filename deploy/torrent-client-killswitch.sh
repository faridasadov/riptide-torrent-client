#!/usr/bin/env bash
set -euo pipefail

VPN_IFACE="${1:-${TORRENT_CLIENT_VPN_IFACE:-tun0}}"
SERVICE_USER="${TORRENT_CLIENT_SERVICE_USER:-torrentclient}"
TABLE="torrent_client_killswitch"

if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  echo "User not found: $SERVICE_USER" >&2
  exit 1
fi

nft delete table inet "$TABLE" 2>/dev/null || true
nft add table inet "$TABLE"
nft add chain inet "$TABLE" output '{ type filter hook output priority 0; policy accept; }'
nft add rule inet "$TABLE" output meta skuid "$SERVICE_USER" oifname "lo" accept
nft add rule inet "$TABLE" output meta skuid "$SERVICE_USER" oifname "$VPN_IFACE" accept
nft add rule inet "$TABLE" output meta skuid "$SERVICE_USER" reject with icmpx admin-prohibited

echo "Torrent client kill-switch enabled for user $SERVICE_USER via $VPN_IFACE"
