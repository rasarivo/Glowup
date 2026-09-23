# Cap Micro 🚀 — le copilote de l'auto-entrepreneur

Application iPhone, Android et web (source unique : `cap-micro.html`) qui accompagne un micro-entrepreneur
de l'idée jusqu'à la gestion au quotidien. Règles à jour de **septembre 2026**.

## Ce que fait l'application

| Module | Ce qu'il apporte | Fonctionne sans IA |
|---|---|---|
| 🏁 **Démarches** | Checklist générée par des **règles fixes** à partir du profil (activité, situation, clientèle, lieu, options) : 5 phases, jusqu'à ~35 étapes, chacune avec un badge obligatoire/conseillé, le « pourquoi », le « comment » et le lien officiel. Export d'un **dossier pré-rempli** pour le guichet unique INPI. | ✅ |
| 🧾 **Factures** | Devis et factures avec **contrôle des mentions obligatoires** (EI, SIRET, SIREN client, nature de l'opération, adresse de livraison, 293 B, pénalités, 40 €, assurance, médiateur). Numérotation chronologique verrouillée à l'émission, devis → facture, suivi des impayés, aperçu et PDF, **export XML CII (EN 16931)**. Tableau de préparation à la réforme de la facture électronique. | ✅ |
| 📊 **Suivi** | Livre des recettes (rempli automatiquement quand une facture est payée) et registre des achats, exports CSV, CA mensuel, cotisations estimées (ACRE et versement libératoire compris), jauges TVA et plafond, alertes, prochaines échéances Urssaf / CFE / impôts / réforme, liste d'actions. | ✅ |
| 💬 **Conseiller** | Agent IA (Claude) qui connaît le profil, l'avancement de la checklist et les chiffres. Il rédige courriers, CGV, relances et e-mails aux clients, conseille sur les prix et le développement, et ajoute des **actions** au suivi. | serveur IA (`server/`) |

Pourquoi une checklist à règles fixes plutôt que générée par l'IA : la liste des obligations doit être
**exhaustive et reproductible**. L'IA sert à expliquer, rédiger et conseiller, jamais à décider
quelles démarches sont obligatoires.

## Mise à jour réglementaire

Tous les montants et taux sont regroupés dans `REGLES` et `ACTIVITES`, en haut du script :
plafonds, seuils de TVA, taux de cotisations, CFP, versement libératoire, abattements, ACRE et dates de la réforme.
Le prompt du Conseiller reprend les mêmes chiffres dans `buildAdvisorSystem`.
**À revoir chaque 1er janvier et à chaque loi de finances ou LFSS.**

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `cap-micro.html` | L'application (source unique, web et mobile) |
| `mobile/` | Projet Capacitor iOS et Android : `scripts/build-web.mjs` compile l'app hors ligne, `render-assets.mjs` génère l'icône et l'écran de démarrage, `render-screenshots.mjs` génère les captures des stores |
| `server/` | Proxy du Conseiller IA (fonction Netlify) : clé API côté serveur, quotas, cadrage du modèle |
| `store/` | Guide de publication (`PUBLICATION.md`), textes des fiches (`FICHES.md`), visuels et captures |
| `capmicro/` | Page de l'app (liens de campagne vers les stores) et politique de confidentialité |
| `marketing/` | Agent de promotion quotidien (voir `marketing/README.md`) |
| `.github/workflows/` | Compilation Android et iOS, agent de promotion |

## Limites actuelles (à dire clairement aux clients)

- **Les formalités ne sont pas déposées par l'application.** Le guichet unique INPI et l'Urssaf n'ont pas d'API publique
  pour créer une micro-entreprise. Cap Micro prépare tout (dossier, textes, liens) et l'utilisateur valide lui-même.
- **Ce n'est pas une plateforme agréée (PA).** L'export XML CII facilite la transition, mais l'envoi légal
  d'une facture électronique passe par une PA immatriculée par la DGFiP.
- Les données restent sur l'appareil (localStorage, doublé par le stockage natif sur mobile), avec sauvegarde et restauration en JSON.

## Feuille de route

1. **Comptes et synchronisation** entre appareils (base chiffrée hébergée en UE), puis abonnement Pro via l'achat intégré Apple et Google Play.
2. **Facture électronique** : partenariat ou intégration par API avec une plateforme agréée (émission, réception, e-reporting), Factur-X complet (PDF/A-3).
3. **Connexions** : rapprochement bancaire (DSP2), tierce déclaration Urssaf (API réservée aux partenaires habilités), recherche SIRENE des clients.
4. **Notifications** aux échéances (déclaration de CA, CFE, seuils).
5. **Cadre** : CGU, relecture du contenu par un expert-comptable, veille réglementaire trimestrielle.
6. **Distribution** : CCI, CMA, BGE, Adie, Pépite, France Travail, banques en ligne.

## Tester

- Web : ouvrir `cap-micro.html`.
- Android : *Actions → Mobile Android → Run workflow*, puis installer l'APK des *Artifacts*.
- iOS : TestFlight, une fois le compte Apple configuré (voir `store/PUBLICATION.md`).
