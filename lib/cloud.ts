'use client';
import { supabase } from './supabase';
import { uid } from './factory';
import type { Dossier, Photo } from './types';
import { normalizeDossier } from './migrate';

/**
 * Synchronisation Supabase.
 *  - Table `dossiers` : un document JSON par affaire (photos sans leur image).
 *  - Bucket privé `photos` : <compte>/<dossier>/<photo>.jpg
 *  - Affichage : liens signés valables 7 jours, régénérés à chaque chargement.
 */
const BUCKET = 'photos';
const SIGNED_TTL = 60 * 60 * 24 * 7;

const db = () => {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
};

/** Applique fn à chaque photo du dossier (couverture, vues, fiches). */
function mapPhotos(d: Dossier, fn: (p: Photo) => Photo): Dossier {
  const m = (p: Photo | null) => (p ? fn(p) : null);
  return {
    ...d,
    meta: { ...d.meta, photoCouverture: m(d.meta.photoCouverture) },
    contexte: { ...d.contexte, vues: d.contexte.vues.map(fn) },
    zones: d.zones.map((z) => ({ ...z, photos: (z.photos ?? []).map(fn) })),
    desordres: d.desordres.map((x) => ({ ...x, photoEnsemble: m(x.photoEnsemble), photoDetail: m(x.photoDetail), autresPhotos: (x.autresPhotos ?? []).map(fn) })),
    ...(d.plansZones ? { plansZones: d.plansZones.map((p) => ({ ...p, image: m(p.image) })) } : {}),
    ...(d.photosAClasser ? { photosAClasser: d.photosAClasser.map(fn) } : {}),
    ...(d.classeur ? { classeur: { ...d.classeur, documents: d.classeur.documents.map(fn) } } : {}),
  };
}

function photoPaths(d: Dossier): string[] {
  const out: string[] = [];
  mapPhotos(d, (p) => { if (p.path) out.push(p.path); return p; });
  return out;
}

/** Charge tous les dossiers du compte connecté et signe les liens des photos. */
export async function fetchDossiers(): Promise<Dossier[]> {
  const { data, error } = await db().from('dossiers').select('data').order('updated_at', { ascending: false });
  if (error) throw error;
  const list = (data ?? []).map((r) => normalizeDossier(r.data as Dossier));
  const paths = [...new Set(list.flatMap(photoPaths))];
  const signed = new Map<string, string>();
  for (let i = 0; i < paths.length; i += 100) {
    const { data: s, error: e } = await db().storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 100), SIGNED_TTL);
    if (e) throw e;
    s?.forEach((x) => x.path && x.signedUrl && signed.set(x.path, x.signedUrl));
  }
  return list.map((d) => mapPhotos(d, (p) => (p.path ? { ...p, src: signed.get(p.path) ?? '' } : p)));
}

/** Photos déjà envoyées pendant la session : data URL → chemin (évite les doublons). */
const uploaded = new Map<string, string>();

async function uploadPhoto(path: string, dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await db().storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw error;
}

/** Envoie les nouvelles photos puis enregistre le dossier. */
export async function pushDossier(d: Dossier, userId: string): Promise<void> {
  const jobs: Promise<void>[] = [];
  const inThisSave = new Map<string, string>();
  const withPaths = mapPhotos(d, (p) => {
    if (p.path || !p.src.startsWith('data:')) return p;
    const known = uploaded.get(p.src) ?? inThisSave.get(p.src);
    if (known) return { ...p, path: known };
    const path = `${userId}/${d.id}/${p.id ?? uid()}.${p.mime === 'application/pdf' ? 'pdf' : 'jpg'}`;
    const src = p.src;
    inThisSave.set(src, path);
    jobs.push(uploadPhoto(path, src).then(() => { uploaded.set(src, path); }));
    return { ...p, path };
  });
  await Promise.all(jobs);

  // En base : on garde le chemin, pas l'image ni le lien signé (qui expire)
  const stored = mapPhotos(withPaths, (p) => (p.path ? { ...p, src: '' } : p));
  const { error } = await db().from('dossiers').upsert({
    id: d.id,
    numero: d.numero,
    type: d.type,
    status: d.status,
    data: stored,
    updated_at: d.updatedAt,
  });
  if (error) throw error;
}

/** Supprime le dossier et toutes ses photos. */
export async function deleteDossierCloud(id: string, userId: string): Promise<void> {
  const folder = `${userId}/${id}`;
  const { data: files } = await db().storage.from(BUCKET).list(folder, { limit: 1000 });
  if (files?.length) await db().storage.from(BUCKET).remove(files.map((f) => `${folder}/${f.name}`));
  const { error } = await db().from('dossiers').delete().eq('id', id);
  if (error) throw error;
}
