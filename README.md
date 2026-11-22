# Studio — L'Atelier de l'Existant

Application web de rédaction et de génération des livrables de diagnostic sanitaire et structurel du bâti ancien. Elle remplace Word : saisie pas à pas (ordinateur ou tablette sur le terrain), aperçu A4 en temps réel, export PDF.

## Mise en ligne

Voir **GUIDE-GITHUB.md** : hébergement gratuit sur GitHub Pages (publication automatique à chaque envoi sur `main`), et récupération des données d'un ancien site.
Enregistrement en ligne (facultatif) : **GUIDE-SUPABASE.md**. Contexte pour Claude Code : **CLAUDE.md**.

## Démarrer

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start      # production (export PDF serveur via Puppeteer)
npm run build:static            # version statique dans out/ (sans serveur, PDF via impression)
```

Puppeteer est une dépendance optionnelle. En local il télécharge Chromium ; sur un serveur sans Chromium, définir `PUPPETEER_EXECUTABLE_PATH`. Sur Vercel, remplacer par `puppeteer-core` + `@sparticuz/chromium`.

## Architecture

```
app/
  layout.tsx            Polices auto-hébergées (Fontsource), métadonnées
  page.tsx              Routeur client : tableau de bord ⇄ studio
  print/page.tsx        Page de rendu pour Puppeteer (lit window.__DOSSIER__)
  api/pdf/route.ts      POST dossier → PDF A4 (Chromium headless)
  globals.css           Design system + règles @page A4 (aperçu = impression = PDF)
components/
  Dashboard.tsx         Liste des affaires, filtres de statut, recherche, création par type
  Studio.tsx            Éditeur : étapes | saisie | aperçu, annuler, export
  steps.tsx             Étapes : Projet, Contexte (+ plans et cartes), Zones, Photos, Désordres, Mesures, Synthèse, Annuaire
  CommercialStep.tsx    Étape « Devis et factures » d'un dossier : devis, factures, rendez-vous, date de rendu
  ConsultationStep.tsx  Accompagnement : lots, offres d'entreprises, comparatif, apprentissage des prix
  CommercialDoc.tsx     Devis / facture A4 imprimable (mentions légales françaises)
  Gestion.tsx           Suivi de l'entreprise : pilotage, devis, factures, agenda, mon entreprise
  PhrasePicker.tsx      Sélecteur de textes types avec recherche, favoris et tri par usage
  AppNav.tsx            Barre du haut : Accueil, Dossiers, Organisation, Contacts, Relation client, Bibliothèque (menus déroulants)
  Accueil.tsx           Agenda du jour, semaine, alertes, liste de choses à faire
  DevisClient.tsx       Devis avant dossier : client, questionnaire (prix ajusté), offre, proposition imprimable ; validation = création du dossier
  Supports.tsx          Proposition commerciale, plaquette, « Préparer la visite », questionnaire papier
  Contacts.tsx          Contacts : clients, entreprises (travaillé / possibles), partenaires
  RelationClient.tsx    Modèles de mails à variables, supports de communication, signature
  steps2.tsx            Vigilance et études (avis), préconisations à solutions multiples (diagnostic), classeur, plans de repérage, guides, cadastre et urbanisme automatiques
  guides.tsx            Guides de bonnes pratiques illustrés (schémas SVG à faire / à éviter)
  LibraryEditor.tsx     « Ma bibliothèque » : listes déroulantes et désordres types modifiables
  LibraryProvider.tsx   Chargement / enregistrement de la bibliothèque (navigateur ou Supabase)
  PhraseField.tsx       Champ texte avec liste déroulante de textes types et bouton « + Ma liste »
  VisitImport.tsx       Import des photos de visite : tri, regroupement en sujets, zones, fiches pré-rédigées
  FicheDesordreEditor   Fiche D-XXX : duo photo, CONST/HYP/ACT, confiance, P1/P2/P3, chiffrage
  ReportPreview.tsx     Rendu HTML/CSS du livrable, plan adapté aux 4 types
  SynthesisTable.tsx    Agrégation automatique + scénarios A/B/C (variantes éditeur / rapport)
  ui.tsx                Champs, sélecteur de priorité, dépôt photo (glisser-déposer / appareil photo)
