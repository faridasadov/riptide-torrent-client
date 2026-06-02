const { contextBridge, ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.desktop = "electron";
});

contextBridge.exposeInMainWorld("riptideDesktop", {
  onNavigate(handler) {
    if (typeof handler !== "function") return () => {};
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on("riptide:navigate", listener);
    return () => ipcRenderer.removeListener("riptide:navigate", listener);
  },
  hideToTray() {
    ipcRenderer.send("riptide:hide-to-tray");
  },
});
