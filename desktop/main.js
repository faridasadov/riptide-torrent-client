const { app, BrowserWindow, shell, dialog, Menu, Tray, nativeImage, ipcMain } = require("electron");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BackendPort = process.env.RIPTIDE_BACKEND_PORT || "8123";
const BackendHost = process.env.RIPTIDE_BACKEND_HOST || "127.0.0.1";
const BackendUsername = process.env.TORRENT_CLIENT_USERNAME || "admin";
const BackendPassword = process.env.TORRENT_CLIENT_PASSWORD || "admin";
const RiptideUrl = process.env.RIPTIDE_URL || `http://${BackendHost}:${BackendPort}`;
const AppIcon = path.join(__dirname, "assets", process.platform === "win32" ? "icon.ico" : "icon.png");

let pendingOpenPath = null;
let pendingMagnet = null;
let pendingUiCommands = [];
let backendProcess = null;
let mainWindow = null;
let tray = null;
let trayPollTimer = null;
let trayAnimationTick = 0;
let isQuitting = false;
let hasShownTrayHint = false;
const TrayBaseIcon = nativeImage.createFromPath(AppIcon).resize({ width: 16, height: 16 });

function captureLaunchArgs(argv = []) {
  const torrentFile = argv.find((arg) => arg.endsWith(".torrent") && path.isAbsolute(arg));
  const magnet = argv.find((arg) => arg.startsWith("magnet:?"));
  if (torrentFile) pendingOpenPath = torrentFile;
  if (magnet) pendingMagnet = magnet;
}

