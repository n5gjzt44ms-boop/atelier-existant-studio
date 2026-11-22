'use client';
import { useEffect, useState } from 'react';
import { nextDesordreNumero, uid } from './factory';
import type { Desordre, Dossier, Photo, Zone } from './types';

/**
 * Fiche désordre copiée (sans ses photos), gardée dans le navigateur :
 * on peut la coller dans une autre zone, ou dans un autre dossier.
 */
export interface FicheCopiee { fiche: Desordre; zone?: { code: string; nom: string }; dossier: string }
const CLE = 'atelier-fiche-copiee';
const EVT = 'atelier-fiche-copiee';

export function lireCopie(): FicheCopiee | null {
  try { const v = localStorage.getItem(CLE); return v ? (JSON.parse(v) as FicheCopiee) : null; } catch { return null; }
}
export function copierDansPressePapier(d: Dossier, f: Desordre) {
  const z = d.zones.find((x) => x.code === f.zoneCode);
  const fiche = { ...f, photoEnsemble: null, photoDetail: null, autresPhotos: [] };
  try { localStorage.setItem(CLE, JSON.stringify({ fiche, zone: z ? { code: z.code, nom: z.nom } : undefined, dossier: d.numero })); } catch { /* stockage indisponible */ }
  window.dispatchEvent(new Event(EVT));
}
export function viderPressePapier() {
  try { localStorage.removeItem(CLE); } catch { /* rien */ }
  window.dispatchEvent(new Event(EVT));
}
export function useFicheCopiee(): FicheCopiee | null {
  const [c, setC] = useState<FicheCopiee | null>(null);
  useEffect(() => {
    const maj = () => setC(lireCopie());
    maj();
    window.addEventListener(EVT, maj);
    window.addEventListener('storage', maj);
    return () => { window.removeEventListener(EVT, maj); window.removeEventListener('storage', maj); };
  }, []);
  return c;
}

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Remplace le nom et le code de l’ancienne zone par ceux de la nouvelle dans un texte (en gardant la majuscule initiale). */
export function adapterTexte(t: string, ancienne?: { code: string; nom: string }, nouvelle?: Zone): string {
  if (!t || !ancienne || !nouvelle) return t;
  let r = t;
  if (ancienne.code && ancienne.code !== nouvelle.code) r = r.replace(new RegExp(`\\b${echapper(ancienne.code)}\\b`, 'g'), nouvelle.code);
  const a = ancienne.nom.trim(), n = nouvelle.nom.trim();
  if (a && n && a.toLowerCase() !== n.toLowerCase()) {
    r = r.replace(new RegExp(echapper(a), 'gi'), (m) => (m[0] === m[0].toUpperCase() ? n[0].toUpperCase() + n.slice(1) : n[0].toLowerCase() + n.slice(1)));
  }
  return r;
}

/**
 * Colle une fiche dans une zone : nouveau numéro, nouvelle zone, photos choisies,
 * et mention de l’ancienne zone remplacée dans les textes. Tout le reste (constat,
 * analyse, préconisation, solutions, chiffrage, lot, priorité) est repris.
 */
export function collerFiche(d: Dossier, source: Desordre, ancienne: { code: string; nom: string } | undefined, zoneCode: string, photos: Photo[]): { d: Dossier; copie: Desordre } {
  const z = d.zones.find((x) => x.code === zoneCode);
  const ad = (t: string) => adapterTexte(t, ancienne, z);
  const copie: Desordre = {
    ...source,
    id: uid(),
    numero: nextDesordreNumero(d.desordres),
    zoneCode,
    constat: ad(source.constat), analyse: ad(source.analyse), investigations: ad(source.investigations), preconisation: ad(source.preconisation),
    solutions: source.solutions?.map((s) => ({ ...s, id: uid(), texte: ad(s.texte), titre: ad(s.titre) })),
    chiffrage: { ...source.chiffrage, lignes: source.chiffrage.lignes?.map((l) => ({ ...l, id: uid() })) },
    photoEnsemble: photos[0] ?? null, photoDetail: photos[1] ?? null, autresPhotos: photos.slice(2),
    perso: [],
  };
  return { d: { ...d, desordres: [...d.desordres, copie] }, copie };
}

