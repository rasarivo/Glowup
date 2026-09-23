// Captures d'écran des fiches App Store (6,9" : 1290 × 2796) et Google Play (1080 × 1920),
// prises sur la vraie application (www/) avec des données de démonstration.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const www = path.join(root, "www", "index.html");
const outDir = path.resolve(root, "../store/screenshots");
const rawDir = path.join(outDir, "raw");
if (!fs.existsSync(www)) throw new Error("Lance d'abord : npm run build:web");
fs.mkdirSync(rawDir, { recursive: true });

const y = new Date().getFullYear();
const d = (m, day) => `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const demo = {
  profile: { prenom:"Camille", etat:"creee", siret:"91234567800015", activiteDesc:"Création de sites web et accompagnement digital pour les artisans", activite:"liberal", reglementee:false, batiment:false, situation:"chomage", clients:"mixte", lieu:"domicile", enLigne:true, ue:false, dateDebut:d(3,1), periodicite:"trimestrielle", vl:"oui", acre:"oui", tva:"franchise" },
  steps: { p_eligibilite:true, p_chomage:true, p_domicile:true, p_nom:true, p_simulation:true, p_vl:true, p_acre_elig:true, d_pieces:true, d_guichet:true, d_acre:true, a_siret:true, a_urssaf:true, a_impots:true, a_banque:true, a_livre:true, f_mentions:true },
  entreprise: { nom:"Camille MARTIN EI", nomCommercial:"Atelier Pixel", adresse:"12 rue des Lilas", cp:"69003", ville:"Lyon", siret:"91234567800015", email:"contact@atelier-pixel.fr", tel:"06 12 34 56 78", iban:"FR76 3000 6000 0112 3456 7890 189", bic:"AGRIFRPP", assurance:"", tvaIntra:"", penalites:"3 fois le taux d'intérêt légal", delai:30, mediateur:"CM2C — www.cm2c.net" },
  clients: [
    { id:"c1", type:"pro", nom:"Boulangerie Dupont SARL", siren:"812345678", adresse:"4 place Bellecour", cp:"69002", ville:"Lyon", pays:"France", email:"", tvaIntra:"" },
    { id:"c2", type:"pro", nom:"Menuiserie Lambert", siren:"798765432", adresse:"8 chemin du Moulin", cp:"69500", ville:"Bron", pays:"France", email:"", tvaIntra:"" },
  ],
  docs: [
    { id:"f1", type:"facture", numero:`F-${y}-0007`, date:d(9,2), clientId:"c1", objet:"Site vitrine + référencement local", lignes:[{ designation:"Site vitrine 5 pages", qte:1, pu:1400, nature:"service" },{ designation:"Fiche Google Business optimisée", qte:1, pu:250, nature:"service" }], dateOperation:d(8,29), echeance:d(10,2), validite:"", adresseLivraison:"", notes:"" },
    { id:"f2", type:"facture", numero:`F-${y}-0006`, date:d(8,12), clientId:"c2", objet:"Maintenance mensuelle", lignes:[{ designation:"Maintenance et mises à jour", qte:3, pu:90, nature:"service" }], dateOperation:d(8,12), echeance:d(9,11), payeLe:d(9,8), modePaiement:"Virement", validite:"", adresseLivraison:"", notes:"" },
    { id:"d1", type:"devis", numero:`D-${y}-0004`, date:d(9,15), clientId:"c2", objet:"Boutique en ligne", lignes:[{ designation:"Boutique en ligne (20 produits)", qte:1, pu:2400, nature:"service" }], dateOperation:d(10,15), echeance:"", validite:d(10,15), adresseLivraison:"", notes:"" },
  ],
  recettes: [[3,900],[4,1250],[5,1600],[6,1480],[7,2100],[8,1900],[9,2270]].map(([m, v], i) => ({ id:"r"+i, date:d(m, 20), client:"Clients divers", nature:"Prestations web", montant:v, mode:"Virement", ref:"" })),
  achats: [],
  actions: [
    { id:"a1", titre:"Choisir ma plateforme agréée", echeance:d(10,15), detail:"Comparer 3 offres gratuites pour micro-entrepreneurs.", done:false },
    { id:"a2", titre:"Récupérer le SIREN de mes 6 clients pros", echeance:d(10,31), detail:"", done:false },
    { id:"a3", titre:"Augmenter mon tarif journalier à 380 €", echeance:"", detail:"", done:true },
  ],
  messages: [
    { role:"user", content:"Comment fixer mes prix en tenant compte des cotisations ?" },
    { role:"assistant", content:"En libéral, tu reverses **25,6 %** de ton CA en cotisations (19,2 % pendant ta période ACRE) + 2,2 % de versement libératoire.\n\n### Ton prix plancher\n- Revenu visé : 2 500 € nets / mois\n- CA nécessaire : 2 500 / (1 - 0,278) ≈ **3 460 € / mois**\n- Sur 12 jours facturés : **290 € / jour minimum**\n\nTon tarif actuel (250 €) est en dessous : tu travailles 2 jours par mois « gratuitement ».\n```action\n{\"titre\":\"Augmenter mon tarif journalier à 380 €\",\"echeance\":\"\",\"detail\":\"\"}\n```\n```suggestions\n[\"Comment l'annoncer à mes clients ?\",\"Et avec la TVA ?\"]\n```" },
  ],
  objectif: "24000",
  aiConsent: d(9,1),
};

