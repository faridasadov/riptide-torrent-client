#!/usr/bin/env bash
set -euo pipefail

desktop_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${desktop_dir}/.." && pwd)"
backend_dir="${repo_root}/backend"
venv_dir="${backend_dir}/.venv-linux"

if ! command -v cargo >/dev/null 2>&1; then
  echo "Rust toolchain is required for the Tauri desktop shell. Install rustup first: https://rustup.rs/" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18 or newer is required for Tauri builds." >&2
  exit 1
fi

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [ "${node_major}" -lt 18 ]; then
  echo "Node.js 18 or newer is required for Tauri builds." >&2
  exit 1
fi

if [ ! -x "${venv_dir}/bin/python" ] || [ ! -x "${venv_dir}/bin/pip" ]; then
  rm -rf "${venv_dir}"
  python3 -m venv "${venv_dir}"
fi

"${venv_dir}/bin/python" -m pip install --upgrade pip
"${venv_dir}/bin/pip" install -r "${backend_dir}/requirements-build.txt"

cd "${desktop_dir}"
npm install
PATH="${venv_dir}/bin:${PATH}" npm run dist:linux

echo "Linux bundles are in: ${desktop_dir}/src-tauri/target/release/bundle"
