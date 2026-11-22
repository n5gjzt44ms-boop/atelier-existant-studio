# Mettre le Studio en ligne — Supabase + Netlify (gratuit)

Durée : environ 20 minutes. Résultat : une adresse web (`https://….netlify.app`) protégée par un identifiant. Tes dossiers et tes photos sont enregistrés en ligne et tu les retrouves sur ton ordinateur et sur ta tablette.

- **Supabase** (gratuit) : base de données, comptes de connexion, stockage des photos.
- **Netlify** (gratuit) : hébergement du site.

---

## 1. Créer le projet Supabase

Dans le **nouveau** compte Supabase (celui de L'Atelier) :

1. **New project**.
2. Nom : `atelier-existant`.
3. **Database password** : clique sur *Generate*, puis garde ce mot de passe dans un endroit sûr. L'application n'en a pas besoin, mais il sert en cas de maintenance.
4. **Region** : *West EU (Paris)*.
5. **Create new project**, puis attends 1 à 2 minutes.

## 2. Créer la base (copier-coller d'un script)

1. Menu de gauche → **SQL Editor** → **New query**.
2. Ouvre le fichier `supabase/migrations/20261115000000_init.sql` du projet, copie **tout** son contenu et colle-le.
3. **Run**. Le message attendu est *Success. No rows returned*.
4. Vérification :
   - **Table Editor** : une table `dossiers` apparaît ;
   - **Storage** : un espace `photos` apparaît.

Le script peut être relancé sans risque. **Si vous l’aviez déjà lancé auparavant, relancez-le en entier à chaque nouvelle version** : il ajoute ce qui manque (table `bibliotheques`, nouveaux types de mission 01 à 04, PDF acceptés dans le classeur) sans toucher à vos dossiers.

## 3. Créer ton compte de connexion

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Saisis ton e-mail et un mot de passe, puis **coche « Auto Confirm User »**.
3. Ferme la porte aux inconnus : **Authentication** → **Sign In / Providers** (ou *Settings*) → **désactive « Allow new users to sign up »**. Ainsi, personne ne peut se créer de compte.

Pour ajouter plus tard un collaborateur, refais l'étape 1 avec son adresse. Chaque compte voit **uniquement ses propres dossiers**.

## 4. Récupérer les 2 valeurs publiques

**Project Settings** (roue crantée) :

- **Data API** → **Project URL**, de la forme `https://xxxx.supabase.co` ;
- **API Keys** → **Publishable key**, qui commence par `sb_publishable_…`. Sur un projet plus ancien, c'est la clé « anon public ».

⚠️ N'utilise **jamais** la clé *secret* (`sb_secret_…`) ou *service_role*, et ne la donne à personne.

## 5. Tester sur ton ordinateur (facultatif mais conseillé)

Il faut Node.js 20 ou plus récent (nodejs.org).

```bash
cd atelier-existant-studio
npm install
cp .env.example .env.local      # puis colle tes 2 valeurs dans .env.local
npm run dev
```

Ouvre http://localhost:3000, connecte-toi, puis clique sur **Charger le dossier d'exemple**.

## 6. Mettre en ligne sur Netlify

### Option A — sans GitHub (le plus simple)

1. Remplis `.env.local` (étape 5), puis lance :
   ```bash
   npm run build:static
   ```
   Un dossier `out` est créé.
2. Va sur **https://app.netlify.com/drop**, crée un compte gratuit, puis **glisse le dossier `out`** dans la page.
3. Netlify te donne une adresse en `…netlify.app`. Tu peux la renommer dans *Site configuration → Change site name*.

Pour mettre à jour le site : relance `npm run build:static`, puis glisse à nouveau `out` dans *Deploys*.

### Option B — avec GitHub (mises à jour automatiques)

1. Mets le projet sur un dépôt GitHub. Le fichier `.env.local` n'est **pas** envoyé, c'est voulu.
2. Netlify → **Add new site** → **Import an existing project** → choisis le dépôt. Le fichier `netlify.toml` règle la compilation tout seul.
3. **Site configuration → Environment variables** : ajoute
   - `NEXT_PUBLIC_SUPABASE_URL`,
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (la clé *publishable*).
4. **Deploy**. Chaque modification envoyée sur GitHub met ensuite le site à jour.

## 7. Dernier réglage Supabase

**Authentication** → **URL Configuration** → **Site URL** : colle l'adresse Netlify. C'est nécessaire pour que le lien « Mot de passe oublié » renvoie au bon site.

---

## À savoir

- **Mise en pause après 7 jours sans utilisation.** C'est la règle de l'offre gratuite. L'application affiche alors « Impossible de charger les dossiers ». Il suffit d'aller sur supabase.com, d'ouvrir le projet et de cliquer sur **Restore / Resume**. Les données sont conservées.
- **Limites gratuites** : 500 Mo pour la base (des milliers de dossiers) et 1 Go pour les photos. Elles sont compressées à l'import, ce qui représente environ 3 000 à 4 000 photos.
- **Sauvegarde** : l'offre gratuite ne fait pas de sauvegarde automatique. Le bouton **JSON** du studio exporte un dossier ; fais-le pour les dossiers importants.
- **Sur le terrain** : l'en-tête indique « enregistrement… » puis « enregistré en ligne ». Sans réseau, il affiche « échec de l'enregistrement » avec un bouton **Réessayer**. **Ne ferme pas l'onglet** avant d'avoir retrouvé le réseau et vu « enregistré en ligne », sinon les dernières modifications et les photos prises hors ligne seront perdues.
- **PDF** : **Exporter PDF** → choisir **Enregistrer au format PDF**, marges « Par défaut », cocher **Graphiques d'arrière-plan**. Avec Google Chrome, les pages sont numérotées.
- **Tablette** : ouvre l'adresse dans Safari ou Chrome → **Partager → Sur l'écran d'accueil**. Le studio s'ouvre alors comme une application.
- **Devis, factures, agenda** : tout est enregistré avec les dossiers et la bibliothèque, donc synchronisé entre ordinateur et tablette. Renseigne d'abord **Suivi et facturation → Mon entreprise** (SIRET, adresse, IBAN) : ces informations apparaissent sur les devis et factures.
- **Agenda sur le téléphone** : **Agenda → Exporter vers mon calendrier (.ics)**, puis ouvre le fichier sur le téléphone ou importe-le dans Google Agenda.
