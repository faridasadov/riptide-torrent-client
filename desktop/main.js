const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("path");

const RiptideUrl = process.env.RIPTIDE_URL || "http://127.0.0.1:8000";
let pendingOpenPath = null;
let pendingMagnet = null;

function captureLaunchArgs(argv = []) {
  const torrentFile = argv.find((arg) => arg.endsWith(".torrent") && path.isAbsolute(arg));
  const magnet = argv.find((arg) => arg.startsWith("magnet:?"));
  if (torrentFile) pendingOpenPath = torrentFile;
  if (magnet) pendingMagnet = magnet;
}

captureLaunchArgs(process.argv);

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function targetUrl() {
  if (pendingMagnet) return `${RiptideUrl}/?add=${encodeURIComponent(pendingMagnet)}`;
  if (pendingOpenPath) return `${RiptideUrl}/?addFile=${encodeURIComponent(pendingOpenPath)}`;
  return RiptideUrl;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    title: "Riptide",
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

app.whenReady().then(createWindow);

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

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