/* ─── Synchronisation des fiches d'un même désordre ─── */
const CHAMPS_TEXTE = ['constat', 'analyse', 'investigations', 'preconisation'] as const;
const CHAMPS_SIMPLES = ['lot', 'lots', 'priorite', 'confiance', 'phase', 'element'] as const;
const zoneDe = (d: Dossier, code: string) => d.zones.find((z) => z.code === code);

/** Fiches du même désordre (même type), synchronisables avec f. */
export function fichesJumelles(d: Dossier, f: Desordre): Desordre[] {
  if (f.independante || !f.type.trim() || f.type === 'À qualifier') return [];
  return d.desordres.filter((x) => x.id !== f.id && !x.independante && x.type === f.type);
}

/**
 * Enregistre une modification faite à la main dans « apres » et la reporte sur les autres fiches du même désordre.
 * Chaque champ modifié à la main est noté dans « perso » : il n'est ensuite jamais remplacé par une autre fiche.
 * Une fiche jumelle reçoit donc le texte tant qu'elle n'a pas été personnalisée sur ce champ (nom de zone adapté).
 */
export function synchroniserJumelles(d: Dossier, avant: Desordre | undefined, apres: Desordre): Desordre[] {
  if (!avant) return d.desordres.map((x) => (x.id === apres.id ? apres : x));
  const changes: string[] = [];
  for (const k of [...CHAMPS_TEXTE, ...CHAMPS_SIMPLES]) if (avant[k] !== apres[k]) changes.push(k);
  if (JSON.stringify(avant.solutions ?? []) !== JSON.stringify(apres.solutions ?? [])) changes.push('solutions');
  const f: Desordre = changes.length ? { ...apres, perso: Array.from(new Set([...(apres.perso ?? []), ...changes])) } : apres;
  const jum = avant.type === apres.type ? new Set(fichesJumelles(d, apres).map((x) => x.id)) : new Set<string>();
  const zF = zoneDe(d, apres.zoneCode);
  const source = zF ? { code: zF.code, nom: zF.nom } : undefined;
  return d.desordres.map((x) => {
    if (x.id === f.id) return f;
    if (!jum.has(x.id) || !changes.length) return x;
    const zX = zoneDe(d, x.zoneCode);
    const libre = (k: string) => !(x.perso ?? []).includes(k);
    let y: Desordre = x;
    for (const k of CHAMPS_TEXTE) if (changes.includes(k) && libre(k)) y = { ...y, [k]: adapterTexte(apres[k], source, zX) };
    for (const k of CHAMPS_SIMPLES) if (changes.includes(k) && libre(k)) y = { ...y, [k]: apres[k] };
    if (changes.includes('solutions') && libre('solutions')) {
      y = { ...y, solutions: (apres.solutions ?? []).map((o) => ({ ...o, id: uid(), titre: adapterTexte(o.titre, source, zX), texte: adapterTexte(o.texte, source, zX) })) };
    }
    if (y !== x && x.aRelire && !apres.aRelire) y = { ...y, aRelire: false };
    return y;
  });
}

/** Modèle pour une nouvelle fiche : la fiche déjà rédigée du même désordre la plus complète, s'il y en a une. */
export function ficheModele(d: Dossier, type: string): Desordre | undefined {
  const l = d.desordres.filter((x) => x.type === type && !x.independante && (x.constat.trim() || x.preconisation.trim()));
  return l.sort((a, b) => Number(!!a.aRelire) - Number(!!b.aRelire) || (b.constat.length + b.preconisation.length) - (a.constat.length + a.preconisation.length))[0];
}
