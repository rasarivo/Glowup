// Dates utiles aux micro-entrepreneurs : l'agent s'en sert pour publier le bon message au bon moment.
const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`; // m : 1-12
const lastDay = (y, m) => new Date(y, m, 0).getDate();

export const EMISSION_FACTURE_ELEC = "2027-09-01";

export function evenementsAVenir(aujourdhui, horizonJours = 21) {
  const t = new Date(aujourdhui + "T12:00:00");
  const fin = new Date(t); fin.setDate(fin.getDate() + horizonJours);
  const out = [];
  for (const y of [t.getFullYear(), t.getFullYear() + 1]) {
    for (let m = 1; m <= 12; m++) out.push({ date: iso(y, m, lastDay(y, m)), sujet: "Échéance de la déclaration mensuelle de CA Urssaf (CA du mois précédent)" });
    [[1, 31, "4e trimestre"], [4, 30, "1er trimestre"], [7, 31, "2e trimestre"], [10, 31, "3e trimestre"]].forEach(([m, d, q]) =>
      out.push({ date: iso(y, m, d), sujet: `Échéance de la déclaration trimestrielle de CA Urssaf (${q})` }));
    out.push({ date: iso(y, 1, 1), sujet: "Nouvelle année : mise à jour des taux, des plafonds et des seuils ; pic de créations d'entreprise en janvier" });
    out.push({ date: iso(y, 4, 15), sujet: "Ouverture de la déclaration de revenus : le CA se reporte sur la 2042-C-PRO" });
    out.push({ date: iso(y, 5, 25), sujet: "Dates limites de la déclaration de revenus (fin mai - début juin selon le département)" });
    out.push({ date: iso(y, 9, 1), sujet: "Rentrée : période de lancement de nombreux projets d'auto-entreprise" });
    out.push({ date: iso(y, 9, 30), sujet: "Date limite pour opter ou renoncer au versement libératoire pour l'année suivante" });
    out.push({ date: iso(y, 11, 15), sujet: "Avis de CFE disponible dans l'espace professionnel impots.gouv.fr" });
    out.push({ date: iso(y, 12, 15), sujet: "Date limite de paiement de la CFE" });
    out.push({ date: iso(y, 12, 31), sujet: "Date limite de la déclaration initiale de CFE (1447-C-SD) pour les entreprises créées cette année" });
  }
  const ok = out.filter(e => { const d = new Date(e.date + "T12:00:00"); return d >= t && d <= fin; });
  const jours = Math.ceil((new Date(EMISSION_FACTURE_ELEC + "T12:00:00") - t) / 86400000);
  if (jours > 0) ok.push({ date: EMISSION_FACTURE_ELEC, sujet: `Facture électronique : obligation d'émettre et e-reporting dans ${jours} jours ; réception obligatoire depuis le 1er septembre 2026` });
  return ok.sort((a, b) => a.date.localeCompare(b.date));
}

// Rappel des chiffres réglementaires fiables (identiques à l'application, septembre 2026)
export const FAITS_REGLEMENTAIRES = `
- Cotisations 2026 (sur CA encaissé) : vente 12,3 % ; services BIC 21,2 % ; libéral non réglementé 25,6 % ; libéral Cipav 23,2 %.
- Versement libératoire : 1 % (vente), 1,7 % (services BIC), 2,2 % (BNC).
- Plafonds de CA 2026 : 203 100 € (vente), 83 600 € (services et libéral).
- Franchise de TVA : 85 000 € (vente) / 37 500 € (services), seuils majorés 93 500 € / 41 250 €. Le projet de seuil unique à 25 000 € a été abandonné.
- ACRE : depuis le 1er juillet 2026, exonération de 25 % (on paie 75 % du taux normal), contre 50 % avant.
- Création gratuite sur le guichet unique formalites.entreprises.gouv.fr.
- Facture électronique : réception obligatoire depuis le 1er septembre 2026 pour toutes les entreprises assujetties à la TVA, micro-entrepreneurs en franchise inclus ; émission et e-reporting au 1er septembre 2027 pour les micro-entreprises ; passage par une plateforme agréée ; nouvelles mentions : SIREN du client, nature de l'opération, adresse de livraison si différente ; 15 € d'amende par mention manquante.
- CFE : exonération l'année de création, paiement au 15 décembre.
- Médiateur de la consommation obligatoire en B2C ; mention « EI » obligatoire à côté du nom ; compte bancaire dédié obligatoire au-delà de 10 000 € de CA deux années de suite.`;
