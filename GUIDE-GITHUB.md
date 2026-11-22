# Passer le Studio sur GitHub (gratuit, sans crédits)

Tout se fait sur **les comptes de Lorine** (adresse l.gratadour12…) : GitHub, et Supabase si besoin.
Compter environ 30 minutes. L'ordre compte : **d'abord sauvegarder**, ensuite déménager.

---

## 1. Sauvegarder tout ce qui est dans l'ancien site

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

## 2. Créer le compte GitHub

1. Sur github.com → **Sign up**, avec l'adresse de Lorine. Choisissez un nom d'utilisateur
   (il apparaîtra dans l'adresse du site, par exemple `lgratadour`).
2. Installez **GitHub Desktop** (desktop.github.com) et connectez-le à ce compte
   (File → Options → Accounts → Sign in).

## 3. Mettre le logiciel sur GitHub

1. Décompressez `atelier-existant-studio.zip` dans un dossier, par exemple `Documents\atelier-studio`.
2. GitHub Desktop → **File → Add local repository** → choisissez ce dossier → cliquez
   **« create a repository »** puis **Create repository**.
3. Cliquez **Publish repository** :
   - nom : `atelier-studio` ;
   - **décochez « Keep this code private »** : GitHub Pages n'est gratuit qu'avec un dépôt public.
     Vos dossiers et vos clients ne sont **pas** dans le code (ils restent dans le navigateur ou dans
     Supabase) ; seuls le logiciel et les textes de la bibliothèque sont visibles.
4. Sur github.com, ouvrez le dépôt → **Settings → Pages** → **Source : GitHub Actions**.
5. Onglet **Actions** : la publication démarre (2 à 3 minutes, pastille verte quand c'est fini).
   Si rien ne démarre : Actions → « Publier le site » → **Run workflow**.
6. Le site est en ligne à l'adresse `https://<nom-utilisateur>.github.io/atelier-studio/`.
   Ajoutez-la à vos favoris.

## 4. Retrouver vos dossiers sur la nouvelle adresse

1. Ouvrez la nouvelle adresse → **Dossiers** → **Importer** → choisissez le fichier de l'étape 1.
2. Un bandeau propose **« Restaurer la bibliothèque »** : cliquez-le pour retrouver vos désordres,
   préconisations et phrases personnalisés.
3. Vérifiez votre dossier en cours, puis continuez à rédiger normalement.

Pensez à cliquer **« Sauvegarde complète »** (page Dossiers) de temps en temps : c'est votre copie de
secours.

## 5. (Facultatif) Enregistrer en ligne avec Supabase

Utile pour retrouver vos dossiers sur plusieurs appareils et ne plus dépendre du navigateur.
Suivre `GUIDE-SUPABASE.md`, avec le compte Supabase de Lorine uniquement. Le passage en ligne envoie
les dossiers et la bibliothèque du navigateur vers votre compte.

## 6. Faire évoluer le logiciel avec Claude Code

- Installez l'application **Claude** (bureau) et ouvrez **Claude Code** sur le dossier
  `atelier-studio` (celui de GitHub Desktop). Le fichier `CLAUDE.md` lui donne tout le contexte.
- Pour publier une amélioration : Claude Code fait les modifications, puis dans GitHub Desktop
  **Commit to main** → **Push origin**. Le site se met à jour tout seul en 2 à 3 minutes,
  sans limite de crédits.
- Pour garder les comptes séparés, laissez Claude Code utiliser **GitHub Desktop sur cet ordinateur**
  (connecté au compte de Lorine) plutôt qu'une connexion GitHub ajoutée dans les réglages du compte
  Claude, qui est partagé.
