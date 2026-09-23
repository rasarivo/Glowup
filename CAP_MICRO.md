# Cap Micro 🚀 — le copilote de l'auto-entrepreneur

Application web mobile (PWA, un seul fichier : `cap-micro.html`) qui accompagne un micro-entrepreneur
de l'idée jusqu'à la gestion au quotidien. Règles à jour de **septembre 2026**.

## Ce que fait l'application

| Module | Ce qu'il apporte | Fonctionne sans IA |
|---|---|---|
| 🏁 **Démarches** | Checklist générée par des **règles fixes** à partir du profil (activité, situation, clientèle, lieu, options) : 5 phases, jusqu'à ~35 étapes, chacune avec un badge obligatoire/conseillé, le « pourquoi », le « comment » et le lien officiel. Export d'un **dossier pré-rempli** pour le guichet unique INPI. | ✅ |
| 🧾 **Factures** | Devis et factures avec **contrôle des mentions obligatoires** (EI, SIRET, SIREN client, nature de l'opération, adresse de livraison, 293 B, pénalités, 40 €, assurance, médiateur). Numérotation chronologique verrouillée à l'émission, devis → facture, suivi des impayés, aperçu et PDF, **export XML CII (EN 16931)**. Tableau de préparation à la réforme de la facture électronique. | ✅ |
| 📊 **Suivi** | Livre des recettes (rempli automatiquement quand une facture est payée) et registre des achats, exports CSV, CA mensuel, cotisations estimées (ACRE et versement libératoire compris), jauges TVA et plafond, alertes, prochaines échéances Urssaf / CFE / impôts / réforme, liste d'actions. | ✅ |
| 💬 **Conseiller** | Agent IA (Claude) qui connaît le profil, l'avancement de la checklist et les chiffres. Il rédige courriers, CGV, relances et e-mails aux clients, conseille sur les prix et le développement, et ajoute des **actions** au suivi. | clé API |

Pourquoi une checklist à règles fixes plutôt que générée par l'IA : la liste des obligations doit être
**exhaustive et reproductible**. L'IA sert à expliquer, rédiger et conseiller, jamais à décider
quelles démarches sont obligatoires.

## Mise à jour réglementaire

Tous les montants et taux sont regroupés dans `REGLES` et `ACTIVITES`, en haut du script :
plafonds, seuils de TVA, taux de cotisations, CFP, versement libératoire, abattements, ACRE et dates de la réforme.
Le prompt du Conseiller reprend les mêmes chiffres dans `buildAdvisorSystem`.
**À revoir chaque 1er janvier et à chaque loi de finances ou LFSS.**

## Limites actuelles (à dire clairement aux clients)

- **Les formalités ne sont pas déposées par l'application.** Le guichet unique INPI et l'Urssaf n'ont pas d'API publique
  pour créer une micro-entreprise. Cap Micro prépare tout (dossier, textes, liens) et l'utilisateur valide lui-même.
- **Ce n'est pas une plateforme agréée (PA).** L'export XML CII facilite la transition, mais l'envoi légal
  d'une facture électronique passe par une PA immatriculée par la DGFiP.
- Les données restent dans le navigateur (localStorage), avec sauvegarde et restauration en JSON.
- La clé API est fournie par l'utilisateur, ce qui convient à un prototype mais pas à un produit payant (voir plus bas).

## Feuille de route pour commercialiser

1. **Backend et comptes** : proxy serveur pour l'API Claude (la clé ne sort plus du serveur), authentification,
   base de données chiffrée hébergée en UE, synchronisation entre appareils. RGPD : registre des traitements, DPA, politique de confidentialité.
2. **Abonnement** : Stripe. Offre gratuite (checklist et 5 factures par mois) puis Pro autour de 9 à 15 € par mois
   (factures illimitées, Conseiller IA, rappels).
3. **Facture électronique** : partenariat ou intégration par API avec une **plateforme agréée**
   (émission, réception, e-reporting), ou génération d'un Factur-X complet (PDF/A-3 avec le XML embarqué) et validation Schematron EN 16931.
4. **Connexions** : rapprochement bancaire (agrégateur DSP2) pour remplir le livre des recettes, tierce déclaration Urssaf
   (API réservée aux partenaires habilités), recherche SIRENE pour pré-remplir les clients.
5. **Rappels** : notifications push et e-mails aux échéances (déclaration de CA, CFE, seuils).
6. **Cadre juridique** : CGU et mentions « outil d'aide, pas de conseil juridique personnalisé », relecture
   du contenu par un expert-comptable, assurance RC Pro de l'éditeur, veille réglementaire trimestrielle.
7. **Distribution** : CCI, CMA, réseaux d'accompagnement (BGE, Adie, Pépite), France Travail, banques en ligne.

## Tester

Ouvrir `cap-micro.html` dans un navigateur, ou la page GitHub Pages du dépôt.
Le Conseiller se configure dans ⚙️ avec une clé Anthropic.