const shots = [
  { id:"01-demarches", tab:"creation", title:"Toutes vos démarches,\nsans en oublier une", sub:"Une feuille de route adaptée à votre situation" },
  { id:"02-facture", tab:"factures", open:"facture", title:"Des factures conformes\nen une minute", sub:"Mentions obligatoires vérifiées automatiquement" },
  { id:"03-reforme", tab:"factures", sub2:"reforme", title:"Prêt pour la facture\nélectronique", sub:"Réception en 2026, émission en 2027" },
  { id:"04-suivi", tab:"suivi", title:"Votre activité\nsuivie de près", sub:"CA, cotisations, seuils de TVA, échéances" },
  { id:"05-conseiller", tab:"conseil", title:"Un conseiller expert\ndisponible 24 h/24", sub:"Prix, démarches, courriers, développement" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{ width:430, height:932 }, deviceScaleFactor:3, locale:"fr-FR", timezoneId:"Europe/Paris" });
const page = await ctx.newPage();
await page.goto("file://" + www);
await page.evaluate((data) => { localStorage.clear(); localStorage.setItem("capmicro_data", JSON.stringify(data)); localStorage.setItem("capmicro_api_key", "demo"); localStorage.setItem("capmicro_install_dismissed", "1"); }, demo);

for (const s of shots) {
  await page.evaluate((tab) => localStorage.setItem("capmicro_tab", tab), s.tab);
  await page.reload();
  await page.waitForSelector("nav");
  if (s.sub2 === "reforme") await page.getByRole("button", { name:"⚡ Réforme" }).click();
  if (s.open === "facture") { await page.getByText(`F-${y}-0007`).first().click(); await page.getByText("Aperçu / PDF").click(); }
  await page.addStyleTag({ content: ".web-only{display:none}" });
  await page.waitForTimeout(700); // fin des animations
  await page.screenshot({ path: path.join(rawDir, s.id + ".png") });
}

// Habillage marketing : titre + capture dans un cadre
async function frame(s, W, H, dir) {
  fs.mkdirSync(dir, { recursive:true });
  const img = "data:image/png;base64," + fs.readFileSync(path.join(rawDir, s.id + ".png")).toString("base64");
  const k = W / 1290;
  const top = Math.round(H * 0.215);
  const shotW = Math.round(Math.min(W * 0.78, (H - top - 40 * k) * 430 / 932)), shotH = Math.round(shotW * 932 / 430);
  const html = `<html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;background:linear-gradient(165deg,#0b1220,#12213a 55%,#0c1526);font-family:Georgia,'DejaVu Serif',serif">
    <div style="position:absolute;top:-10%;right:-20%;width:${W*0.9}px;height:${W*0.9}px;border-radius:50%;background:radial-gradient(circle,rgba(52,211,153,0.18),transparent 70%)"></div>
    <div style="position:absolute;top:${Math.round(H*0.045)}px;left:0;right:0;text-align:center;color:#edf1f7;font-size:${Math.round(92*k)}px;line-height:1.15;white-space:pre-line">${s.title}</div>
    <div style="position:absolute;top:${Math.round(H*0.045 + 245*k)}px;left:0;right:0;text-align:center;color:#fbbf24;font-size:${Math.round(46*k)}px">${s.sub}</div>
    <img src="${img}" style="position:absolute;left:${(W-shotW)/2}px;top:${top}px;width:${shotW}px;height:${shotH}px;border-radius:${Math.round(60*k)}px;border:${Math.max(4,Math.round(10*k))}px solid rgba(255,255,255,0.14);box-shadow:0 30px 90px rgba(0,0,0,0.55)">
  </body></html>`;
  const p = await browser.newPage({ viewport:{ width:W, height:H } });
  await p.setContent(html);
  await p.screenshot({ path: path.join(dir, s.id + ".png") });
  await p.close();
}
for (const s of shots) {
  await frame(s, 1290, 2796, path.join(outDir, "app-store-6.9"));
  await frame(s, 1080, 1920, path.join(outDir, "google-play"));
}
await browser.close();
console.log("✓ captures dans store/screenshots/");
