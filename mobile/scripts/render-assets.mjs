// Génère l'icône, l'écran de démarrage et les visuels des stores à partir de SVG (aucun fichier source binaire).
// Sorties : mobile/assets/ (lu par @capacitor/assets) et store/graphics/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const assets = path.join(root, "assets");
const graphics = path.resolve(root, "../store/graphics");
fs.mkdirSync(assets, { recursive: true });
fs.mkdirSync(graphics, { recursive: true });

const BG = "#0b1220";
const defs = `
  <defs>
    <linearGradient id="g" gradientUnits="userSpaceOnUse" x1="230" y1="720" x2="860" y2="238">
      <stop offset="0" stop-color="#fbbf24"/><stop offset="0.5" stop-color="#34d399"/><stop offset="1" stop-color="#818cf8"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.6">
      <stop offset="0" stop-color="#34d399" stop-opacity="0.28"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/>
    </radialGradient>
  </defs>`;
// Courbe de croissance montante terminée par une flèche : « cap » vers la réussite
const mark = `
  <polyline points="230,720 420,530 560,650 755,395" fill="none" stroke="url(#g)" stroke-width="92" stroke-linecap="round" stroke-linejoin="round"/>
  <polygon points="860,238 650,345 818,470" fill="url(#g)"/>
  <circle cx="230" cy="720" r="30" fill="#fbbf24"/>`;

const svg = ({ w, h, bg = true, glow = true, scale = 1, dx = 0, dy = 0, extra = "" }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}
  ${bg ? `<rect width="${w}" height="${h}" fill="${BG}"/>${glow ? `<rect width="${w}" height="${h}" fill="url(#glow)"/>` : ""}` : ""}
  <g transform="translate(${dx},${dy}) scale(${scale})">${mark}</g>${extra}
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(file, markup, w, h, { alpha = false } = {}) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:${alpha ? "transparent" : BG}">${markup}</body></html>`);
  const buf = await page.screenshot({ omitBackground: alpha, clip: { x: 0, y: 0, width: w, height: h } });
  const img = sharp(buf);
  await (alpha ? img.png() : img.flatten({ background: BG }).removeAlpha().png()).toFile(file);
  console.log("✓", path.relative(path.resolve(root, ".."), file));
}

const font = `font-family:Georgia,'DejaVu Serif',serif`;

// Icône (1024, opaque : exigence Apple) + icône adaptative Android (premier plan dans la zone sûre de 66 %)
await render(path.join(assets, "icon-only.png"), svg({ w: 1024, h: 1024 }), 1024, 1024);
await render(path.join(assets, "icon-foreground.png"), svg({ w: 1024, h: 1024, bg: false, scale: 0.62, dx: 195, dy: 195 }), 1024, 1024, { alpha: true });
await render(path.join(assets, "icon-background.png"), `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${defs}<rect width="1024" height="1024" fill="${BG}"/><rect width="1024" height="1024" fill="url(#glow)"/></svg>`, 1024, 1024);

// Écran de démarrage (2732 × 2732, logo centré, fond uni pour rester léger)
const splash = svg({ w: 2732, h: 2732, glow: false, scale: 0.55, dx: 1084, dy: 1000,
  extra: `<text x="1366" y="1720" text-anchor="middle" fill="#edf1f7" style="${font};font-size:120px">Cap Micro</text>` });
await render(path.join(assets, "splash.png"), splash, 2732, 2732);
await render(path.join(assets, "splash-dark.png"), splash, 2732, 2732);

// Visuels des stores
await render(path.join(graphics, "icon-1024.png"), svg({ w: 1024, h: 1024 }), 1024, 1024);
await render(path.join(graphics, "play-icon-512.png"), svg({ w: 1024, h: 1024 }).replace('width="1024" height="1024"', 'width="512" height="512"'), 512, 512);
await render(path.join(graphics, "play-feature-graphic.png"), `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">${defs}
  <rect width="1024" height="500" fill="${BG}"/><rect width="1024" height="500" fill="url(#glow)"/>
  <g transform="translate(40,60) scale(0.36)">${mark}</g>
  <text x="400" y="190" fill="#edf1f7" style="${font};font-size:68px">Cap Micro</text>
  <text x="402" y="250" fill="#fbbf24" style="${font};font-size:28px">Le copilote de l'auto-entrepreneur</text>
  <text x="402" y="320" fill="rgba(237,241,247,0.7)" style="${font};font-size:23px">Démarches · Factures conformes · Suivi du CA</text>
  <text x="402" y="358" fill="rgba(237,241,247,0.7)" style="${font};font-size:23px">Prêt pour la facture électronique</text>
</svg>`, 1024, 500);

await browser.close();
