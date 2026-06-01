const { app, BrowserWindow, shell, dialog } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BackendPort = process.env.RIPTIDE_BACKEND_PORT || "8123";
const RiptideUrl = process.env.RIPTIDE_URL || `http://127.0.0.1:${BackendPort}`;
const AppIcon = path.join(__dirname, "assets", process.platform === "win32" ? "icon.ico" : "icon.png");
let pendingOpenPath = null;
let pendingMagnet = null;
let backendProcess = null;

function captureLaunchArgs(argv = []) {
  const torrentFile = argv.find((arg) => arg.endsWith(".torrent") && path.isAbsolute(arg));
  const magnet = argv.find((arg) => arg.startsWith("magnet:?"));
  if (torrentFile) pendingOpenPath = torrentFile;
  if (magnet) pendingMagnet = magnet;
}

captureLaunchArgs(process.argv);

if (process.platform === "win32") {
  app.setAppUserModelId("app.riptide.desktop");
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function targetUrl() {
  if (pendingMagnet) return `${RiptideUrl}/?add=${encodeURIComponent(pendingMagnet)}`;
  if (pendingOpenPath) return `${RiptideUrl}/?addFile=${encodeURIComponent(pendingOpenPath)}`;
  return RiptideUrl;
}

function bundledBackendPath() {
  const executable = process.platform === "win32" ? "riptide-backend.exe" : "riptide-backend";
  return path.join(process.resourcesPath, "backend", executable);
}

function canStartBundledBackend() {
  return app.isPackaged && fs.existsSync(bundledBackendPath()) && !process.env.RIPTIDE_URL;
}

function startBundledBackend() {
  if (!canStartBundledBackend()) return Promise.resolve();

  const dataDir = path.join(app.getPath("userData"), "data");
  const downloadDir = path.join(app.getPath("downloads"), "Riptide");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(downloadDir, { recursive: true });

  backendProcess = spawn(bundledBackendPath(), [], {
    windowsHide: true,
    env: {
      ...process.env,
      RIPTIDE_BACKEND_HOST: "127.0.0.1",
      RIPTIDE_BACKEND_PORT: BackendPort,
      TORRENT_CLIENT_DATA_DIR: dataDir,
      TORRENT_CLIENT_DEFAULT_DOWNLOAD_DIR: downloadDir,
      TORRENT_CLIENT_ALLOWED_DOWNLOAD_ROOTS: downloadDir,
      TORRENT_CLIENT_USERNAME: process.env.TORRENT_CLIENT_USERNAME || "admin",
      TORRENT_CLIENT_PASSWORD: process.env.TORRENT_CLIENT_PASSWORD || "admin",
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
  return fetch(`${RiptideUrl}/api/health`)
    .then(() => undefined)
    .catch((error) => {
      if (Date.now() > deadline) throw error;
      return new Promise((resolve) => setTimeout(resolve, 300)).then(() => waitForBackend(deadline));
    });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    title: "Riptide",
    icon: AppIcon,
    backgroundColor: "#0b1118",
    webPreferences: {
      preload: `${__dirname}/preload.js`,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(targetUrl());

  win.webContents.on("did-fail-load", () => {
    dialog.showErrorBox("Riptide", `Could not load ${RiptideUrl}. Start the backend first or set RIPTIDE_URL.`);
  });
}

app.whenReady()
  .then(startBundledBackend)
  .then(createWindow)
  .catch((error) => {
    dialog.showErrorBox("Riptide", `Could not start Riptide backend: ${error.message}`);
    app.quit();
  });

app.on("second-instance", (_event, argv) => {
  captureLaunchArgs(argv);
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
    win.loadURL(targetUrl());
  }
});

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  pendingOpenPath = filePath;
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  pendingMagnet = url;
});

app.whenReady().then(() => {
  if (process.defaultApp) {
    if (process.argv.length >= 2) app.setAsDefaultProtocolClient("magnet", process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient("magnet");
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
