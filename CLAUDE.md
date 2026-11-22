# Studio — L'Atelier de l'Existant

Contexte pour Claude Code. À lire avant toute modification.

## Le projet

Application web de rédaction des livrables de diagnostic du bâti ancien pour **L'Atelier de l'Existant**
(Lorine Gratadour). Elle remplace Word : saisie pas à pas (zones, photos, fiches désordres,
préconisations, synthèse), aperçu A4 en direct, export PDF paginé. Elle couvre aussi la gestion de
l'activité (devis, factures, agenda, prospection, relation client).

- **Utilisatrice** : Lorine Gratadour. Le projet Supabase (si mode en ligne) est **à son nom**.
- **Dépôt GitHub** : `n5gjzt44ms-boop/atelier-existant-studio` (compte de Benoît Prudhomme), publié sur
  https://n5gjzt44ms-boop.github.io/atelier-existant-studio/. Sur ce compte, ne toucher qu'à **ce
  dépôt** : jamais aux autres dépôts de Benoît (Valvora, ProgMeca, etc.).
- **Répondre en français**, avec des mots simples : l'utilisatrice n'est pas développeuse.
- **Solutions gratuites uniquement.**
- **Aucun lien avec l'organisation Supabase « ProgMeca »** de Benoît (projets Mecapp et Valvora). Ne
  jamais l'utiliser, ni d'outil ou de connecteur branché dessus (par exemple un connecteur Supabase
  relié à ProgMeca) pour ce projet.
- Supabase : seulement la clé **publishable** (`sb_publishable_…`) côté application ; jamais la clé
  secrète / `service_role`. La sécurité repose sur les règles RLS (`supabase/migrations`).

## Commandes

```bash
npm install
npm run dev              # http://localhost:3000
npm run typecheck        # tsc --noEmit
npm run build:static     # version publiée : dossier out/ (sans serveur, PDF par l'impression du navigateur)
```

Publication : chaque envoi (push) sur `main` déclenche `.github/workflows/publier.yml`, qui construit
`out/` et le publie sur GitHub Pages. Le site fonctionne dans un sous-dossier
(`https://<compte>.github.io/<depot>/`) grâce aux chemins relatifs (`assetPrefix: './'`, `ASSET_BASE`
vide en statique) : ne pas introduire de chemins absolus (`/logo.png`, `fetch('/…')`).

## Données

- **Mode local** (par défaut) : tout est dans le navigateur, IndexedDB base `atelier-existant`,
  magasin `kv`, clés `atelier-existant:dossiers:v1` (dossiers, photos comprises en data URL) et
  `atelier-existant:bibliotheque:v1`. Ces données sont liées à l'adresse du site : changer d'adresse =
  repartir vide, sauf import.
- **Mode en ligne** : Supabase, configuré depuis l'appli (« Mode local · passer en ligne », réglage
  gardé dans le navigateur, aucune variable de build nécessaire). Tables `dossiers`, `bibliotheques`,
  stockage privé des photos (`supabase/migrations/20261115000000_init.sql`). Connexion par
  mot de passe (comptes créés dans le tableau de bord Supabase, inscriptions désactivées).
- **Sauvegarde complète** (page Dossiers) : un fichier JSON `{ format: 'atelier-existant-sauvegarde',
  dossiers, bibliotheque }` ; « Importer » le relit et propose de restaurer la bibliothèque.
  `outils/sauvegarde-ancien-site.js` produit le même fichier depuis la console d'un ancien site.
- Ne jamais écrire de migration destructive ; tout changement de schéma des dossiers passe par
  `lib/migrate.ts` (`normalizeDossier`, idempotent).

## Repères dans le code

- `app/page.tsx` : routeur client (accueil, dossiers, studio, bibliothèque, devis…).
- `components/Studio.tsx` : étapes de rédaction + aperçu (clic dans l'aperçu → ouvre l'endroit
  correspondant ; numéros de page calculés par `lib/pagesApercu.ts`, même découpage que le PDF).
- `components/ReportPreview.tsx` : le livrable (une `section.report-page` par partie, `data-anchor`).
- `lib/pagination.ts` : export PDF paginé avec paged.js (pieds de page, « Page n / N »).
- `components/FicheDesordreEditor.tsx`, `lib/fiches.ts` : fiches désordres. Numérotation automatique
  (`renumeroter`) par zone puis du moins urgent (P3) au plus urgent (P1) ; « hypothèse à vérifier »
  rendue en italique ; propositions d'amélioration ; fiches relues → bibliothèque.
- Bibliothèque : `lib/library.ts` (`normalizeLibrary`, fusion des lots livrés via
  `LOTS_ENRICHISSEMENT` + `lotsLivres`), `lib/templates.ts`, `lib/preconisations.ts`,
  `lib/biblio2026*.ts` (lots d'enrichissement ; `biblio2026c.ts` = textes rédigés par Lorine
  Gratadour, à considérer comme la référence de style : « Nous avons relevé… », « Nous préconisons… »,
  listes à tirets). `lib/catalogue.ts` : catégories (ouvrage / nature d'intervention), recherche avec
  synonymes, corps d'état = **métiers** uniquement, fusion des doublons.
- Priorités : P1 « Urgent », P2 « À court terme », P3 « À moyen terme » (`lib/constants.ts`).
- Pour ajouter du contenu à la bibliothèque des utilisateurs existants : créer un nouveau lot
  (identifiant unique) dans `LOTS_ENRICHISSEMENT` ; ne pas modifier les entrées déjà livrées.

## Méthode

- Vérifier dans un navigateur (Puppeteer est en dépendance optionnelle) : parcours concerné +
  export PDF, avant de publier.
- Limiter le nombre de publications inutiles ; regrouper les changements.
- Ne jamais toucher aux données de l'utilisatrice sans sauvegarde préalable.

## À prévoir

- Next.js 14.2.15 est signalé vulnérable par npm ; le site publié est statique (aucun serveur), donc
  peu exposé, mais une mise à jour vers une version corrigée de Next 14 est à faire puis à vérifier.
