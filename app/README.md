# Ensemble ✨

Application de rencontre basée sur les **loisirs et sports partagés** avec les
personnes à proximité. En plus du matching individuel, on peut créer et
rejoindre des **groupes** centrés sur une activité (running du dimanche,
soirée jeux de société, cours de yoga…).

Une seule base de code (React Native + Expo) est publiée sur :

- 📱 **App Store** (iOS)
- 📱 **Play Store** (Android)
- 💻 **Ordinateur** via le web (n'importe quel navigateur, desktop ou mobile)

## Stack technique

- **Client** : [Expo](https://expo.dev) (React Native + TypeScript) avec
  [Expo Router](https://docs.expo.dev/router/introduction/) pour la
  navigation (fichiers dans `app/`). Le même code tourne sur iOS, Android et
  Web.
- **Backend** : [Supabase](https://supabase.com) — Postgres + PostGIS
  (géolocalisation), Auth, Storage (photos) et Realtime (chat), avec Row
  Level Security sur toutes les tables. Aucun serveur à maintenir.

## Fonctionnalités

- Inscription / connexion par e-mail.
- Profil : photos (jusqu'à 6), bio, ville, genre & préférence, et sélection de
  loisirs/sports parmi un catalogue classé par catégories (sport, plein air,
  culture, créatif, social, bien-être).
- **Découvrir** : profils à proximité triés par nombre de centres d'intérêt
  communs puis par distance ; like / passe ; création de match en cas de like
  mutuel.
- **Matchs** : liste des matchs + messagerie en temps réel (Supabase
  Realtime).
- **Groupes** : créer un groupe autour d'une activité, le rejoindre/le
  quitter, discuter en groupe.
- Position approximative arrondie (~1 km) pour préserver la vie privée.

## Structure du projet

```
app/
  (auth)/            écrans de connexion / inscription
  (onboarding)/       configuration du profil (infos, photos, centres d'intérêt)
  (tabs)/
    discover.tsx      découverte / matching
    matches/           liste des matchs + chat ([matchId].tsx)
    groups/             groupes (liste, création, détail + chat)
    profile.tsx        édition du profil
lib/                  client Supabase, contexte auth, appels API
components/           Button, TextField, InterestChip, LoadingScreen
constants/            thème (couleurs/espacements), catalogue de catégories
types/                types TypeScript des tables Supabase
supabase/migrations/  schéma SQL (tables, RLS, fonctions, seed)
```

## 1. Configurer Supabase (backend)

1. Crée un compte et un projet sur [supabase.com](https://supabase.com).
2. Dans **Project Settings → API**, récupère l'URL du projet et la clé
   `anon public`.
3. Copie `.env.example` vers `.env` et renseigne :
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Exécute les migrations SQL dans l'ordre, soit :
   - via le **SQL Editor** du dashboard Supabase (copier/coller chaque
     fichier de `supabase/migrations/` dans l'ordre numérique), soit
   - via la [CLI Supabase](https://supabase.com/docs/guides/cli) :
     ```
     supabase link --project-ref <ton-project-ref>
     supabase db push
     ```
5. Active l'authentification par e-mail dans **Authentication → Providers**
   (activée par défaut). Pour les tests, tu peux désactiver la confirmation
   par e-mail dans **Authentication → Settings**.

Le schéma crée notamment :
- `profiles`, `profile_photos`, `interests`, `profile_interests`
- `swipes`, `matches`, `messages`
- `groups`, `group_members`, `group_messages`
- Fonctions RPC : `nearby_profiles`, `nearby_groups`, `swipe_profile`,
  `update_my_location`
- Un bucket de stockage public `photos` avec des policies restreignant
  l'écriture à son propre dossier.

## 2. Lancer l'app en local

```bash
npm install
npm run start      # ouvre le menu Expo (scanner le QR code avec Expo Go, ou appuyer sur "w" pour le web)
npm run ios        # simulateur iOS (macOS uniquement)
npm run android    # émulateur Android
npm run web        # navigateur (= la version "ordinateur")
```

## 3. Publier sur l'App Store et le Play Store (EAS Build)

1. Installe la CLI EAS et connecte-toi :
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Configure le projet (associe l'app à ton compte Expo) :
   ```bash
   eas build:configure
   ```
3. Renseigne dans `app.json` :
   - `expo.ios.bundleIdentifier` (déjà pré-rempli : `com.ensemble.dating`,
     à adapter à ton propre identifiant réservé sur App Store Connect)
   - `expo.android.package` (idem, `com.ensemble.dating`)
4. Lance les builds :
   ```bash
   npm run build:ios       # ou: eas build --platform ios --profile production
   npm run build:android   # ou: eas build --platform android --profile production
   ```
5. Soumets aux stores (après avoir renseigné `eas.json` → section `submit`
   avec ton Apple ID / App Store Connect App ID / clé de service Google
   Play) :
   ```bash
   npm run submit:ios
   npm run submit:android
   ```

Tu auras besoin :
- d'un compte **Apple Developer** (99 $/an) pour l'App Store,
- d'un compte **Google Play Console** (25 $ une fois) pour le Play Store.

## 4. Publier la version "ordinateur" (web)

La version web est un vrai site, utilisable depuis n'importe quel
navigateur de bureau.

```bash
npm run build:web   # génère le dossier dist/
```

Déploiement en un clic sur **Netlify** (config déjà prête dans
`netlify.toml`) ou **Vercel** : connecte le repo, la commande de build
(`npx expo export --platform web`) et le dossier de sortie (`dist`) sont
déjà configurés. Pense à renseigner les variables d'environnement
`EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans les
réglages du site.

## Prochaines améliorations possibles

- Notifications push (nouveau match, nouveau message) via `expo-notifications`.
- Vérification de photo / modération de contenu.
- Filtres avancés (tranche d'âge, distance max, catégories d'intérêts).
- Pagination infinie sur Découvrir et Groupes.
