const state = {
  torrents: [],
  selectedId: null,
  filter: "all",
  label: null,
  tab: "general",
  speedHistory: [],
  authenticated: false,
  storagePath: "",
  screen: "torrents",
  settingsSection: "general",
  rssFeeds: [],
  rssRules: [],
  rssItems: [],
  rssSelectedFeed: null,
  rssShowRules: false,
  uiSettings: {
    autostart: true,
    notifications: false,
    theme: "Deep ocean",
    incomplete_folder: true,
    encryption: "Prefer",
  },
};

const qs = (selector) => document.querySelector(selector);
const list = qs("#torrent-list");
const message = qs("#message");

const RT_ICON_PATHS = {
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  folderOpen: '<path d="M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6A2 2 0 0 1 18.46 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  magnet: '<path d="M6 15V9a6 6 0 1 1 12 0v6"/><path d="M6 9H2v6h4"/><path d="M22 9h-4v6h4"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  server: '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  hardDrive: '<path d="M22 12H2"/><path d="M5.5 5h13a2 2 0 0 1 1.8 1.1l1.7 3.4a2 2 0 0 1 .2.9V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.6a2 2 0 0 1 .2-.9l1.7-3.4A2 2 0 0 1 5.5 5z"/><path d="M6 16h.01M10 16h.01"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="m6 6 1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
};

function icon(name, size = 16) {
  const path = RT_ICON_PATHS[name];
  if (!path) return "";
  return `<svg class="rt-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function applyTheme() {
  document.body.classList.toggle("theme-light", state.uiSettings.theme === "Pearl light");
}

function applyThemeOverride() {
  const forcedTheme = new URLSearchParams(window.location.search).get("theme");
  if (forcedTheme === "light") state.uiSettings.theme = "Pearl light";
  if (forcedTheme === "dark") state.uiSettings.theme = "Deep ocean";
}

function applyStaticIcons() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    if (el.dataset.iconReady) return;
    const count = el.querySelector("b");
    const existing = el.querySelector(".title-icon,.search-icon-slot");
    if (existing) return;
    const label = Array.from(el.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .join(" ");
    const swatch = el.querySelector(".swatch")?.outerHTML || "";
    el.innerHTML = `${icon(el.dataset.icon)}${swatch}${label ? `<span>${esc(label)}</span>` : ""}${count ? count.outerHTML : ""}`;
    el.dataset.iconReady = "1";
  });
  document.querySelectorAll(".title-icon[data-icon], .search-icon-slot[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, 18);
  });
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text || response.statusText };
  }
  if (response.status === 401) {
    showLogin();
    throw new Error(data.detail || "Authentication required");
  }
  if (!response.ok) throw new Error(data.detail || response.statusText);
  return data;
}

function showLogin(messageText = "") {
  state.authenticated = false;
  qs("#login-screen").classList.remove("hidden");
  qs("#login-message").textContent = messageText;
  qs("#login-message").classList.toggle("error", Boolean(messageText));
}

function hideLogin() {
  state.authenticated = true;
  qs("#login-screen").classList.add("hidden");
  qs("#login-message").textContent = "";
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
    const rowIcon = torrent.paused ? "play" : torrent.status.toLowerCase().includes("seeding") ? "upload" : "layers";
    card.innerHTML = `
      <div class="torrent-icon">${icon(rowIcon, 16)}</div>
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
  const active = state.torrents.filter((t) => t.download_speed || t.upload_speed || t.status.toLowerCase().includes("downloading")).length;
  qs("#global-down").textContent = `↓ ${bytes(down)}/s`;
  qs("#global-up").textContent = `↑ ${bytes(up)}/s`;
  qs("#connection-state").textContent = `Connected (${active} active)`;
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
    if (!state.storagePath) {
      state.storagePath = system.download_root;
      qs("#storage-path").value = state.storagePath;
    }
  } catch {
    qs("#connection-state").textContent = "Disconnected";
  }
}

function setScreen(screen) {
  state.screen = screen;
  document.querySelectorAll(".screen-page").forEach((el) => el.classList.remove("active"));
  qs(`#${screen === "torrents" ? "torrent" : screen}-screen`).classList.add("active");
  document.querySelectorAll(".nav,.label,.tool-nav").forEach((el) => el.classList.remove("active"));
  if (screen === "torrents") {
    qs(`[data-filter="${state.filter}"]`)?.classList.add("active");
  } else {
    qs(`[data-screen="${screen}"]`)?.classList.add("active");
  }
  if (screen === "rss") loadRss();
  if (screen === "settings") renderSettingsScreen();
}