lib/
  types.ts              Schéma TypeScript unifié du dossier
  dossier.schema.json   Même schéma en JSON Schema (validation API / import)
  constants.ts          Référentiel métier : priorités, phases §6.2, pathologies, lots, textes juridiques
  calc.ts               Totaux par priorité / lot, scénarios (aléas, TVA), feuille de route
  factory.ts            Numérotation DIA-AAAA-### et D-XXX, dossier vierge, dossier d'exemple
  storage.ts            Persistance : Supabase si configuré, sinon navigateur (sauvegarde auto)
  supabase.ts           Client Supabase + session
  cloud.ts              Synchronisation : table dossiers (JSON) + bucket privé photos, liens signés
supabase/migrations/    Script SQL : table, règles RLS, bucket photos
  image.ts              Redimensionnement / compression des photos terrain
  exif.ts               Heure de prise de vue (EXIF) → ordre de visite
  templates.ts          Bibliothèque de désordres types (texte pré-rédigé d'après le référentiel)
  idb.ts                Stockage local IndexedDB (mode sans Supabase)
  library.ts            Textes types par défaut (listes déroulantes)
  narrative.ts          Rédaction automatique de la synthèse et de la feuille de route
  business.ts           Entreprise, équipe, offre commerciale, bibliothèque de prix qui s'affine
  commercial.ts         Devis, factures, numérotation continue, avancement, agenda, export .ics
  maps.ts               Cadastre (tuiles WMTS), cartes anciennes (IGN), urbanisme et servitudes (API Carto GPU), Géorisques, liens Géoportail
  preconisations.ts     Préconisations types (même niveau que les désordres types)
  migrate.ts            Conversion des anciens dossiers (types msu/expertise/modulaire)
  publicData.ts         Datation / typologie proposées (Base Adresse Nationale + base nationale des bâtiments)
  pdf.ts                Export PDF : serveur d'abord, impression navigateur en repli
```

### Principes

- **Une seule source de rendu.** `ReportPreview` sert à l'aperçu, à l'impression et à Puppeteer. Les règles `@page` (A4, marges, pied de page numéroté) sont dans `globals.css` : le PDF est identique à l'aperçu.
- **Un seul schéma pour les 4 livrables.** Le type (`avis` 01 Avis sanitaire, `diagnostic` 02 Diagnostic structurel, `conseil` 03 Diagnostic et conseil, `accompagnement` 04 Accompagnement) est aussi le titre de la mission ; il ne change que les étapes affichées et le plan du rapport (`PLAN` dans `ReportPreview.tsx`). On peut changer de type en cours de rédaction sans rien perdre.
- **Nomenclature des zones conservée partout.** Renommer un code de zone le propage aux fiches désordres.
- **Constat ≠ hypothèse.** La case « hypothèse à vérifier » insère la formule réglementaire dans l'analyse ; le niveau de confiance est imprimé sur chaque fiche.
- **Chronologie des travaux.** Chaque désordre porte une phase (1 à 6) déduite de sa priorité et ajustable ; elle alimente la feuille de route et le Gantt.

### Données en ligne (Supabase)

- Un dossier = une ligne de la table `dossiers` (colonne `data` en JSON). Les photos vont dans le bucket privé `photos` sous `<compte>/<dossier>/<photo>.jpg` ; en base, chaque photo ne garde que son chemin.
- Règles RLS : chaque compte ne lit et n'écrit que ses propres dossiers et photos ; un visiteur non connecté n'a accès à rien.
- Sauvegarde automatique 1,2 s après la dernière modification, dossier par dossier ; en cas d'échec, l'en-tête l'indique avec un bouton « Réessayer ».
- Sans les variables `NEXT_PUBLIC_SUPABASE_*`, l'application repasse en mode local (navigateur).

### Suivi de l'entreprise (sans table supplémentaire)

Devis et factures sont rangés dans chaque dossier (`dossier.commercial`), l'agenda, l'équipe, l'offre commerciale et la bibliothèque de prix dans la bibliothèque (`bibliotheques`). La numérotation DEV-AAAA-### / FAC-AAAA-### est continue sur tous les dossiers ; une facture émise n'est plus modifiable et un dossier facturé ne peut qu'être archivé.

Facturation électronique : réception obligatoire depuis le 1er septembre 2026 ; émission obligatoire pour les micro, petites et moyennes entreprises à partir du 1er septembre 2027 (plateforme agréée). D'ici là, la facture PDF suffit.
