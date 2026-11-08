const fs = require("node:fs");
const path = require("node:path");

const indexPath = path.join(__dirname, "..", "dist", "client", "index.html");
let html = fs.readFileSync(indexPath, "utf8");
html = html
  .replaceAll('"/./assets/', '"./assets/')
  .replaceAll("'/./assets/", "'./assets/")
  .replaceAll('"/favicon.ico"', '"./favicon.ico"');
fs.writeFileSync(indexPath, html);

const faviconSource = path.join(__dirname, "..", "public", "favicon.ico");
const faviconTarget = path.join(__dirname, "..", "dist", "client", "favicon.ico");
if (fs.existsSync(faviconSource)) fs.copyFileSync(faviconSource, faviconTarget);

console.log("Prepared relative file:// paths for Electron");
