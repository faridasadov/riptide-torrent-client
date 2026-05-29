const state = {
  torrents: [],
  selectedId: null,
  filter: "all",
  label: null,
  tab: "general",
  speedHistory: [],
};

const qs = (selector) => document.querySelector(selector);
const list = qs("#torrent-list");
const message = qs("#message");

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text || response.statusText };
  }
  if (!response.ok) throw new Error(data.detail || response.statusText);
  return data;
}

function bytes(value) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = Number(value);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

function toBytes(value, unit = "b") {
  const number = Number(value || 0);
  if (unit === "mb") return number * 1024 * 1024;
  if (unit === "kb") return number * 1024;
  return number;
}

function fromBytes(value, unit = "b") {
  if (unit === "mb") return Math.round((value || 0) / 1024 / 1024);
  if (unit === "kb") return Math.round((value || 0) / 1024);
  return value || 0;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function eta(seconds) {
  if (seconds === null || seconds === undefined) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h ? `${h}h ${m}m` : `${m}m ${s}s`;
}

function labelOf(torrent) {
  const name = `${torrent.name} ${torrent.save_path}`.toLowerCase();
  if (name.includes("ubuntu") || name.includes("linux") || name.includes("debian") || name.includes("iso")) return "linux";
  if (/\.(mp4|mkv|mp3|flac|avi)$/.test(name)) return "media";
  if (/\.(exe|msi|dmg|appimage)$/.test(name)) return "software";
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return "archives";
  return "software";
}

function matchesFilter(torrent) {
  const status = torrent.status.toLowerCase();
  const query = qs("#search").value.trim().toLowerCase();
  if (query && !`${torrent.name} ${torrent.info_hash} ${torrent.save_path}`.toLowerCase().includes(query)) return false;
  if (state.label && labelOf(torrent) !== state.label) return false;
  if (state.filter === "downloading" && !status.includes("downloading")) return false;
  if (state.filter === "seeding" && !status.includes("seeding")) return false;
  if (state.filter === "completed" && torrent.progress < 100) return false;
  if (state.filter === "paused" && !torrent.paused) return false;
  return true;
}

function pillClass(torrent) {
  if (torrent.paused) return "pill paused";
  if (torrent.status.toLowerCase().includes("seeding")) return "pill seeding";
  return "pill";
}

function renderCounts() {
  const counts = {
    all: state.torrents.length,
    downloading: state.torrents.filter((t) => t.status.toLowerCase().includes("downloading")).length,
    seeding: state.torrents.filter((t) => t.status.toLowerCase().includes("seeding")).length,
    completed: state.torrents.filter((t) => t.progress >= 100).length,
    paused: state.torrents.filter((t) => t.paused).length,
    linux: state.torrents.filter((t) => labelOf(t) === "linux").length,
    media: state.torrents.filter((t) => labelOf(t) === "media").length,
    software: state.torrents.filter((t) => labelOf(t) === "software").length,
    archives: state.torrents.filter((t) => labelOf(t) === "archives").length,
  };
  Object.entries(counts).forEach(([key, value]) => {
    const el = qs(`#count-${key}`);
    if (el) el.textContent = value;
  });
  qs("#footer-count").textContent = `${counts.all} torrents`;
}

function renderList() {
  renderCounts();
  const visible = state.torrents.filter(matchesFilter);
  list.replaceChildren(...visible.map((torrent) => {
    const card = document.createElement("article");
    card.className = `torrent-card ${torrent.torrent_id === state.selectedId ? "active" : ""}`;
    card.onclick = () => selectTorrent(torrent.torrent_id);
    card.innerHTML = `
      <div class="torrent-icon">${torrent.paused ? "P" : "D"}</div>
      <div>
        <div class="torrent-name">${esc(torrent.name || "metadata loading")}</div>
        <div class="row-meta"><span class="${pillClass(torrent)}">${esc(torrent.status)}</span> ${torrent.progress.toFixed(1)}% · ${bytes(torrent.downloaded)} / ${bytes(torrent.total_size)}</div>
        <div class="bar"><span style="width:${Math.min(torrent.progress, 100)}%"></span></div>
      </div>
      <div class="speeds">
        <div><b>DL ${bytes(torrent.download_speed)}/s</b></div>
        <div><b>UL ${bytes(torrent.upload_speed)}/s</b></div>
      </div>
    `;
    return card;
  }));
}

function renderTotals() {
  const down = state.torrents.reduce((sum, t) => sum + t.download_speed, 0);
  const up = state.torrents.reduce((sum, t) => sum + t.upload_speed, 0);
  const uploaded = state.torrents.reduce((sum, t) => sum + t.uploaded, 0);
  const downloaded = state.torrents.reduce((sum, t) => sum + t.downloaded, 0);
  qs("#global-down").textContent = `DL ${bytes(down)}/s`;
  qs("#global-up").textContent = `UL ${bytes(up)}/s`;
  qs("#footer-ratio").textContent = `Ratio ${downloaded ? (uploaded / downloaded).toFixed(2) : "0.00"}`;
}

function drawChart() {
  const canvas = qs("#speed-chart");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#1e293b";
  for (let y = 30; y < height; y += 35) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  const max = Math.max(1, ...state.speedHistory.flatMap((p) => [p.down, p.up]));
  [["down", "#1ee7c2"], ["up", "#ff6b6b"]].forEach(([key, color]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    state.speedHistory.forEach((point, index) => {
      const x = (index / Math.max(state.speedHistory.length - 1, 1)) * width;
      const y = height - (point[key] / max) * (height - 20) - 10;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function renderSimpleTable(target, rows, empty, columns) {
  const el = qs(target);
  if (!rows.length) {
    el.innerHTML = `<div class="muted">${empty}</div>`;
    return;
  }
  el.innerHTML = `<div class="list-table">${rows.map((row) => `
    <div class="list-row">${columns.map((col) => `<span>${esc(col(row))}</span>`).join("")}</div>
  `).join("")}</div>`;
}

async function selectTorrent(torrentId) {
  state.selectedId = torrentId;
  renderList();
  const details = await api(`/api/torrents/${torrentId}/details`);
  const torrent = details.status;
  qs("#detail-empty").classList.add("hidden");
  qs("#detail-content").classList.remove("hidden");
  qs("#detail-name").textContent = torrent.name || "metadata loading";
  qs("#detail-status").textContent = torrent.status;
  qs("#detail-status").className = pillClass(torrent);
  qs("#stat-progress").textContent = `${torrent.progress.toFixed(1)}%`;
  qs("#stat-downloaded").textContent = bytes(torrent.downloaded);
  qs("#stat-ratio").textContent = torrent.downloaded ? (torrent.uploaded / torrent.downloaded).toFixed(2) : "0.00";
  qs("#stat-eta").textContent = eta(torrent.eta);
  qs("#stat-seeds").textContent = torrent.seeds;
  qs("#stat-peers").textContent = torrent.peers;

  state.speedHistory.push({ down: torrent.download_speed, up: torrent.upload_speed });
  state.speedHistory = state.speedHistory.slice(-48);
  drawChart();

  renderSimpleTable("#tab-files", details.files, "No file metadata yet.", [
    (f) => f.path,
    (f) => bytes(f.downloaded),
    (f) => bytes(f.size),
  ]);
  renderSimpleTable("#tab-peers", details.peers, "No connected peers.", [
    (p) => p.ip,
    (p) => p.client || "-",
    (p) => `${bytes(p.download_speed)}/s`,
  ]);
  renderSimpleTable("#tab-trackers", details.trackers, "No tracker metadata yet.", [
    (t) => t.url,
    (t) => `tier ${t.tier}`,
    () => "",
  ]);
}

async function loadTorrents() {
  try {
    state.torrents = await api("/api/torrents");
    if (!state.selectedId && state.torrents[0]) state.selectedId = state.torrents[0].torrent_id;
    if (state.selectedId && !state.torrents.some((t) => t.torrent_id === state.selectedId)) {
      state.selectedId = state.torrents[0]?.torrent_id || null;
    }
    renderList();
    renderTotals();
    if (state.selectedId) await selectTorrent(state.selectedId);
    else {
      qs("#detail-empty").classList.remove("hidden");
      qs("#detail-content").classList.add("hidden");
    }
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function loadSystem() {
  try {
    const system = await api("/api/system/status");
    const usedPercent = system.disk_total ? (system.disk_used / system.disk_total) * 100 : 0;
    qs("#free-space").textContent = bytes(system.disk_free);
    qs("#free-meter").style.width = `${Math.max(3, 100 - usedPercent)}%`;
    qs("#dht-state").textContent = `DHT ${system.dht_enabled ? "on" : "off"}`;
  } catch {
    qs("#connection-state").textContent = "Disconnected";
  }
}

async function loadSettings() {
  try {
    const settings = await api("/api/settings");
    Object.entries(settings).forEach(([key, value]) => {
      const input = qs(`#${key}`);
      if (!input) return;
      if (input.type === "checkbox") input.checked = Boolean(value);
      else input.value = fromBytes(value, input.dataset.unit);
    });
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function act(path, method) {
  try {
    await api(path, { method });
    await loadTorrents();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function limitTorrent(torrentId, downloadLimit, uploadLimit) {
  await api(`/api/torrents/${torrentId}/limit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ download_limit: downloadLimit, upload_limit: uploadLimit }),
  });
}

async function deleteTorrent(torrentId) {
  const deleteFiles = window.confirm("Delete downloaded files too?");
  const confirmed = window.confirm(deleteFiles ? "Delete torrent and files?" : "Remove torrent from list only?");
  if (!confirmed) return;
  await act(`/api/torrents/${torrentId}?delete_files=${deleteFiles}`, "DELETE");
}

qs("#add-toggle").onclick = () => qs("#add-panel").classList.toggle("hidden");
qs("#settings-toggle").onclick = () => qs("#settings-panel").classList.toggle("hidden");
qs("#pause-selected").onclick = () => state.selectedId && act(`/api/torrents/${state.selectedId}/pause`, "POST");
qs("#resume-selected").onclick = () => state.selectedId && act(`/api/torrents/${state.selectedId}/resume`, "POST");
qs("#delete-selected").onclick = () => state.selectedId && deleteTorrent(state.selectedId);
qs("#search").oninput = renderList;

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.onclick = () => {
    state.filter = button.dataset.filter;
    state.label = null;
    document.querySelectorAll(".nav,.label").forEach((el) => el.classList.remove("active"));
    button.classList.add("active");
    renderList();
  };
});

document.querySelectorAll("[data-label]").forEach((button) => {
  button.onclick = () => {
    state.label = button.dataset.label;
    state.filter = "all";
    document.querySelectorAll(".nav,.label").forEach((el) => el.classList.remove("active"));
    button.classList.add("active");
    renderList();
  };
});

document.querySelectorAll(".tab").forEach((button) => {
  button.onclick = () => {
    state.tab = button.dataset.tab;
    document.querySelectorAll(".tab,.tab-page").forEach((el) => el.classList.remove("active"));
    button.classList.add("active");
    qs(`#tab-${state.tab}`).classList.add("active");
  };
});

qs("#magnet-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/torrents/add-magnet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        magnet: qs("#magnet").value.trim(),
        save_path: qs("#save-path").value.trim() || null,
      }),
    });
    event.target.reset();
    showMessage("Magnet added");
    await loadTorrents();
  } catch (error) {
    showMessage(error.message, true);
  }
});

qs("#file-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = qs("#torrent-file").files[0];
  if (!file) return showMessage("Select a .torrent file", true);
  const form = new FormData();
  form.append("file", file);
  form.append("save_path", qs("#file-save-path").value.trim());
  try {
    await api("/api/torrents/add-file", { method: "POST", body: form });
    event.target.reset();
    showMessage(".torrent file added");
    await loadTorrents();
  } catch (error) {
    showMessage(error.message, true);
  }
});

qs("#settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {};
  ["default_download_folder", "max_active_downloads", "global_download_limit", "global_upload_limit"].forEach((key) => {
    const input = qs(`#${key}`);
    payload[key] = key === "default_download_folder" ? input.value : toBytes(input.value, input.dataset.unit);
  });
  ["dht_enabled", "upnp_enabled", "lsd_enabled"].forEach((key) => {
    payload[key] = qs(`#${key}`).checked;
  });
  try {
    await api("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showMessage("Settings saved");
    await loadSystem();
  } catch (error) {
    showMessage(error.message, true);
  }
});

loadSettings();
loadSystem();
loadTorrents();
setInterval(loadTorrents, 2000);
setInterval(loadSystem, 10000);
