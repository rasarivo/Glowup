// Construit mobile/www/ à partir de ../cap-micro.html pour l'app iOS/Android :
// - précompile le JSX (plus de Babel dans le navigateur : démarrage rapide)
// - embarque React, Capacitor, jsPDF et html2canvas en local (fonctionne hors ligne, aucun CDN)
// - injecte la configuration mobile (proxy du Conseiller IA)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Babel = require("@babel/standalone");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.resolve(root, "../cap-micro.html");
const out = path.join(root, "www");
const nm = path.join(root, "node_modules");

// Configuration : app.config.json, surchargée par les variables d'environnement (CI)
const cfgFile = path.join(root, "app.config.json");
const fileCfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, "utf8")) : {};
const config = {
  aiProxyUrl: process.env.CAPMICRO_AI_PROXY_URL ?? fileCfg.aiProxyUrl ?? "",
  aiClientToken: process.env.CAPMICRO_AI_CLIENT_TOKEN ?? fileCfg.aiClientToken ?? "",
  vendor: { jspdf: "vendor/jspdf.umd.min.js", html2canvas: "vendor/html2canvas.min.js" },
};

const vendors = {
  "react.production.min.js": "react/umd/react.production.min.js",
  "react-dom.production.min.js": "react-dom/umd/react-dom.production.min.js",
  "capacitor.js": "@capacitor/core/dist/capacitor.js",
  "jspdf.umd.min.js": "jspdf/dist/jspdf.umd.min.js",
  "html2canvas.min.js": "html2canvas/dist/html2canvas.min.js",
};

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "vendor"), { recursive: true });
for (const [name, rel] of Object.entries(vendors)) fs.copyFileSync(path.join(nm, rel), path.join(out, "vendor", name));

let html = fs.readFileSync(src, "utf8");

// 1. Extraire et compiler le script JSX
const m = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!m) throw new Error("Script JSX introuvable dans cap-micro.html");
const compiled = Babel.transform(m[1], { presets: [["react", { runtime: "classic" }]], compact: false }).code;
fs.writeFileSync(path.join(out, "app.js"), compiled);

// 2. Remplacer les scripts CDN par les copies locales
html = html
  .replace(/\s*<script[^>]*unpkg\.com\/react@18[^>]*><\/script>/, '\n  <script src="vendor/react.production.min.js"></script>')
  .replace(/\s*<script[^>]*unpkg\.com\/react-dom@18[^>]*><\/script>/, '\n  <script src="vendor/react-dom.production.min.js"></script>')
  .replace(/\s*<script[^>]*unpkg\.com\/@babel\/standalone[^>]*><\/script>/, '\n  <script src="vendor/capacitor.js"></script>')
  .replace(/\s*<link rel="manifest"[^>]*>/, "")
  .replace(m[0], `<script>window.CAPMICRO_CONFIG = ${JSON.stringify(config)};</script>\n  <script src="app.js"></script>`);

if (/unpkg\.com/.test(html.replace(/window\.CAPMICRO_CONFIG[^\n]*/, ""))) throw new Error("Une dépendance CDN subsiste dans www/index.html");
fs.writeFileSync(path.join(out, "index.html"), html);

const kb = (f) => Math.round(fs.statSync(f).size / 1024);
console.log(`www/ construit — app.js ${kb(path.join(out, "app.js"))} Ko · proxy IA : ${config.aiProxyUrl || "(aucun : clé personnelle)"}`);
