const { app, BrowserWindow, protocol } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const ASSET_MARKER = "/__l5e/assets-v1/";

function pathFromFileUrl(url) {
  let pathname = decodeURIComponent(new URL(url).pathname);
  if (process.platform === "win32" && /^\/[a-zA-Z]:/.test(pathname)) pathname = pathname.slice(1);
  return pathname;
}

function createWindow() {
  const candidates = [
    path.join(__dirname, "..", "dist", "client", "index.html"),
    path.join(__dirname, "..", "dist", "index.html"),
  ];
  const indexPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!indexPath) throw new Error("BSOD_defense could not find its packaged index.html");

  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 480,
    title: "BSOD_defense",
    autoHideMenuBar: true,
    backgroundColor: "#008080",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.once("ready-to-show", () => window.show());
  window.setMenuBarVisibility(false);
  window.loadFile(indexPath);
}

app.whenReady().then(() => {
  protocol.interceptFileProtocol("file", (request, callback) => {
    const decodedUrl = decodeURIComponent(request.url);
    if (decodedUrl.includes(ASSET_MARKER)) {
      const relativeAsset = decodedUrl.split(ASSET_MARKER)[1].split("?")[0];
      callback({ path: path.join(__dirname, "assets", relativeAsset) });
      return;
    }
    callback({ path: pathFromFileUrl(request.url) });
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
