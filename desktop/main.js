const { app, BrowserWindow, shell } = require("electron");

const RiptideUrl = process.env.RIPTIDE_URL || "http://127.0.0.1:8000";

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

  win.loadURL(RiptideUrl);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
