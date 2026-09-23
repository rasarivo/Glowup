// Agent de promotion de Cap Micro.
//
//   node agent/run.mjs --mode=generer   crée le kit du jour (textes + visuels) dans kits/ et visuels/
//   node agent/run.mjs --mode=publier   publie le kit du jour sur les réseaux configurés (sinon : à publier à la main)
//   node agent/run.mjs --mode=bilan     met à jour les statistiques et réécrit apprentissages.md
//
// Options : --mock (sans appel à Claude), --dry-run (aucune publication), --force (régénère le kit du jour)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { evenementsAVenir, FAITS_REGLEMENTAIRES } from "./calendrier.mjs";
import { rendreVisuels } from "./visuels.mjs";
import * as meta from "./publishers/meta.mjs";
import * as linkedin from "./publishers/linkedin.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const MODE = args.mode || "generer";
const MOCK = !!args.mock, DRY = !!args["dry-run"];

const read = (f, fallback = "") => fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), "utf8") : fallback;
const readJson = (f, fallback) => JSON.parse(read(f, JSON.stringify(fallback)));
const write = (f, content) => { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), content); };
const writeJson = (f, obj) => write(f, JSON.stringify(obj, null, 2) + "\n");

const config = readJson("config.json", {});
const TODAY = args.date || new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }); // AAAA-MM-JJ
const kitJson = `kits/${TODAY}.json`;
const RESEAUX_ACTIFS = Object.entries(config.publication.reseaux).filter(([, r]) => r.actif).map(([n]) => n);

// ── Schéma de sortie de Claude ───────────────────────────────────────────
const Post = z.object({
  reseau: z.enum(["instagram", "facebook", "linkedin", "tiktok", "x"]),
  pilier: z.string().describe("Pilier éditorial utilisé (voir stratégie)"),
  campagne: z.string().describe("Identifiant court du sujet, minuscules et tirets, ex : cfe-15-decembre"),
  accroche: z.string().describe("Première ligne du post"),
  texte: z.string().describe("Texte complet du post, accroche incluse, SANS hashtags ni lien (ajoutés automatiquement)"),
  hashtags: z.array(z.string()).describe("3 à 5 hashtags sans espace, avec #"),
  visuel: z.object({
    surtitre: z.string().describe("2 à 4 mots, ex : ÉCHÉANCE URSSAF"),
    titre: z.string().describe("Message principal, 70 caractères maximum"),
    sousTitre: z.string().describe("Précision, 110 caractères maximum"),
    points: z.array(z.string()).describe("0 à 4 points courts (50 caractères maximum chacun)"),
  }).nullable().describe("Visuel à générer ; null pour un post texte seul (x)"),
  scriptVideo: z.string().nullable().describe("TikTok uniquement : script de vidéo face caméra de 30 à 45 s, découpé en plans ; null sinon"),
});
const Plan = z.object({
  angleDuJour: z.string().describe("En 2 phrases : le sujet choisi aujourd'hui et pourquoi (calendrier, apprentissages)"),
  posts: z.array(Post),
  reponsesTypes: z.array(z.object({ commentaire: z.string(), reponse: z.string() })).describe("3 réponses types aux commentaires probables sur ces posts"),
});
const Bilan = z.object({
  resume: z.string().describe("Résumé de la période en 3 à 5 phrases"),
  apprentissages: z.array(z.string()).describe("5 à 10 apprentissages actionnables (ce qui marche, ce qui ne marche pas)"),
  recommandations: z.array(z.string()).describe("3 à 6 changements à appliquer la semaine prochaine"),
});

// ── Appel à Claude ───────────────────────────────────────────────────────
const client = MOCK ? null : new Anthropic();

async function demander(system, user, schema) {
  const response = await client.beta.messages.parse({
    model: config.modele || "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // si le modèle décline, l'API relance la requête sur un modèle de repli
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: betaZodOutputFormat(schema) },
  });
  if (response.stop_reason === "refusal") throw new Error("Claude a refusé la demande : " + JSON.stringify(response.stop_details));
  if (response.stop_reason === "max_tokens") throw new Error("Réponse tronquée (max_tokens)");
  if (!response.parsed_output) throw new Error("Réponse non conforme au schéma");
  return response.parsed_output;
}