function authHeaders() {
  return {
    Authorization: `Basic ${Buffer.from(`${BackendUsername}:${BackendPassword}`).toString("base64")}`,
  };
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

function statusDotColor(active) {
  return active ? "#1fe3c0" : "#68778f";
}

function createTrayImage(downloadRate = 0, uploadRate = 0, tick = 0) {
  const active = downloadRate > 0 || uploadRate > 0;
  const pulse = active ? 0.55 + ((tick % 4) * 0.12) : 0.34;
  const dlHeight = Math.max(3, Math.min(9, Math.round(Math.log2(downloadRate + 1024) - 7)));
  const ulHeight = Math.max(3, Math.min(9, Math.round(Math.log2(uploadRate + 1024) - 7)));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect x="1" y="1" width="14" height="14" rx="4" fill="#0b1118" stroke="#233244"/>
      <rect x="4" y="${13 - dlHeight}" width="3" height="${dlHeight}" rx="1" fill="#1fe3c0"/>
      <rect x="9" y="${13 - ulHeight}" width="3" height="${ulHeight}" rx="1" fill="#ff7a66"/>
      <circle cx="12.6" cy="3.4" r="1.6" fill="${statusDotColor(active)}" opacity="${pulse.toFixed(2)}"/>
    </svg>
  `.trim();
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}

function trayIconFor(downloadRate = 0, uploadRate = 0, tick = 0) {
  const generated = createTrayImage(downloadRate, uploadRate, tick);
  return generated.isEmpty() ? TrayBaseIcon : generated;
}

function getMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  mainWindow = BrowserWindow.getAllWindows()[0] || null;
  return mainWindow;
}

function showMainWindow() {
  const win = getMainWindow();
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function queueUiCommand(command, payload = {}) {
  pendingUiCommands.push({ command, ...payload });
  flushUiCommands();
}

function flushUiCommands() {
  const win = getMainWindow();
  if (!win || win.webContents.isLoadingMainFrame()) return;
  showMainWindow();
  while (pendingUiCommands.length) {
    win.webContents.send("riptide:navigate", pendingUiCommands.shift());
  }
}

function applyPendingLaunchArgs() {
  if (pendingMagnet) {
    queueUiCommand("magnet", { magnet: pendingMagnet });
    pendingMagnet = null;
  }
  if (pendingOpenPath) {
    queueUiCommand("torrent-file", { path: pendingOpenPath });
    pendingOpenPath = null;
  }
}

function navigateTo(screen, options = {}) {
  if (screen) queueUiCommand("screen", { screen });
  if (options.about) queueUiCommand("about");
}

function minimizeToTray() {
  const win = getMainWindow();
  if (!win) return;
  win.hide();
  if (process.platform === "win32" && tray && !hasShownTrayHint) {
    tray.displayBalloon({
      title: "Riptide",
      content: "Riptide is still running in the notification area.",
      iconType: "info",
    });
    hasShownTrayHint = true;
  }
}

function installAppMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        { label: "Open Riptide", click: () => showMainWindow() },
        { type: "separator" },
        { label: "Exit", click: () => requestQuit() },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { label: "Show", click: () => showMainWindow() },
        { label: "Minimize to Tray", click: () => minimizeToTray() },
      ],
    },
    {
      label: "Help",
      submenu: [
        { label: "Open Help", click: () => navigateTo("help") },
        { label: "About Riptide", click: () => queueUiCommand("about") },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  const win = getMainWindow();
  if (win) win.setMenu(menu);
}

function bundledBackendPath() {
  const executable = process.platform === "win32" ? "riptide-backend.exe" : "riptide-backend";
  return path.join(process.resourcesPath, "backend", executable);
}

function canStartBundledBackend() {
  return app.isPackaged && fs.existsSync(bundledBackendPath()) && !process.env.RIPTIDE_URL;
}

function cleanupStaleBackends() {
  if (process.platform !== "win32") return;
  try {
    spawnSync("taskkill", ["/IM", "riptide-backend.exe", "/T", "/F"], { windowsHide: true });
  } catch {
    // ignore stale cleanup failures
  }
}

function startBundledBackend() {
  if (!canStartBundledBackend()) return Promise.resolve();
  cleanupStaleBackends();

  const dataDir = path.join(app.getPath("userData"), "data");
  const downloadDir = path.join(app.getPath("downloads"), "Riptide");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(downloadDir, { recursive: true });

  backendProcess = spawn(bundledBackendPath(), [], {
    windowsHide: true,
    env: {
      ...process.env,
      RIPTIDE_BACKEND_HOST: BackendHost,
      RIPTIDE_BACKEND_PORT: BackendPort,
      TORRENT_CLIENT_DATA_DIR: dataDir,
      TORRENT_CLIENT_DEFAULT_DOWNLOAD_DIR: downloadDir,
      TORRENT_CLIENT_ALLOWED_DOWNLOAD_ROOTS: downloadDir,
      TORRENT_CLIENT_USERNAME: BackendUsername,
      TORRENT_CLIENT_PASSWORD: BackendPassword,
      TORRENT_CLIENT_CORS_ORIGINS: RiptideUrl,
    },
    stdio: "ignore",
  });

  backendProcess.on("exit", () => {
    backendProcess = null;
  });

  return waitForBackend();
}

function waitForBackend(deadline = Date.now() + 20000) {
  return fetch(`${RiptideUrl}/api/health`, { headers: authHeaders() })
    .then(() => undefined)
    .catch((error) => {
      if (Date.now() > deadline) throw error;
      return new Promise((resolve) => setTimeout(resolve, 300)).then(() => waitForBackend(deadline));
    });
}

async function pollTrayStats() {
  if (!tray) return;
  trayAnimationTick += 1;
  try {
    const response = await fetch(`${RiptideUrl}/api/torrents`, { headers: authHeaders() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const torrents = await response.json();
    const down = torrents.reduce((sum, torrent) => sum + Number(torrent.download_speed || 0), 0);
    const up = torrents.reduce((sum, torrent) => sum + Number(torrent.upload_speed || 0), 0);
    const active = torrents.filter((torrent) => {
      const status = String(torrent.status || "").toLowerCase();
      return Number(torrent.download_speed || 0) > 0 || Number(torrent.upload_speed || 0) > 0 || status.includes("downloading");
    }).length;
    tray.setImage(trayIconFor(down, up, trayAnimationTick));
    tray.setToolTip(`Riptide\nDL ${bytes(down)}/s\nUL ${bytes(up)}/s\n${active} active`);
  } catch {
    tray.setImage(trayIconFor(0, 0, trayAnimationTick));
    tray.setToolTip("Riptide");
  }
}

function createTray() {
  if (tray || process.platform !== "win32") return;
  tray = new Tray(TrayBaseIcon.isEmpty() ? trayIconFor() : TrayBaseIcon);
  tray.setToolTip("Riptide");
  tray.on("click", () => showMainWindow());
  tray.on("double-click", () => showMainWindow());
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Riptide", click: () => showMainWindow() },
    { label: "Open Help", click: () => navigateTo("help") },
    { label: "About Riptide", click: () => queueUiCommand("about") },
    { type: "separator" },
    { label: "Quit", click: () => requestQuit() },
  ]));
  trayPollTimer = setInterval(() => {
    pollTrayStats();
  }, 2500);
  pollTrayStats();
}

function stopTray() {
  if (trayPollTimer) {
    clearInterval(trayPollTimer);
    trayPollTimer = null;
  }
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

function terminateBackend() {
  if (!backendProcess) return Promise.resolve();
  const pid = backendProcess.pid;
  return new Promise((resolve) => {
    backendProcess.once("exit", () => {
      backendProcess = null;
      resolve();
    });
    try {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
      } else {
        backendProcess.kill("SIGTERM");
      }
    } catch {
      backendProcess = null;
      resolve();
    }
    setTimeout(() => {
      backendProcess = null;
      resolve();
    }, 4000);
  });
}

async function requestQuit() {
  if (isQuitting) return;
  isQuitting = true;
  stopTray();
  BrowserWindow.getAllWindows().forEach((win) => {
    win.removeAllListeners("close");
    win.destroy();
  });
  await terminateBackend();
  app.exit(0);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    title: "Riptide",
    icon: AppIcon,
    backgroundColor: "#0b1118",
    autoHideMenuBar: false,
    webPreferences: {
      preload: `${__dirname}/preload.js`,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  installAppMenu();

  mainWindow.on("minimize", (event) => {
    if (process.platform !== "win32") return;
    event.preventDefault();
    minimizeToTray();
  });

  mainWindow.on("close", (event) => {
    if (isQuitting || process.platform !== "win32") return;
    event.preventDefault();
    minimizeToTray();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-finish-load", () => {
    flushUiCommands();
    applyPendingLaunchArgs();
  });

  mainWindow.webContents.on("did-fail-load", () => {
    dialog.showErrorBox("Riptide", `Could not load ${RiptideUrl}. Start the backend first or set RIPTIDE_URL.`);
  });

  mainWindow.loadURL(RiptideUrl);
}

captureLaunchArgs(process.argv);

if (process.platform === "win32") {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.commandLine.appendSwitch("disable-d3d11");
  app.commandLine.appendSwitch("disable-features", "UseSkiaRenderer");
  app.setAppUserModelId("app.riptide.desktop");
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

ipcMain.on("riptide:hide-to-tray", () => {
  minimizeToTray();
});

app.whenReady()
  .then(startBundledBackend)
  .then(() => {
    createWindow();
    createTray();
  })
  .catch((error) => {
    dialog.showErrorBox("Riptide", `Could not start Riptide backend: ${error.message}`);
    app.quit();
  });

app.on("second-instance", (_event, argv) => {
  captureLaunchArgs(argv);
  showMainWindow();
  applyPendingLaunchArgs();
});

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  pendingOpenPath = filePath;
  applyPendingLaunchArgs();
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  pendingMagnet = url;
  applyPendingLaunchArgs();
});

app.whenReady().then(() => {
  if (process.defaultApp) {
    if (process.argv.length >= 2) app.setAsDefaultProtocolClient("magnet", process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient("magnet");
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform === "win32" && !isQuitting) return;
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    showMainWindow();
  }
});
