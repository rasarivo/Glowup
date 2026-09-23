# Agent de promotion de Cap Micro

Un agent qui tourne tout seul, chaque jour, dans GitHub Actions, avec un objectif : **faire télécharger Cap Micro**.

## Ce qu'il fait

| Quand | Quoi |
|---|---|
| Chaque matin (≈ 8 h 30) | Choisit le sujet du jour (échéances fiscales, facture électronique, apprentissages), écrit **un post par réseau** adapté à chacun, génère les visuels, vérifie les règles, puis publie ou prépare le kit. |
| Chaque lundi | Récupère les statistiques des posts, lit vos chiffres de téléchargements, et **réécrit `apprentissages.md`**. Les posts suivants en tiennent compte. |

Chaque post contient un **lien de campagne** (`?src=instagram&c=cfe-15-decembre`) : les téléchargements apparaissent par réseau et par sujet dans la Play Console (UTM) et dans App Store Connect (campagnes).

**Contrôles automatiques avant publication** : pas de chiffre d'audience inventé, pas de témoignage, pas de promesse de conformité garantie, pas d'affirmation fausse sur le produit (« fait vos démarches à votre place », « plateforme agréée »), pas de « disponible sur l'App Store » avant la mise en ligne, longueurs respectées. Un post qui ne passe pas est écarté et la raison est notée dans le kit.

**Ce qu'il ne fait pas, volontairement** : messages privés en masse, publications dans des groupes, faux comptes, faux avis. C'est interdit par les réseaux, cela fait bannir les comptes et abîme la marque.

## Fichiers

| Fichier | Rôle |
|---|---|
| `strategie.md` | Cible, promesse, piliers, ton, règles. **C'est ici que vous pilotez l'agent.** |
| `apprentissages.md` | Ce qui marche, mis à jour chaque lundi (vous pouvez y écrire aussi). |
| `config.json` | Réseaux actifs, publication automatique ou non, état du produit (gratuit, stores en ligne). |
| `data/telechargements.csv` | Téléchargements par source, à compléter chaque semaine depuis les consoles des stores. |
| `kits/AAAA-MM-JJ.md` | Le kit du jour : textes prêts à copier, visuels, script TikTok, réponses types aux commentaires. |
| `visuels/` | Les images générées. |
| `rapports/` | Les bilans hebdomadaires. |

## Mise en route

### Étape 1 : faire tourner l'agent en mode « kit » (15 minutes)

1. Créez une clé API sur console.anthropic.com et fixez-y une limite de dépense (compter quelques euros par mois).
2. GitHub → *Settings → Secrets and variables → Actions* → secret `ANTHROPIC_API_KEY`.
3. Le workflow tourne sur la branche principale (`main`) : fusionnez d'abord cette branche.
4. Testez tout de suite : *Actions → Agent de promotion → Run workflow*.
5. Chaque matin, ouvrez `marketing/kits/` depuis l'application GitHub : textes et visuels sont prêts à publier.

À ce stade, **rien n'est publié automatiquement** (`"auto": false` dans `config.json`). Relisez les kits pendant 1 à 2 semaines et ajustez `strategie.md`.

### Étape 2 : publication automatique

Créez d'abord les comptes de la marque : Page Facebook, compte Instagram **professionnel** relié à la Page, Page LinkedIn, compte TikTok. Utilisez le même nom partout, avec en bio le lien `https://rasarivo.github.io/Glowup/capmicro/?go=1&src=instagram&c=bio` (en changeant `src` selon le réseau).

**Facebook + Instagram**
1. developers.facebook.com → *Créer une app* (type Entreprise). Vous en êtes administrateur, le mode Développement suffit pour publier sur vos propres comptes.
2. Autorisations : `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`.
3. Avec l'Explorateur de l'API Graph, obtenez un jeton de Page **longue durée**, ainsi que l'identifiant de la Page et celui du compte Instagram professionnel (`GET /{page-id}?fields=instagram_business_account`).
4. Secrets GitHub : `META_PAGE_ID`, `META_PAGE_TOKEN`, `META_IG_USER_ID`.

**LinkedIn**
1. linkedin.com/developers → *Create app*, associée à votre Page.
2. Demandez l'accès au produit **Community Management API**. LinkedIn examine la demande, ce qui prend quelques jours.
3. Générez un jeton avec `w_organization_social` et `r_organization_social`. Il expire au bout de 60 jours : mettez un rappel pour le renouveler.
4. Secrets : `LINKEDIN_ORG_ID` (numéro de la Page), `LINKEDIN_TOKEN`. La variable `LINKEDIN_VERSION` (format `AAAAMM`) est à mettre à jour une fois par an.

**TikTok et X** restent en mode kit (publication manuelle) : l'API de TikTok impose un audit préalable, et celle de X est payante. Les scripts vidéo TikTok sont dans le kit.

Ensuite, dans `config.json`, passez `"auto": true`. Les réseaux sans identifiants restent en mode kit.

### Étape 3 : boucler sur les téléchargements

Chaque semaine, relevez les téléchargements par source dans la Play Console (*Statistiques → Acquisition*, source UTM) et dans App Store Connect (*Analytics → Sources → Campagnes*). Ajoutez une ligne par source dans `data/telechargements.csv` :

```
semaine;source;store;telechargements
2026-W40;instagram;android;37
```

Le bilan du lundi s'appuie dessus pour déplacer l'effort vers ce qui fait vraiment télécharger.

## Lancer à la main

```bash
cd marketing && npm ci && npx playwright install chromium
npm test                                   # essai complet sans Claude ni publication
ANTHROPIC_API_KEY=... node agent/run.mjs --mode=generer --force
node agent/run.mjs --mode=publier --dry-run
ANTHROPIC_API_KEY=... node agent/run.mjs --mode=bilan
```

## Pour aller plus loin

La publication organique prend des semaines à produire des résultats. Les leviers qui accélèrent vraiment les téléchargements, et que l'agent peut préparer sans les exécuter seul :
- **ASO** : textes et captures des stores (déjà prêts dans `store/`), à tester et ajuster.
- **Publicité** : Apple Search Ads sur « auto-entrepreneur » et « facture électronique », campagnes Meta vers la page de l'app.
- **Partenariats** : CCI, CMA, BGE, Adie, Pépite, experts-comptables. La facture électronique est un bon sujet d'atelier.
