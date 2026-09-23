// Visuels des posts (1080 × 1350, format portrait Instagram / Facebook / LinkedIn), rendus en HTML par Chromium.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function html(v, iconB64) {
  const points = (v.points || []).slice(0, 4);
  const titleSize = v.titre.length > 60 ? 74 : v.titre.length > 35 ? 88 : 104;
  return `<html><body style="margin:0;width:1080px;height:1350px;overflow:hidden;font-family:Georgia,'DejaVu Serif',serif;color:#edf1f7;
    background:linear-gradient(160deg,#0b1220,#12213a 55%,#0c1526);position:relative">
    <div style="position:absolute;top:-220px;right:-260px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(52,211,153,0.2),transparent 70%)"></div>
    <div style="position:absolute;left:84px;right:84px;top:110px">
      <div style="font-size:30px;letter-spacing:6px;text-transform:uppercase;color:#fbbf24;margin-bottom:34px">${esc(v.surtitre)}</div>
      <div style="font-size:${titleSize}px;line-height:1.1;margin-bottom:34px">${esc(v.titre)}</div>
      <div style="font-size:40px;line-height:1.35;color:rgba(237,241,247,0.72);margin-bottom:46px">${esc(v.sousTitre)}</div>
      ${points.map(p => `<div style="display:flex;gap:22px;align-items:flex-start;font-size:38px;line-height:1.35;margin-bottom:24px">
        <span style="flex-shrink:0;width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#fbbf24,#34d399,#818cf8);color:#0b1220;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:700;margin-top:2px">✓</span>
        <span>${esc(p)}</span></div>`).join("")}
    </div>
    <div style="position:absolute;left:84px;right:84px;bottom:80px;display:flex;align-items:center;gap:22px;border-top:1px solid rgba(255,255,255,0.14);padding-top:36px">
      <img src="data:image/png;base64,${iconB64}" style="width:86px;height:86px;border-radius:20px">
      <div><div style="font-size:40px">Cap Micro</div><div style="font-size:28px;color:rgba(237,241,247,0.6)">Le copilote de l'auto-entrepreneur</div></div>
    </div>
  </body></html>`;
}

export async function rendreVisuels(posts, dossier, iconPath) {
  const avecVisuel = posts.filter(p => p.visuel);
  if (!avecVisuel.length) return;
  fs.mkdirSync(dossier, { recursive: true });
  const iconB64 = fs.readFileSync(iconPath).toString("base64");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const p of avecVisuel) {
    await page.setContent(html(p.visuel, iconB64));
    p.fichierVisuel = path.join(dossier, `${p.reseau}.png`);
    await page.screenshot({ path: p.fichierVisuel });
  }
  await browser.close();
}
