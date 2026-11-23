# Le Studio sur GitHub (gratuit, sans crédits)

Le Studio est déjà en ligne :

**https://n5gjzt44ms-boop.github.io/atelier-existant-studio/**

- Dépôt GitHub : `n5gjzt44ms-boop/atelier-existant-studio` (compte de Benoît, dépôt public, à part de
  ses autres projets).
- Dossier sur l'ordinateur de Benoît : `Documents\atelier-existant-studio`.
- Publication : automatique à chaque envoi sur `main` (2 à 3 minutes), par GitHub Pages.

Il reste à **récupérer les données de Lorine** (parties 1 et 2). L'ordre compte : **d'abord
sauvegarder**, ensuite importer.

---

## 1. Sauvegarder tout ce qui est dans l'ancien site (dans le Chrome de Lorine)

Les dossiers et la bibliothèque sont enregistrés dans le navigateur, à l'adresse de l'ancien site
(`capable-bonbon-403d66.netlify.app`). Ils ne suivront pas tout seuls : on les met dans un fichier.

1. Sur app.netlify.com, connectez-vous avec le compte **l.gratadour12** (le site est protégé : sans
   cette connexion, il affiche « This site is private »).
2. Dans **le même Chrome que d'habitude**, ouvrez l'ancien site : votre dossier en cours doit apparaître.
3. Appuyez sur **F12**, onglet **Console**.
4. Ouvrez le fichier `outils/sauvegarde-ancien-site.js` (Bloc-notes), copiez tout, collez dans la
   console, appuyez sur **Entrée**. Si Chrome refuse le collage, tapez d'abord `allow pasting` puis
   Entrée, et recollez.
5. Un fichier `atelier-sauvegarde-complete-….json` se télécharge : dossiers, photos et bibliothèque.
   **Gardez-le précieusement** (copie sur clé USB ou dans un cloud).

Rien n'est effacé de l'ancien site : c'est une copie.

## 2. Retrouver les dossiers sur la nouvelle adresse

1. Ouvrez **https://n5gjzt44ms-boop.github.io/atelier-existant-studio/** (dans le Chrome de Lorine)
   → **Dossiers** → **Importer** → choisissez le fichier de l'étape 1.
2. Un bandeau propose **« Restaurer la bibliothèque »** : cliquez-le pour retrouver vos désordres,
   préconisations et phrases personnalisés.
3. Vérifiez votre dossier en cours, puis continuez à rédiger normalement. Ajoutez l'adresse à vos
   favoris.

Pensez à cliquer **« Sauvegarde complète »** (page Dossiers) de temps en temps : c'est votre copie de
secours. Les données restent dans le navigateur : vos dossiers et vos clients ne sont **pas** dans le
code publié, seuls le logiciel et les textes de la bibliothèque sont visibles.

## 3. Faire évoluer le logiciel avec Claude Code

- Ouvrez Claude Code (application Claude, onglet Code) sur le dossier
  `Documents\atelier-existant-studio`. Le fichier `CLAUDE.md` lui donne tout le contexte.
- Demandez simplement le changement voulu, en français. Claude Code le fait, vérifie que tout
  fonctionne, puis l'envoie lui-même sur `main` : le site se met à jour tout seul en 2 à 3 minutes,
  sans limite de crédits. Il donne ensuite l'adresse pour vérifier.
- En fin de séance, la commande `/fin-de-session` met à jour `CLAUDE.md` (ce qui a été fait, ce qui
  reste à faire) pour que la séance suivante reparte du bon endroit.
- Claude Code ne touche qu'à ce dépôt : jamais aux autres projets GitHub de Benoît.

## 4. (Facultatif) Enregistrer en ligne avec Supabase

Utile pour retrouver les dossiers sur plusieurs appareils et ne plus dépendre du navigateur.
Suivre `GUIDE-SUPABASE.md`, avec un compte Supabase de Lorine uniquement (**jamais** l'organisation
ProgMeca). Le passage en ligne envoie les dossiers et la bibliothèque du navigateur vers ce compte.