async function runGlobalSearch() {
  const query = qs("#global-search").value.trim();
  if (!query) {
    qs("#search-results").innerHTML = `<div class="rt-screen-foot">Type a search term.</div>`;
    return;
  }
  const result = await api(`/api/search?q=${encodeURIComponent(query)}`);
  const torrentRows = result.torrents.map((torrent) => `
    <div class="rt-res-row">
      <span class="rt-res-name">
        <span class="rt-res-health" style="background:#34EACB"></span>
        <span class="rt-res-nm">${esc(torrent.name || torrent.info_hash)}</span>
        <span class="rt-verified">${icon("check", 10)}</span>
      </span>
      <span class="rt-res-size">${bytes(torrent.total_size || 0)}</span>
      <span class="rt-res-sp rt-mono">${esc(torrent.paused ? "paused" : "active")}</span>
      <span class="rt-res-sp rt-mono">${esc(torrent.info_hash.slice(0, 6))}</span>
      <span class="rt-res-src">${esc(torrent.save_path || "")}<span class="rt-res-age">torrent</span></span>
      <span class="rt-res-add"><button class="rt-res-btn" data-select-torrent="${esc(torrent.info_hash)}">${icon("search", 14)}</button></span>
    </div>
  `);
  const fileRows = result.files.map((file) => `
    <div class="rt-res-row">
      <span class="rt-res-name">
        <span class="rt-res-health" style="background:${file.type === "directory" ? "#5BA2FF" : "#FFB84D"}"></span>
        <span class="rt-res-nm">${esc(file.name)}</span>
      </span>
      <span class="rt-res-size">${file.type === "file" ? bytes(file.size) : "folder"}</span>
      <span class="rt-res-sp rt-mono">${esc(file.type)}</span>
      <span class="rt-res-sp rt-mono">local</span>
      <span class="rt-res-src">${esc(file.path)}<span class="rt-res-age">storage</span></span>
      <span class="rt-res-add"><button class="rt-res-btn" data-open-file="${esc(file.path)}">${icon(file.type === "directory" ? "folderOpen" : "folder", 14)}</button></span>
    </div>
  `);
  qs("#search-results").innerHTML = `
    <div class="rt-restable">
      <div class="rt-res-th">
        <span class="rt-res-name">Name</span>
        <span class="rt-res-size">Size</span>
        <span class="rt-res-sp">State</span>
        <span class="rt-res-sp">ID</span>
        <span class="rt-res-src">Source</span>
        <span class="rt-res-add"></span>
      </div>
      ${[...torrentRows, ...fileRows].join("") || `<div class="rt-table-empty">No local results</div>`}
    </div>
    <div class="rt-screen-foot">${torrentRows.length + fileRows.length} results · local torrents and files</div>
  `;
}