function systemPrompt() {
  const p = config.produit;
  return `Tu es le responsable marketing social de Cap Micro, une application mobile française qui aide les auto-entrepreneurs (micro-entrepreneurs) à créer et gérer leur activité. Ton objectif : maximiser les téléchargements de l'application, en apportant de la vraie valeur aux créateurs et auto-entrepreneurs.

STRATÉGIE (à suivre) :
${read("strategie.md")}

APPRENTISSAGES DES SEMAINES PRÉCÉDENTES (à exploiter) :
${read("apprentissages.md")}

FAITS RÉGLEMENTAIRES FIABLES (les seuls chiffres autorisés) :
${FAITS_REGLEMENTAIRES}

ÉTAT DU PRODUIT :
- Application ${p.gratuit ? "gratuite" : "payante : ne jamais dire gratuite"}.
- ${p.storesEnLigne ? "Disponible sur l'App Store et Google Play." : "PAS ENCORE disponible sur les stores : ne jamais dire « disponible sur l'App Store / Google Play » ; appeler à essayer la version web ou à suivre le compte pour le lancement."}
- Le lien (ajouté automatiquement, ne l'écris pas) mène à la page de l'application.

RÈGLES D'ÉCRITURE PAR RÉSEAU :
- instagram : 600 à 1 200 caractères, aéré, émojis sobres, appel à l'action vers le lien en bio ; visuel obligatoire.
- facebook : 400 à 900 caractères, vouvoiement, visuel obligatoire.
- linkedin : 700 à 1 300 caractères, vouvoiement, ton expert, visuel obligatoire, pas plus de 3 hashtags.
- tiktok : légende de 150 caractères maximum + scriptVideo (accroche dans les 2 premières secondes) + visuel de couverture.
- x : 220 caractères maximum, visuel null.
Chaque post est adapté à son réseau (pas de copier-coller). Varie les accroches : ne réutilise pas une accroche ou une campagne récente.`;
}

