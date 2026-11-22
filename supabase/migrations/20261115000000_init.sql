-- ════════════════════════════════════════════════════════════════════
--  Studio — L'Atelier de l'Existant : base de données Supabase
--  À coller tel quel dans Supabase → SQL Editor → Run (une seule fois).
--  Crée : la table des dossiers, le stockage privé des photos,
--  et les règles de sécurité (chaque compte ne voit que ses dossiers).
-- ════════════════════════════════════════════════════════════════════

-- 1. Table des dossiers ------------------------------------------------
-- Le dossier complet est stocké en JSON (schéma : lib/dossier.schema.json).
-- Quelques colonnes sont dupliquées pour trier et filtrer sans lire le JSON.
create table if not exists public.dossiers (
  id          text primary key,
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  numero      text not null,
  type        text not null,
  status      text not null default 'brouillon' check (status in ('brouillon', 'revision', 'finalise')),
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists dossiers_owner_updated_idx on public.dossiers (owner, updated_at desc);

-- Types de livrables (offre : avis, diagnostic, conseil, accompagnement ; anciens noms conservés)
alter table public.dossiers drop constraint if exists dossiers_type_check;
alter table public.dossiers add constraint dossiers_type_check
  check (type in ('avis', 'diagnostic', 'conseil', 'accompagnement', 'msu', 'expertise', 'modulaire'));

comment on table public.dossiers is 'Dossiers de diagnostic (un document JSON par affaire)';

-- 2. Sécurité des dossiers (Row Level Security) ------------------------
alter table public.dossiers enable row level security;

grant select, insert, update, delete on public.dossiers to authenticated;

drop policy if exists "dossiers : lecture de ses dossiers" on public.dossiers;
create policy "dossiers : lecture de ses dossiers" on public.dossiers
  for select to authenticated
  using ((select auth.uid()) = owner);

drop policy if exists "dossiers : création" on public.dossiers;
create policy "dossiers : création" on public.dossiers
  for insert to authenticated
  with check ((select auth.uid()) = owner);

drop policy if exists "dossiers : modification de ses dossiers" on public.dossiers;
create policy "dossiers : modification de ses dossiers" on public.dossiers
  for update to authenticated
  using ((select auth.uid()) = owner)
  with check ((select auth.uid()) = owner);

drop policy if exists "dossiers : suppression de ses dossiers" on public.dossiers;
create policy "dossiers : suppression de ses dossiers" on public.dossiers
  for delete to authenticated
  using ((select auth.uid()) = owner);

-- 3. Stockage des photos -----------------------------------------------
-- Bucket privé : les photos ne sont jamais publiques, l'application
-- obtient des liens temporaires signés pour les afficher.
-- Chemin des fichiers : <id du compte>/<id du dossier>/<id de la photo>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
-- Mise à jour (novembre 2026) : le classeur du dossier accepte aussi les PDF (plans, actes, devis d'entreprises)
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] where id = 'photos';

drop policy if exists "photos : lecture de ses photos" on storage.objects;
create policy "photos : lecture de ses photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "photos : envoi dans son dossier" on storage.objects;
create policy "photos : envoi dans son dossier" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "photos : remplacement de ses photos" on storage.objects;
create policy "photos : remplacement de ses photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "photos : suppression de ses photos" on storage.objects;
create policy "photos : suppression de ses photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 4. Bibliothèque personnelle (listes déroulantes et désordres types) ----
-- Une ligne par compte. Ajouté le 15/11/2026 : le script reste rejouable,
-- il suffit de le relancer en entier si la base existe déjà.
create table if not exists public.bibliotheques (
  owner       uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.bibliotheques enable row level security;
grant select, insert, update, delete on public.bibliotheques to authenticated;

drop policy if exists "bibliotheque : lecture" on public.bibliotheques;
create policy "bibliotheque : lecture" on public.bibliotheques
  for select to authenticated using ((select auth.uid()) = owner);

drop policy if exists "bibliotheque : création" on public.bibliotheques;
create policy "bibliotheque : création" on public.bibliotheques
  for insert to authenticated with check ((select auth.uid()) = owner);

drop policy if exists "bibliotheque : modification" on public.bibliotheques;
create policy "bibliotheque : modification" on public.bibliotheques
  for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);

drop policy if exists "bibliotheque : suppression" on public.bibliotheques;
create policy "bibliotheque : suppression" on public.bibliotheques
  for delete to authenticated using ((select auth.uid()) = owner);