async function loadRss() {
  try {
    const [feeds, rules] = await Promise.all([api("/api/rss/feeds"), api("/api/rss/rules")]);
    state.rssFeeds = feeds;
    state.rssRules = rules;
    if (!state.rssSelectedFeed && feeds[0]) state.rssSelectedFeed = feeds[0].id;
    qs("#count-rss").textContent = feeds.length;
    renderRss();
    if (state.rssSelectedFeed && !state.rssShowRules) loadRssItems(state.rssSelectedFeed);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function loadRssItems(feedId) {
  try {
    const data = await api(`/api/rss/feeds/${feedId}/items`);
    state.rssItems = data.items || [];
    renderRss();
  } catch (error) {
    state.rssItems = [];
    qs("#rss-panel").insertAdjacentHTML("beforeend", `<div class="screen-empty">${esc(error.message)}</div>`);
  }
}

function renderRss() {
  qs("#rss-feeds").innerHTML = state.rssFeeds.map((feed) => `
    <button class="rt-feed-item ${feed.id === state.rssSelectedFeed ? "active" : ""}" data-feed-id="${feed.id}">
      <span class="rt-feed-dot ${feed.active ? "on" : ""}"></span>
      <span class="rt-feed-main"><span class="rt-feed-title">${esc(feed.title)}</span><span class="rt-feed-url">${esc(feed.url)}</span></span>
      <span class="rt-feed-unread">${feed.active ? "on" : "off"}</span>
    </button>
  `).join("") || `<div class="rt-table-empty">No RSS feeds yet.</div>`;

  if (state.rssShowRules) {
    qs("#rss-panel").innerHTML = `
      <div class="rt-rss-content-head">
        <div><div class="rt-rss-ch-title">Auto-download rules</div><div class="rt-rss-ch-sub">New items matching a rule download automatically</div></div>
        <button id="rss-add-rule" class="rt-btn rt-btn-primary rt-btn-auto">${icon("plus", 14)} New rule</button>
      </div>
      <div class="rt-rules">${state.rssRules.map((rule) => `
        <div class="rt-rule ${rule.enabled ? "" : "off"}">
          <button data-toggle-rule="${rule.id}" class="rt-tog ${rule.enabled ? "on" : "off"}"><span class="rt-tog-knob"></span></button>
          <div class="rt-rule-main">
            <div class="rt-rule-top"><span class="rt-rule-label">${esc(rule.label)}</span><span class="rt-rule-feed">${esc(rule.feed_title || "All feeds")}</span></div>
            <code class="rt-rule-pattern">${esc(rule.pattern)}</code>
            <div class="rt-rule-dest">${icon("folder", 12)}${esc(rule.destination)}</div>
          </div>
          <div class="rt-rule-hits"><b>${rule.hits || 0}</b><span>matched</span></div>
        </div>
      `).join("") || `<div class="rt-table-empty">No rules yet.</div>`}</div>
    `;
    qs("#rss-add-rule").onclick = addRssRule;
    return;
  }

  const feed = state.rssFeeds.find((item) => item.id === state.rssSelectedFeed);
  qs("#rss-panel").innerHTML = feed ? `
    <div class="rt-rss-content-head">
      <div><div class="rt-rss-ch-title">${esc(feed.title)}</div><div class="rt-rss-ch-sub">${state.rssItems.length} items · ${esc(feed.url)}</div></div>
      <div class="rt-rss-ch-toggle">
        <span>Feed active</span>
        <button data-toggle-feed="${feed.id}" class="rt-tog ${feed.active ? "on" : "off"}"><span class="rt-tog-knob"></span></button>
        <button class="rt-icon-btn" data-refresh-feed="${feed.id}" title="Refresh">${icon("refresh", 15)}</button>
      </div>
    </div>
    <div class="rt-rss-items">${state.rssItems.map((item) => `
      <div class="rt-rss-item">
        ${icon("file", 15)}
        <div class="rt-rss-item-main"><div class="rt-rss-item-title">${esc(item.title)}</div><div class="rt-rss-item-meta">${esc(item.date || "no date")} · ${item.size ? bytes(item.size) : "size unknown"}</div></div>
        <span class="rt-rss-matched">${icon("check", 11)}Feed item</span>
        <a class="rt-res-btn" href="${esc(item.link || "#")}" target="_blank" rel="noreferrer">${icon("download", 14)}</a>
      </div>
    `).join("") || `<div class="rt-table-empty">No feed items loaded yet.</div>`}</div>
  ` : `<div class="rt-table-empty">Select a feed.</div>`;
}

async function addRssFeed() {
  const url = window.prompt("RSS feed URL:");
  if (!url) return;
  const title = window.prompt("Feed title:", new URL(url).hostname) || url;
  await api("/api/rss/feeds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, url, active: true }),
  });
  await loadRss();
}

async function addRssRule() {
  const label = window.prompt("Rule name:");
  if (!label) return;
  const pattern = window.prompt("Match pattern:", "*");
  if (!pattern) return;
  const destination = window.prompt("Destination folder:", state.storagePath || "/var/lib/torrent-client/downloads");
  if (!destination) return;
  await api("/api/rss/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, pattern, destination, feed_id: state.rssSelectedFeed, enabled: true }),
  });
  await loadRss();
}

