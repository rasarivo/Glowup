# Fiches des stores — textes prêts à copier

Longueurs vérifiées par rapport aux limites des stores. Visuels : `store/graphics/` et `store/screenshots/`.

## Commun

| Champ | Valeur |
|---|---|
| Nom de l'app (30 max.) | `Cap Micro : auto-entrepreneur` (29) |
| Catégorie | Finance (secondaire : Productivité / Business) |
| URL de confidentialité | https://rasarivo.github.io/Glowup/capmicro/confidentialite.html |
| URL marketing / assistance | https://rasarivo.github.io/Glowup/capmicro/ |
| Langue principale | Français (France) |
| Prix | Gratuit |
| Pays | France (métropole et outre-mer) : les règles décrites sont françaises |

## App Store (App Store Connect)

**Sous-titre (30 max.)** : `Démarches, factures, suivi CA` (29)

**Mots-clés (100 max.)** : `micro-entreprise,urssaf,facture,devis,facture électronique,siret,tva,cfe,freelance,indépendant,acre` (99)

**Texte promotionnel (170 max., modifiable sans nouvelle version)** :
Facture électronique : la réception est obligatoire depuis le 1er septembre 2026. Vérifiez où vous en êtes et préparez l'émission de 2027 avec Cap Micro.

**Captures** : `store/screenshots/app-store-6.9/` (1290 × 2796, acceptées pour l'emplacement iPhone 6,9"). L'app est configurée pour iPhone uniquement : pas de captures iPad nécessaires.

**Notes pour la vérification Apple (App Review)** :
> Cap Micro ne demande pas de compte : toutes les fonctions sont accessibles dès l'ouverture, après un questionnaire de 5 étapes (saisissez n'importe quelles valeurs). Les données sont stockées sur l'appareil. L'onglet « Conseiller » envoie des informations à un service d'IA tiers (Anthropic) uniquement après un consentement explicite affiché dans l'app (écran « Avant de commencer »), révocable dans les réglages. L'app n'effectue aucune formalité administrative à la place de l'utilisateur : elle renvoie vers les sites officiels.

**Confidentialité de l'app (« App Privacy »)** :
- *Données collectées* : **Contenu utilisateur → Autre contenu utilisateur** (questions posées au Conseiller et contexte envoyé). Usage : **Fonctionnalité de l'app**. Non lié à l'identité. Pas de suivi (tracking).
- *Identifiants → ID d'appareil* : non (l'identifiant d'installation est aléatoire, sert au quota et n'est lié à aucune identité : à déclarer en « Identifiants → Autres » par prudence si Apple le demande, usage Fonctionnalité de l'app, non lié à l'identité).
- Aucune autre donnée n'est collectée par l'éditeur (le reste est stocké uniquement sur l'appareil).

**Classification par âge** : aucun contenu sensible → 4+ (les réponses de l'IA sont limitées au sujet de la micro-entreprise).

**Chiffrement à l'export** : déjà déclaré dans l'app (`ITSAppUsesNonExemptEncryption = NO`, HTTPS standard uniquement).

**Statut de commerçant (DSA, obligatoire pour l'UE)** : si vous publiez à titre professionnel, déclarez-vous « commerçant ». Adresse, téléphone et e-mail seront affichés sur la fiche.

## Google Play (Play Console)

**Description courte (80 max.)** : `Démarches, factures conformes et suivi du CA pour les auto-entrepreneurs` (72)

**Éléments graphiques** : icône `store/graphics/play-icon-512.png`, image de présentation `store/graphics/play-feature-graphic.png` (1024 × 500), captures `store/screenshots/google-play/` (1080 × 1920).

**Sécurité des données (« Data safety »)** :
- L'app collecte-t-elle des données ? **Oui** : *Messages → Autres messages intégrés à l'app* (questions au Conseiller) ; *Identifiants d'appareil ou autres → identifiant d'installation aléatoire*.
- Partagées avec des tiers ? **Non** au sens de Google (transmission à des sous-traitants qui agissent pour le compte de l'éditeur).
- Traitement éphémère : non. Collecte facultative : **oui** (Conseiller soumis à consentement). Chiffrées en transit : **oui**.
- Suppression : l'utilisateur supprime ses données dans l'app (Réglages → Tout effacer). Aucun compte n'existe.

**Questionnaire de classification du contenu** : Utilitaire / Productivité, aucun contenu sensible → PEGI 3.

**Public cible** : 18 ans et plus.

**Déclaration « Applications financières »** : l'app ne propose aucun service financier (ni prêt, ni paiement, ni investissement) : cochez « Mon application ne propose aucune de ces fonctionnalités ».

## Description longue (App Store et Google Play, 4000 max.)

```text
Créer et gérer son auto-entreprise sans rien oublier.

Cap Micro vous accompagne de l'idée à la gestion au quotidien : toutes les démarches obligatoires pour votre situation, des factures conformes, le suivi de votre chiffre d'affaires et un conseiller disponible 24 h/24.

🏁 TOUTES LES DÉMARCHES, DANS LE BON ORDRE
• Une feuille de route construite à partir de votre activité (vente, artisanat, services, libéral) et de votre situation : salarié, fonctionnaire, demandeur d'emploi, bénéficiaire du RSA, étudiant, retraité.
• Chaque étape indique si elle est obligatoire, pourquoi, comment la faire et le lien officiel.
• Un dossier prêt à recopier pour la déclaration sur le guichet unique (gratuit).
• ACRE, versement libératoire, CFE, assurance, médiateur de la consommation, compte bancaire : rien n'est oublié.

🧾 DES FACTURES ET DEVIS CONFORMES
• Vérification automatique des mentions obligatoires, dont les nouvelles : SIREN du client, nature de l'opération, adresse de livraison.
• Numérotation chronologique, facture verrouillée après émission, transformation d'un devis en facture.
• PDF à partager, suivi des impayés et relances.
• Export au format structuré CII (norme EN 16931).

⚡ PRÊT POUR LA FACTURE ÉLECTRONIQUE
Depuis le 1er septembre 2026, les micro-entrepreneurs doivent pouvoir recevoir des factures électroniques. Ils devront en émettre à partir du 1er septembre 2027. Cap Micro vous montre où vous en êtes et vous aide à choisir une plateforme agréée.

📊 UN SUIVI SANS TABLEUR
• Livre des recettes rempli automatiquement quand une facture est payée, registre des achats, exports CSV.
• Cotisations et impôt estimés (ACRE et versement libératoire compris).
• Alertes sur les seuils de franchise de TVA et le plafond de la micro-entreprise.
• Prochaines échéances : déclarations Urssaf, CFE, déclaration de revenus.

💬 UN CONSEILLER QUI CONNAÎT VOTRE SITUATION
Posez vos questions : prix, démarches, TVA, développement commercial. Le Conseiller tient compte de votre profil et de vos chiffres, rédige vos courriers, CGV et relances, et ajoute des actions concrètes à votre suivi.

🔒 VOS DONNÉES RESTENT CHEZ VOUS
Pas de compte à créer. Vos informations sont stockées sur votre téléphone. Le Conseiller n'envoie des informations à un service d'IA qu'avec votre accord.

Règles à jour de septembre 2026 (taux, plafonds, seuils).
Cap Micro est un outil d'aide : il ne dépose pas les formalités à votre place, n'est pas une plateforme agréée de facturation électronique et ne remplace pas un expert-comptable ou un avocat.
```