// ── Contrôles automatiques avant publication ─────────────────────────────
const INTERDITS = [
  [/garanti/i, "promesse de garantie"],
  [/100\s?%\s*(conforme|légal|sûr)/i, "promesse de conformité"],
  [/\b\d[\d\s.]*\s*(utilisateurs|clients satisfaits|téléchargements|abonnés)/i, "chiffre d'audience non vérifiable"],
  [/(des|plusieurs)\s+(milliers|centaines)\s+d['’]/i, "chiffre d'audience non vérifiable"],
  [/\b(n°\s?1|numéro 1|la meilleure app)/i, "superlatif non prouvable"],
  [/témoign|avis (clients|d'utilisateurs)|nos utilisateurs (disent|adorent)/i, "témoignage non vérifiable"],
  [/cap micro (est|, c'est) une plateforme agréée/i, "Cap Micro n'est pas une plateforme agréée"],
  [/(fait|fais|réalise|effectue|s'occupe de) (toutes )?(vos|tes|les) (démarches|formalités) à (votre|ta) place/i, "l'app ne fait pas les démarches à la place de l'utilisateur"],
];
const LIMITES = { instagram: 2200, facebook: 5000, linkedin: 3000, tiktok: 2200, x: 280 };

function lienCampagne(reseau, campagne) {
  const q = new URLSearchParams({ go: "1", src: reseau, c: campagne });
  return `${config.produit.lienAccueil}?${q}`;
}

function finaliser(post) {
  const campagne = post.campagne.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "post";
  const tags = post.hashtags.map(h => "#" + h.replace(/^#/, "").replace(/\s/g, "")).slice(0, post.reseau === "linkedin" || post.reseau === "facebook" ? 3 : 5);
  const lien = lienCampagne(post.reseau, campagne);
  const t = post.texte.trim();
  const texteFinal = {
    instagram: `${t}\n\n👉 Lien en bio\n\n${tags.join(" ")}`,
    tiktok: `${t} 👉 lien en bio ${tags.join(" ")}`,
    facebook: `${t}\n\n👉 ${lien}\n\n${tags.join(" ")}`,
    linkedin: `${t}\n\n👉 ${lien}`,
    x: `${t} ${lien}`,
  }[post.reseau];

  const raisons = [];
  for (const [re, why] of INTERDITS) if (re.test(post.texte) || re.test(JSON.stringify(post.visuel || {}))) raisons.push(why);
  if (!config.produit.gratuit && /gratuit/i.test(post.texte)) raisons.push("l'app n'est pas gratuite");
  if (!config.produit.storesEnLigne && /(disponible|télécharge\w*).{0,40}(app store|google play|play store)/i.test(post.texte)) raisons.push("les stores ne sont pas encore en ligne");
  const longueur = post.reseau === "x" ? t.length + 1 + 23 : texteFinal.length; // X compte chaque lien pour 23 caractères
  if (longueur > LIMITES[post.reseau]) raisons.push(`texte trop long (${longueur} > ${LIMITES[post.reseau]})`);
  if (["instagram", "facebook", "linkedin", "tiktok"].includes(post.reseau) && !post.visuel) raisons.push("visuel manquant");
  if (!RESEAUX_ACTIFS.includes(post.reseau)) raisons.push("réseau inactif");

  return { ...post, campagne, hashtags: tags, lien, texteFinal, statut: raisons.length ? "rejete" : "pret", raisons };
}

// ── Statistiques ─────────────────────────────────────────────────────────
async function majStats(historique) {
  const limite = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const lecteurs = {
    facebook: meta.facebookConfigure() && meta.statsFacebook,
    instagram: meta.instagramConfigure() && meta.statsInstagram,
    linkedin: linkedin.linkedinConfigure() && linkedin.statsLinkedin,
  };
  for (const p of historique.posts) {
    if (p.statut !== "publie" || !p.id || p.date < limite || !lecteurs[p.reseau]) continue;
    try { p.stats = await lecteurs[p.reseau](p.id); p.statsMaj = TODAY; }
    catch (e) { console.warn(`Stats indisponibles pour ${p.reseau} ${p.id} : ${e.message}`); }
  }
}

const engagement = (s = {}) => (s.reactions || 0) + 3 * (s.commentaires || 0) + 4 * (s.partages || 0) + 4 * (s.enregistrements || 0);

function resumePerformances(historique) {
  const publies = historique.posts.filter(p => p.statut === "publie" && p.stats);
  if (!publies.length) return "Pas encore de statistiques (comptes non connectés ou posts trop récents).";
  const tri = [...publies].sort((a, b) => engagement(b.stats) - engagement(a.stats));
  const ligne = p => `- [${p.reseau}] ${p.date} « ${p.accroche} » (pilier : ${p.pilier}) → ${JSON.stringify(p.stats)}`;
  return `Meilleurs posts :\n${tri.slice(0, 5).map(ligne).join("\n")}\nMoins bons :\n${tri.slice(-3).map(ligne).join("\n")}`;
}

// ── Mode générer ─────────────────────────────────────────────────────────
function planFactice() {
  const base = (reseau, extra = {}) => ({
    reseau, pilier: "Facture électronique", campagne: "reception-factures-2026",
    accroche: "Depuis le 1er septembre, tu dois pouvoir recevoir des factures électroniques.",
    texte: "Depuis le 1er septembre, tu dois pouvoir recevoir des factures électroniques.\n\nMême en franchise de TVA. Il te faut une plateforme agréée : c'est elle qui reçoit les factures de tes fournisseurs.\n\nDans Cap Micro, l'onglet Réforme te dit où tu en es en 4 questions.",
    hashtags: ["#autoentrepreneur", "#factureelectronique", "#microentreprise"],
    visuel: { surtitre: "FACTURE ÉLECTRONIQUE", titre: "Tu dois déjà pouvoir recevoir tes factures", sousTitre: "Obligatoire depuis le 1er septembre 2026, même en franchise de TVA", points: ["Choisis une plateforme agréée", "Vérifie ton inscription à l'annuaire", "Récupère le SIREN de tes clients"] },
    scriptVideo: null, ...extra,
  });
  return {
    angleDuJour: "Mode test : sujet sur la réception des factures électroniques.",
    posts: RESEAUX_ACTIFS.map(r => r === "x" ? base(r, { texte: "Micro-entrepreneur : depuis le 1er septembre, tu dois pouvoir recevoir des factures électroniques, même en franchise de TVA.", visuel: null })
      : r === "tiktok" ? base(r, { texte: "Facture électronique : ce qui a changé le 1er septembre", scriptVideo: "Plan 1 (0-2 s) : « Auto-entrepreneur ? Ça te concerne déjà. »\nPlan 2 : …" }) : base(r)),
    reponsesTypes: [{ commentaire: "Je suis en franchise de TVA, je suis concerné ?", reponse: "Oui : la réception concerne toutes les entreprises assujetties, franchise incluse." }],
  };
}

async function generer() {
  if (fs.existsSync(path.join(ROOT, kitJson)) && !args.force) { console.log(`Le kit du ${TODAY} existe déjà (--force pour le refaire).`); return; }
  const historique = readJson("data/historique.json", { posts: [] });
  await majStats(historique);
  const recents = historique.posts.slice(-40).map(p => `- ${p.date} [${p.reseau}] ${p.campagne} : « ${p.accroche} »`).join("\n") || "aucun";
  const evenements = evenementsAVenir(TODAY).map(e => `- ${e.date} : ${e.sujet}`).join("\n");
  const user = `Nous sommes le ${TODAY}. Prépare les posts du jour : un par réseau parmi ${RESEAUX_ACTIFS.join(", ")}.

ÉVÉNEMENTS DES 3 PROCHAINES SEMAINES :
${evenements}

PERFORMANCES RÉCENTES :
${resumePerformances(historique)}

TÉLÉCHARGEMENTS PAR SOURCE (saisis chaque semaine) :
${read("data/telechargements.csv").trim() || "non renseigné"}

POSTS DÉJÀ PUBLIÉS (à ne pas répéter) :
${recents}`;

  const plan = MOCK ? planFactice() : await demander(systemPrompt(), user, Plan);
  const posts = plan.posts.map(finaliser);
  const dossierVisuels = `visuels/${TODAY}`;
  await rendreVisuels(posts.filter(p => p.statut === "pret"), path.join(ROOT, dossierVisuels), path.resolve(ROOT, "../capmicro/icon.png"));
  for (const p of posts) if (p.fichierVisuel) {
    p.visuel.fichier = `${dossierVisuels}/${p.reseau}.png`;
    p.visuel.url = `https://raw.githubusercontent.com/${config.depot}/${config.branche}/marketing/${p.visuel.fichier}`;
    delete p.fichierVisuel;
  }
  const kit = { date: TODAY, angleDuJour: plan.angleDuJour, posts, reponsesTypes: plan.reponsesTypes, userPrompt: MOCK ? undefined : user };
  writeJson(kitJson, kit);
  write(`kits/${TODAY}.md`, kitMarkdown(kit));
  healthcheck(historique);
  writeJson("data/historique.json", historique);
  console.log(`Kit du ${TODAY} : ${posts.filter(p => p.statut === "pret").length} post(s) prêt(s), ${posts.filter(p => p.statut === "rejete").length} rejeté(s).`);
}

function healthcheck(historique) {
  // Signale les réseaux activés en publication automatique mais sans identifiants
  const manquants = [["facebook", meta.facebookConfigure()], ["instagram", meta.instagramConfigure()], ["linkedin", linkedin.linkedinConfigure()]]
    .filter(([r, ok]) => config.publication.auto && config.publication.reseaux[r]?.actif && config.publication.reseaux[r]?.auto && !ok).map(([r]) => r);
  if (manquants.length) console.warn(`⚠️ Publication automatique activée mais identifiants absents pour : ${manquants.join(", ")} (secrets GitHub).`);
}

function kitMarkdown(kit) {
  const statutTxt = { pret: "✅ prêt", rejete: "⛔ rejeté", publie: "📣 publié", manuel: "✋ à publier à la main", erreur: "⚠️ erreur de publication" };
  let md = `# Kit de publication du ${kit.date}\n\n**Angle du jour :** ${kit.angleDuJour}\n\n`;
  for (const p of kit.posts) {
    md += `## ${p.reseau} — ${statutTxt[p.statut] || p.statut}\n\n`;
    if (p.raisons?.length) md += `> Rejeté automatiquement : ${p.raisons.join(" ; ")}\n\n`;
    if (p.erreur) md += `> Erreur : ${p.erreur}\n\n`;
    md += `*Pilier : ${p.pilier} · campagne : \`${p.campagne}\` · lien suivi : ${p.lien}*\n\n`;
    if (p.visuel?.fichier) md += `![visuel](../${p.visuel.fichier})\n\n`;
    md += "```text\n" + p.texteFinal + "\n```\n\n";
    if (p.scriptVideo) md += `**Script vidéo :**\n\n${p.scriptVideo}\n\n`;
  }
  if (kit.reponsesTypes?.length) md += `## Réponses types aux commentaires\n\n${kit.reponsesTypes.map(r => `- **${r.commentaire}**\n  ${r.reponse}`).join("\n")}\n`;
  return md;
}

// ── Mode publier ─────────────────────────────────────────────────────────
async function publier() {
  const kit = readJson(kitJson, null);
  if (!kit) { console.log(`Aucun kit pour le ${TODAY}.`); return; }
  const historique = readJson("data/historique.json", { posts: [] });
  const publieurs = {
    facebook: meta.facebookConfigure() && ((p) => meta.publierFacebook({ texte: p.texteFinal, imageUrl: p.visuel?.url })),
    instagram: meta.instagramConfigure() && ((p) => meta.publierInstagram({ texte: p.texteFinal, imageUrl: p.visuel?.url })),
    linkedin: linkedin.linkedinConfigure() && ((p) => linkedin.publierLinkedin({ texte: p.texteFinal.replace(/\n\n👉 \S+$/, ""), hashtags: p.hashtags, lien: p.lien, titreLien: p.visuel?.titre })),
  };
  for (const p of kit.posts) {
    if (p.statut !== "pret") continue;
    const auto = config.publication.auto && config.publication.reseaux[p.reseau]?.auto && publieurs[p.reseau];
    if (!auto || DRY) { p.statut = "manuel"; }
    else {
      try { p.id = await publieurs[p.reseau](p); p.statut = "publie"; console.log(`📣 ${p.reseau} publié (${p.id})`); }
      catch (e) { p.statut = "erreur"; p.erreur = e.message; console.error(`⚠️ ${p.reseau} : ${e.message}`); }
    }
    if (p.statut === "publie" || p.statut === "manuel") {
      historique.posts.push({ date: kit.date, reseau: p.reseau, pilier: p.pilier, campagne: p.campagne, accroche: p.accroche, statut: p.statut, id: p.id || null });
    }
  }
  writeJson(kitJson, kit);
  write(`kits/${kit.date}.md`, kitMarkdown(kit));
  writeJson("data/historique.json", historique);
}

// ── Mode bilan ───────────────────────────────────────────────────────────
async function bilan() {
  const historique = readJson("data/historique.json", { posts: [] });
  await majStats(historique);
  writeJson("data/historique.json", historique);
  const user = `Nous sommes le ${TODAY}. Fais le bilan des 30 derniers jours de promotion de Cap Micro.

POSTS ET STATISTIQUES :
${historique.posts.filter(p => p.date >= new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).map(p => `- ${p.date} [${p.reseau}] ${p.pilier} / ${p.campagne} « ${p.accroche} » statut=${p.statut} stats=${JSON.stringify(p.stats || {})}`).join("\n") || "aucun"}

TÉLÉCHARGEMENTS PAR SOURCE :
${read("data/telechargements.csv").trim() || "non renseigné"}

APPRENTISSAGES ACTUELS :
${read("apprentissages.md")}

Déduis ce qui fait venir des téléchargements (réseau, pilier, format, type d'accroche, jour). Si les données sont insuffisantes, dis-le et propose des tests A/B simples plutôt que des conclusions.`;
  const b = MOCK
    ? { resume: "Mode test.", apprentissages: ["(test) aucune donnée"], recommandations: ["(test) connecter les comptes"] }
    : await demander(systemPrompt(), user, Bilan);
  write("apprentissages.md", `# Apprentissages de l'agent\n\nMis à jour automatiquement le ${TODAY} (mode « bilan »). Vous pouvez ajouter vos observations : elles seront prises en compte au prochain bilan.\n\n## Résumé\n\n${b.resume}\n\n## Ce que l'on a appris\n\n${b.apprentissages.map(a => `- ${a}`).join("\n")}\n\n## À appliquer cette semaine\n\n${b.recommandations.map(r => `- ${r}`).join("\n")}\n`);
  write(`rapports/${TODAY}.md`, `# Bilan du ${TODAY}\n\n${b.resume}\n\n## Apprentissages\n\n${b.apprentissages.map(a => `- ${a}`).join("\n")}\n\n## Recommandations\n\n${b.recommandations.map(r => `- ${r}`).join("\n")}\n`);
  console.log("Bilan écrit dans apprentissages.md et rapports/.");
}

const modes = { generer, publier, bilan };
if (!modes[MODE]) { console.error(`Mode inconnu : ${MODE}`); process.exit(1); }
await modes[MODE]();