function renderSettingsScreen() {
  const panel = qs("#settings-screen-form");
  const s = state.settings || {};
  const ui = state.uiSettings;
  const row = (title, desc, control) => `
    <div class="rt-set-row">
      <div class="rt-set-row-text"><div class="rt-set-row-title">${title}</div>${desc ? `<div class="rt-set-row-desc">${desc}</div>` : ""}</div>
      <div class="rt-set-row-control">${control}</div>
    </div>
  `;
  const toggle = (key) => `<button type="button" class="rt-tog ${s[key] ? "on" : "off"}" data-setting-toggle="${key}"><span class="rt-tog-knob"></span></button>`;
  const uiToggle = (key) => `<button type="button" class="rt-tog ${ui[key] ? "on" : "off"}" data-ui-toggle="${key}"><span class="rt-tog-knob"></span></button>`;
  if (state.settingsSection === "general") {
    panel.innerHTML = `<div class="rt-set-group"><div class="rt-set-grouphead">General</div>${row("Launch Riptide on system startup", "Stored as a local UI preference; systemd service stays enabled separately", uiToggle("autostart"))}${row("Desktop notifications", "Notify when a download completes in this browser", uiToggle("notifications"))}${row("Theme", "", `<button type="button" class="rt-select" data-cycle-theme>${icon("settings", 14)} ${esc(ui.theme)}</button>`)}</div>`;
  }
  if (state.settingsSection === "downloads") {
    panel.innerHTML = `<div class="rt-set-group"><div class="rt-set-grouphead">Downloads</div>${row("Default save location", "", `<div class="rt-pathfield">${icon("folder", 14)}<input id="screen_default_download_folder" value="${esc(s.default_download_folder || "")}" /><button type="button" class="rt-path-btn" data-browse-download>Browse</button></div>`)}${row("Keep incomplete files in download root", "Stored as a local UI preference until incomplete-folder backend support is added", uiToggle("incomplete_folder"))}${row("Maximum active downloads", "", `<input class="rt-numfield" id="screen_max_active_downloads" type="number" min="1" value="${s.max_active_downloads || 3}" />`)}</div>`;
  }
  if (state.settingsSection === "bandwidth") {
    panel.innerHTML = `<div class="rt-set-group"><div class="rt-set-grouphead">Bandwidth limits</div>${row("Maximum download rate", "0 = unlimited", `<div class="rt-numunit"><input class="rt-numfield" id="screen_global_download_limit" type="number" min="0" value="${fromBytes(s.global_download_limit, "kb")}" /><span>KB/s</span></div>`)}${row("Maximum upload rate", "0 = unlimited", `<div class="rt-numunit"><input class="rt-numfield" id="screen_global_upload_limit" type="number" min="0" value="${fromBytes(s.global_upload_limit, "kb")}" /><span>KB/s</span></div>`)}<div class="rt-set-note">${icon("gauge", 14)}Global limits are applied directly to the libtorrent session.</div></div>`;
  }
  if (state.settingsSection === "connection") {
    panel.innerHTML = `<div class="rt-set-group"><div class="rt-set-grouphead">Connection</div>${row("Incoming port", "libtorrent listens on 6881-6891", `<input class="rt-numfield" value="6881" disabled />`)}${row("Map port with UPnP / NAT-PMP", "", toggle("upnp_enabled"))}${row("Distributed Hash Table (DHT)", "Find peers without a tracker", toggle("dht_enabled"))}${row("Local Peer Discovery", "", toggle("lsd_enabled"))}</div>`;
  }
  if (state.settingsSection === "privacy") {
    panel.innerHTML = `<div class="rt-set-group"><div class="rt-set-grouphead">Privacy</div>${row("Protocol encryption", "Stored as a local UI preference until explicit libtorrent encryption settings are exposed", `<div class="rt-seg rt-seg-inline">${["Disabled", "Prefer", "Require"].map((option) => `<button type="button" data-encryption="${option}" class="${ui.encryption === option ? "active" : ""}">${option}</button>`).join("")}</div>`)}${row("Route traffic through VPN interface", "nftables kill-switch restricts torrentclient to tun0 and loopback", `<span class="rt-select">${icon("shield", 14)} enabled</span>`)}${row("Authentication", "Session cookie frontend plus Basic Auth API compatibility", `<span class="rt-select">${icon("lock", 14)} enabled</span>`)}<div class="rt-set-note">${icon("lock", 14)}Riptide stores credentials locally in /etc/torrent-client.env and sends no telemetry.</div></div>`;
  }
  panel.insertAdjacentHTML("beforeend", `<div class="settings-save-row"><button class="rt-btn rt-btn-primary rt-btn-auto" type="submit">${icon("check", 14)} Save settings</button></div>`);
}

function parentPath(path) {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return `/${parts.join("/")}`;
}

