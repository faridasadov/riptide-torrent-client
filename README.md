# Local Torrent Client

Simple local torrent client built with FastAPI, SQLite and `python-libtorrent`.

## Features

- Add magnet links
- Upload `.torrent` files
- List progress, speed, seeds, peers and ETA
- Pause, resume and delete torrents
- Per-torrent and global speed limits through the API
- SQLite persistence and libtorrent resume data files
- Basic Auth protection
- Download path allowlist, upload size limit and free-space guard
- Periodic resume-data and status snapshot saving
- Basic HTML/CSS/JS frontend

This app is for legal content only. It does not search torrent sites, provide tracker catalogs or bypass copyright controls.

## Requirements

- Python 3.11+
- `python-libtorrent`
- FastAPI dependencies from `backend/requirements.txt`

On some Linux distros, `python-libtorrent` is installed from the OS package manager instead of pip.

## Install

```bash
cd /root/torrent-client/backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

If pip cannot install libtorrent, install the distro package, for example:

```bash
sudo apt install python3-libtorrent
```

## Run

```bash
cd /root/torrent-client/backend
source .venv/bin/activate
export TORRENT_CLIENT_USERNAME=admin
export TORRENT_CLIENT_PASSWORD=change-this-password
uvicorn app.main:app --reload --host 127.0.0.1 --port 8123
```

Open:

```text
http://127.0.0.1:8123/
```

## Production Service

This server is deployed with:

- Runtime: `/opt/torrent-client`
- Data: `/var/lib/torrent-client/data`
- Downloads: `/var/lib/torrent-client/downloads`
- Env file: `/etc/torrent-client.env`
- Service: `torrent-client.service`
- Nginx proxy: `/etc/nginx/conf.d/torrent-client.conf`

Useful commands:

```bash
systemctl status torrent-client
systemctl restart torrent-client
journalctl -u torrent-client -f
```

Nginx exposes the UI on:

```text
http://SERVER_IP:8080/
```

Backend Uvicorn only binds to `127.0.0.1:8123`.

## API

- `POST /api/torrents/add-magnet`
- `POST /api/torrents/add-file`
- `GET /api/torrents`
- `GET /api/torrents/{torrent_id}`
- `POST /api/torrents/{torrent_id}/pause`
- `POST /api/torrents/{torrent_id}/resume`
- `DELETE /api/torrents/{torrent_id}?delete_files=false`
- `POST /api/torrents/{torrent_id}/limit`
- `GET /api/settings`
- `PUT /api/settings`

Limits are in bytes per second. Use `0` for unlimited.

## Data

- SQLite DB: `/var/lib/torrent-client/data/torrents.db`
- Resume data: `/var/lib/torrent-client/data/resume/*.fastresume`
- Stored torrent files: `/var/lib/torrent-client/data/resume/torrent-files/`
- Default downloads: `/var/lib/torrent-client/downloads`

## Security Settings

Configured through environment variables:

- `TORRENT_CLIENT_USERNAME`
- `TORRENT_CLIENT_PASSWORD`
- `TORRENT_CLIENT_AUTH_ENABLED`
- `TORRENT_CLIENT_CORS_ORIGINS`
- `TORRENT_CLIENT_DATA_DIR`
- `TORRENT_CLIENT_DEFAULT_DOWNLOAD_DIR`
- `TORRENT_CLIENT_ALLOWED_DOWNLOAD_ROOTS`
- `TORRENT_CLIENT_MAX_TORRENT_FILE_BYTES`
- `TORRENT_CLIENT_MIN_FREE_SPACE_BYTES`

The deployed service uses Basic Auth and only allows downloads under `/var/lib/torrent-client/downloads`.

## Manual Test

1. Start the backend.
2. Add a legal magnet link.
3. Confirm it appears in the table with `metadata loading`, then progress.
4. Pause and resume it.
5. Restart the app and confirm the torrent list is restored.
6. Delete the torrent with and without `delete_files=true`.

## Known Limitations

- Resume-data saving uses libtorrent alerts and may need a short shutdown window.
- If `python-libtorrent` is missing, the API starts but torrent actions return `503`.
- The frontend is intentionally basic and polls status every two seconds.
