# Publier Cap Micro sur l'App Store et Google Play

Tout ce qui peut être automatisé l'est : compilation, signature, envoi sur TestFlight et Google Play, captures, textes des fiches.
Il reste des étapes qu'**on ne peut faire qu'en votre nom** : créer les comptes développeur, payer, prouver votre identité, accepter les contrats et cliquer sur « Soumettre ».

## 0. Coûts et délais

| | Apple App Store | Google Play |
|---|---|---|
| Compte développeur | 99 € par an | 25 $ une seule fois |
| Vérification d'identité | 1 à 3 jours (organisation : numéro D-U-N-S, gratuit, jusqu'à 2 semaines) | 1 à 3 jours |
| Avant la mise en ligne | Examen Apple : 1 à 3 jours en général | **Compte personnel : test fermé avec au moins 12 testeurs pendant 14 jours d'affilée**, puis examen (quelques jours) |
| Serveur du Conseiller IA | Netlify (offre gratuite suffisante au départ) + consommation de l'API Anthropic, plafonnée par le quota quotidien |

## 1. Avant tout

1. **Compléter la politique de confidentialité** : `capmicro/confidentialite.html`, remplacer les 3 champs surlignés (éditeur, adresse, e-mail).
2. **Identifiant de l'app** : `fr.capmicro.app` (dans `mobile/capacitor.config.json`, Android et iOS). Il doit être unique sur les stores et **ne pourra plus changer** après la première publication. Pour le modifier, changez-le partout avant le premier envoi.
3. **Déployer le serveur du Conseiller IA** (sans lui, l'onglet Conseiller demanderait une clé API aux utilisateurs, ce qui n'est pas viable) :
   - Netlify → *Add new site* → *Import from Git* → dépôt `Glowup`, **Base directory** : `server`.
   - Variables d'environnement Netlify : `ANTHROPIC_API_KEY` (clé créée sur console.anthropic.com), `CAPMICRO_CLIENT_TOKEN` (une chaîne aléatoire, par exemple issue d'un générateur de mots de passe), et si besoin `DAILY_LIMIT` (30 par défaut) et `GLOBAL_DAILY_LIMIT` (3000 par défaut).
   - Dans GitHub → *Settings* → *Secrets and variables* → *Actions* → onglet **Variables** : `CAPMICRO_AI_PROXY_URL` = `https://<votre-site>.netlify.app/api/conseiller` et `CAPMICRO_AI_CLIENT_TOKEN` = la même chaîne que sur Netlify.
   - Fixez une limite de dépense mensuelle dans la console Anthropic.

## 2. Android (Google Play)

1. **Créer la clé de signature** (une fois, à conserver précieusement avec ses mots de passe) :
   ```bash
   keytool -genkeypair -v -keystore capmicro-release.jks -alias capmicro -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 capmicro-release.jks   # sur macOS : base64 -i capmicro-release.jks
   ```
2. **Secrets GitHub** (*Settings → Secrets and variables → Actions → Secrets*) : `ANDROID_KEYSTORE_BASE64` (résultat de la commande base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`capmicro`), `ANDROID_KEY_PASSWORD`.
3. **Compiler** : onglet *Actions* → *Mobile Android* → *Run workflow*. Le fichier `.aab` se télécharge dans les *Artifacts* du run.
   Sans ces secrets, le workflow produit un APK de test à installer directement sur un téléphone Android.
4. **Play Console** → *Créer une application* : nom, langue française, application gratuite.
5. Remplir les sections avec `store/FICHES.md` : fiche du Play Store, sécurité des données, classification du contenu, public cible, déclaration « Applications financières ».
6. *Tests → Test interne* : importer le `.aab` (activer la signature d'application par Google Play, proposée par défaut).
7. *Tests → Test fermé* : inviter **au moins 12 testeurs** (adresses Gmail) qui gardent l'app installée **14 jours**, puis demander l'accès à la production.
8. Facultatif, envois automatiques : créer un compte de service Google Cloud avec accès à la Play Console, mettre son JSON dans le secret `PLAY_SERVICE_ACCOUNT_JSON`, puis lancer le workflow avec « Envoyer l'AAB sur Google Play ».

## 3. iOS (App Store)

Pas besoin de Mac : la compilation se fait sur un Mac de GitHub.

1. **Apple Developer Program** : inscription sur developer.apple.com (99 €/an).
2. **Identifiant** : *Certificates, Identifiers & Profiles → Identifiers → +* → App ID `fr.capmicro.app`.
3. **App Store Connect → Apps → +** : nouvelle app iOS, nom « Cap Micro : auto-entrepreneur », identifiant `fr.capmicro.app`, SKU `capmicro`.
4. **Clé API** : *App Store Connect → Utilisateurs et accès → Intégrations → Clés d'API* → nouvelle clé, rôle **Admin** (nécessaire pour la signature automatique). Téléchargez le fichier `.p8`, qui n'est téléchargeable qu'une fois.
5. **Secrets GitHub** : `APPLE_TEAM_ID` (Membership → Team ID), `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (contenu complet du fichier `.p8`).
6. **Compiler et envoyer** : *Actions → Mobile iOS → Run workflow*, cocher « Archiver et envoyer sur TestFlight ». La version apparaît dans TestFlight après environ 15 minutes de traitement.
7. Installer l'app via TestFlight sur votre iPhone et vérifier le parcours complet.
8. Remplir la fiche App Store avec `store/FICHES.md` : textes, captures, confidentialité de l'app, classification, notes pour la vérification. Sélectionner la version, puis **Soumettre pour vérification**.

## 4. Après la publication

1. `capmicro/index.html` : renseigner `androidLive: true`, `iosAppId`, et `iosProviderToken` pour suivre les téléchargements par campagne.
2. `marketing/config.json` : passer `"storesEnLigne": true` pour que l'agent annonce la disponibilité sur les stores.
3. Nouvelle version : modifier la variable GitHub `CAPMICRO_VERSION_NAME` (ex. `1.1.0`), relancer les deux workflows ; le numéro de build suit automatiquement le numéro du run.

## 5. Points de vigilance pour l'examen

- **Apple 4.2 (fonctionnalité minimale)** : les apps qui ne sont qu'un site web emballé sont refusées. Cap Micro fonctionne hors ligne (tout est embarqué), utilise le partage natif pour les PDF et exports, et apporte des fonctions réelles. Mettez-les en avant dans les notes pour la vérification.
- **Apple 5.1.2 (IA tierce)** : l'accord explicite avant tout envoi au Conseiller IA est en place.
- **Abonnement payant plus tard** : il devra passer par l'achat intégré d'Apple et la facturation Google Play (des règles différentes s'appliquent pour les liens vers un paiement externe dans l'UE).
- **Contenu réglementaire** : l'app affiche qu'elle est un outil d'aide et renvoie aux sources officielles. Mettez à jour les taux chaque 1er janvier (`REGLES` et `ACTIVITES` dans `cap-micro.html`).

## Régénérer les visuels

```bash
cd mobile
npm ci
node scripts/render-assets.mjs && npx capacitor-assets generate --iconBackgroundColor '#0b1220' --iconBackgroundColorDark '#0b1220' --splashBackgroundColor '#0b1220' --splashBackgroundColorDark '#0b1220'
node scripts/build-web.mjs && node scripts/render-screenshots.mjs
```