async function loadStorage(path = state.storagePath) {
  try {
    const data = await api(`/api/files?path=${encodeURIComponent(path || "")}`);
    state.storagePath = data.path;
    qs("#storage-path").value = data.path;
    const rows = [];
    if (!data.roots.includes(data.path)) {
      rows.push(`<div class="storage-row"><span>${icon("folderOpen", 14)} ..</span><span></span><button data-open="${esc(parentPath(data.path))}">${icon("folderOpen", 14)} Open</button><span></span></div>`);
    }
    rows.push(...data.items.map((item) => `
      <div class="storage-row">
        <span title="${esc(item.path)}">${icon(item.type === "directory" ? "folder" : "file", 14)} ${esc(item.name)}</span>
        <span>${item.type === "file" ? bytes(item.size) : "folder"}</span>
        <button data-open="${esc(item.path)}">${icon(item.type === "directory" ? "folderOpen" : "folder", 14)} ${item.type === "directory" ? "Open" : "Move"}</button>
        <button class="danger" data-delete="${esc(item.path)}">${icon("trash", 14)} Delete</button>
      </div>
    `));
    qs("#storage-list").innerHTML = rows.length ? rows.join("") : `<div class="muted">Download folder is empty.</div>`;
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function moveStorageItem(path) {
  const name = path.split("/").pop();
  const destination = window.prompt("Move to full path:", `${state.storagePath}/${name}`);
  if (!destination || destination === path) return;
  await api("/api/files/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: path, destination }),
  });
  await loadStorage();
}

async function deleteStorageItem(path) {
  if (!window.confirm(`Delete ${path}?`)) return;
  await api("/api/files", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  await loadStorage();
}

async function loadSettings() {
  try {
    const settings = await api("/api/settings");
    state.settings = settings;
    try {
      state.uiSettings = { ...state.uiSettings, ...JSON.parse(localStorage.getItem("riptide_ui_settings") || "{}") };
    } catch {
      localStorage.removeItem("riptide_ui_settings");
    }
    applyThemeOverride();
    applyTheme();
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
qs("#storage-toggle").onclick = async () => {
  qs("#storage-panel").classList.toggle("hidden");
  if (!qs("#storage-panel").classList.contains("hidden")) await loadStorage(qs("#storage-path").value || state.storagePath);
};
qs("#storage-refresh").onclick = () => loadStorage(qs("#storage-path").value);
qs("#pause-selected").onclick = () => state.selectedId && act(`/api/torrents/${state.selectedId}/pause`, "POST");
qs("#resume-selected").onclick = () => state.selectedId && act(`/api/torrents/${state.selectedId}/resume`, "POST");
qs("#delete-selected").onclick = () => state.selectedId && deleteTorrent(state.selectedId);
qs("#search").oninput = renderList;
qs("#logout").onclick = async () => {
  await api("/api/auth/logout", { method: "POST" });
  showLogin();
};

document.querySelectorAll("[data-screen]").forEach((button) => {
  button.onclick = () => setScreen(button.dataset.screen);
});

qs("#global-search-run").onclick = runGlobalSearch;
qs("#global-search").addEventListener("keydown", (event) => {
  if (event.key === "Enter") runGlobalSearch();
});
qs("#search-results").onclick = async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.selectTorrent) {
    setScreen("torrents");
    await selectTorrent(button.dataset.selectTorrent);
  }
  if (button.dataset.openFile) {
    setScreen("torrents");
    qs("#storage-panel").classList.remove("hidden");
    const path = button.dataset.openFile;
    await loadStorage(path.split("/").slice(0, -1).join("/") || state.storagePath);
  }
};

qs("#rss-add-feed").onclick = addRssFeed;
qs("#rss-rules-toggle").onclick = () => {
  state.rssShowRules = !state.rssShowRules;
  renderRss();
};
qs("#rss-feeds").onclick = (event) => {
  const button = event.target.closest("[data-feed-id]");
  if (!button) return;
  state.rssSelectedFeed = Number(button.dataset.feedId);
  state.rssShowRules = false;
  renderRss();
  loadRssItems(state.rssSelectedFeed);
};
qs("#rss-panel").onclick = async (event) => {
  const toggleRule = event.target.closest("[data-toggle-rule]");
  const toggleFeed = event.target.closest("[data-toggle-feed]");
  const refreshFeed = event.target.closest("[data-refresh-feed]");
  if (refreshFeed) {
    await loadRssItems(Number(refreshFeed.dataset.refreshFeed));
    return;
  }
  if (toggleRule) {
    const rule = state.rssRules.find((item) => item.id === Number(toggleRule.dataset.toggleRule));
    await api(`/api/rss/rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    await loadRss();
  }
  if (toggleFeed) {
    const feed = state.rssFeeds.find((item) => item.id === Number(toggleFeed.dataset.toggleFeed));
    await api(`/api/rss/feeds/${feed.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !feed.active }),
    });
    await loadRss();
  }
};

document.querySelectorAll(".settings-section").forEach((button) => {
  button.onclick = () => {
    state.settingsSection = button.dataset.section;
    document.querySelectorAll(".settings-section").forEach((el) => el.classList.remove("active"));
    button.classList.add("active");
    renderSettingsScreen();
  };
});

qs("#storage-list").onclick = async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const open = button.dataset.open;
  const del = button.dataset.delete;
  if (open && button.textContent.includes("Move")) return moveStorageItem(open);
  if (open) return loadStorage(open);
  if (del) return deleteStorageItem(del);
};

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.onclick = () => {
    state.screen = "torrents";
    state.filter = button.dataset.filter;
    state.label = null;
    document.querySelectorAll(".nav,.label").forEach((el) => el.classList.remove("active"));
    setScreen("torrents");
    button.classList.add("active");
    renderList();
  };
});

document.querySelectorAll("[data-label]").forEach((button) => {
  button.onclick = () => {
    state.screen = "torrents";
    state.label = button.dataset.label;
    state.filter = "all";
    document.querySelectorAll(".nav,.label").forEach((el) => el.classList.remove("active"));
    setScreen("torrents");
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

qs("#settings-screen-form").addEventListener("click", async (event) => {
  const settingToggle = event.target.closest("[data-setting-toggle]");
  const uiToggle = event.target.closest("[data-ui-toggle]");
  const encryption = event.target.closest("[data-encryption]");
  const browse = event.target.closest("[data-browse-download]");
  const theme = event.target.closest("[data-cycle-theme]");
  if (settingToggle) {
    const key = settingToggle.dataset.settingToggle;
    state.settings[key] = !state.settings[key];
    renderSettingsScreen();
  }
  if (uiToggle) {
    const key = uiToggle.dataset.uiToggle;
    state.uiSettings[key] = !state.uiSettings[key];
    localStorage.setItem("riptide_ui_settings", JSON.stringify(state.uiSettings));
    renderSettingsScreen();
  }
  if (encryption) {
    state.uiSettings.encryption = encryption.dataset.encryption;
    localStorage.setItem("riptide_ui_settings", JSON.stringify(state.uiSettings));
    renderSettingsScreen();
  }
  if (browse) {
    const current = qs("#screen_default_download_folder")?.value || state.settings.default_download_folder;
    const next = window.prompt("Default save location:", current);
    if (next) qs("#screen_default_download_folder").value = next;
  }
  if (theme) {
    state.uiSettings.theme = state.uiSettings.theme === "Deep ocean" ? "Pearl light" : "Deep ocean";
    localStorage.setItem("riptide_ui_settings", JSON.stringify(state.uiSettings));
    applyTheme();
    renderSettingsScreen();
  }
});

qs("#settings-screen-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {};
  if (state.settingsSection === "downloads") {
    payload.default_download_folder = qs("#screen_default_download_folder")?.value || state.settings.default_download_folder;
    payload.max_active_downloads = Number(qs("#screen_max_active_downloads")?.value || state.settings.max_active_downloads);
  }
  if (state.settingsSection === "bandwidth") {
    payload.global_download_limit = toBytes(qs("#screen_global_download_limit")?.value || 0, "kb");
    payload.global_upload_limit = toBytes(qs("#screen_global_upload_limit")?.value || 0, "kb");
  }
  if (state.settingsSection === "connection") {
    payload.dht_enabled = state.settings.dht_enabled;
    payload.upnp_enabled = state.settings.upnp_enabled;
    payload.lsd_enabled = state.settings.lsd_enabled;
  }
  if (!Object.keys(payload).length) {
    localStorage.setItem("riptide_ui_settings", JSON.stringify(state.uiSettings));
    showMessage("Settings saved");
    return;
  }
  try {
    state.settings = await api("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showMessage("Settings saved");
    renderSettingsScreen();
    await loadSystem();
  } catch (error) {
    showMessage(error.message, true);
  }
});

qs("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: qs("#login-username").value.trim(),
        password: qs("#login-password").value,
      }),
    });
    event.target.reset();
    hideLogin();
    await boot();
  } catch (error) {
    showLogin(error.message);
  }
});

async function boot() {
  try {
    await api("/api/auth/me");
    hideLogin();
    await loadSettings();
    await loadSystem();
    await loadTorrents();
  } catch {
    showLogin();
  }
}

applyThemeOverride();
applyTheme();
applyStaticIcons();
boot();
setInterval(() => state.authenticated && loadTorrents(), 2000);
setInterval(() => state.authenticated && loadSystem(), 10000);
