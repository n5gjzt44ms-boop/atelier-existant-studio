'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dossier } from './types';
import { sampleDossier } from './factory';
import { cloudEnabled } from './supabase';
import { deleteDossierCloud, fetchDossiers, pushDossier } from './cloud';
import { idbDelete, idbGet, idbSet } from './idb';
import { normalizeDossier } from './migrate';

/**
 * Persistance des dossiers, en deux modes :
 *  - Supabase (si configuré) : sauvegarde automatique en ligne, par dossier ;
 *  - local (sinon) : navigateur uniquement (démo, test hors ligne).
 */
const KEY = 'atelier-existant:dossiers:v1';

export type SyncState = 'local' | 'saving' | 'saved' | 'error';

/** Mode local : IndexedDB (avec reprise des anciens dossiers en localStorage). */
export async function loadDossiers(): Promise<Dossier[]> {
  try {
    const stored = await idbGet<Dossier[]>(KEY);
    if (stored) return stored.map(normalizeDossier);
    const legacy = localStorage.getItem(KEY);
    if (legacy) {
      const list = JSON.parse(legacy) as Dossier[];
      await idbSet(KEY, list);
      localStorage.removeItem(KEY);
      return list.map(normalizeDossier);
    }
  } catch { /* stockage indisponible */ }
  return [sampleDossier()];
}

export async function saveDossiers(list: Dossier[]): Promise<boolean> {
  try {
    await idbSet(KEY, list);
    return true;
  } catch {
    return false; // espace plein ou navigation privée stricte
  }
}

/** Dossiers laissés dans ce navigateur (mode local), hors dossier d'exemple intact. */
export async function readLocalForTransfer(): Promise<Dossier[]> {
  try {
    const legacy = localStorage.getItem(KEY);
    const list = (await idbGet<Dossier[]>(KEY)) ?? (legacy ? (JSON.parse(legacy) as Dossier[]) : []);
    return list.filter((d) => !(d.numero === 'DIA-2026-014' && d.meta?.client?.nom === 'M. et Mme Delmas'));
  } catch { return []; }
}

/** Après transfert : on garde une copie de secours sous une autre clé. */
export async function archiveLocal() {
  try {
    const list = await idbGet<Dossier[]>(KEY);
    if (list) await idbSet(KEY + ':sauvegarde-avant-transfert', list);
    await idbDelete(KEY);
    localStorage.removeItem(KEY);
  } catch { /* */ }
}

/** Sauvegarde complète : tous les dossiers (photos comprises) et la bibliothèque, dans un seul fichier. */
export const FORMAT_SAUVEGARDE = 'atelier-existant-sauvegarde';
export interface Sauvegarde { format: typeof FORMAT_SAUVEGARDE; version: 1; exporteLe: string; dossiers: Dossier[]; bibliotheque?: unknown }
export function telechargerSauvegarde(dossiers: Dossier[], bibliotheque: unknown) {
  const s: Sauvegarde = { format: FORMAT_SAUVEGARDE, version: 1, exporteLe: new Date().toISOString(), dossiers, bibliotheque };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(s)], { type: 'application/json' }));
  a.download = `atelier-sauvegarde-complete-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** Lecture d'un fichier JSON exporté : un dossier, une liste de dossiers, ou une sauvegarde complète. */
export async function lireSauvegarde(file: File): Promise<{ dossiers: Dossier[]; bibliotheque?: unknown }> {
  const data = JSON.parse(await file.text());
  if (data && data.format === FORMAT_SAUVEGARDE) return { dossiers: validerDossiers(data.dossiers ?? [], true), bibliotheque: data.bibliotheque };
  return { dossiers: validerDossiers(Array.isArray(data) ? data : [data]) };
}
function validerDossiers(list: Dossier[], videOk = false): Dossier[] {
  const valid = list.filter((d) => d && typeof d.id === 'string' && typeof d.numero === 'string' && Array.isArray(d.desordres) && d.meta);
  if (!valid.length && !videOk) throw new Error('Ce fichier ne contient pas de dossier du Studio.');
  return valid.map(normalizeDossier);
}

/** Lecture d'un fichier JSON exporté (un dossier ou une liste). */
export async function parseDossierFile(file: File): Promise<Dossier[]> {
  const data = JSON.parse(await file.text());
  const list = (Array.isArray(data) ? data : [data]) as Dossier[];
  const valid = list.filter((d) => d && typeof d.id === 'string' && typeof d.numero === 'string' && Array.isArray(d.desordres) && d.meta);
  if (!valid.length) throw new Error('Ce fichier ne contient pas de dossier du Studio.');
  return valid.map(normalizeDossier);
}

export function useDossiers(userId: string | null) {
  const [dossiers, setDossiers] = useState<Dossier[] | null>(null);
  const [sync, setSync] = useState<SyncState>(cloudEnabled ? 'saved' : 'local');
  const [loadError, setLoadError] = useState<string | null>(null);
  const pending = useRef(new Map<string, Dossier>());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const chain = useRef<Promise<void>>(Promise.resolve());

  /* Chargement */
  const reload = useCallback(() => {
    if (!cloudEnabled) { loadDossiers().then(setDossiers); return; }
    if (!userId) { setDossiers(null); return; }
    setLoadError(null);
    fetchDossiers()
      .then(setDossiers)
      .catch((e) => setLoadError(e?.message ?? 'Chargement impossible'));
  }, [userId]);
  useEffect(reload, [reload]);

  /* Mode local : enregistrement de toute la liste */
  useEffect(() => {
    if (cloudEnabled || !dossiers) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { saveDossiers(dossiers).then((ok) => setSync(ok ? 'local' : 'error')); }, 400);
  }, [dossiers]);

  /* Mode Supabase : envoi des dossiers modifiés, l'un après l'autre */
  const flush = useCallback(() => {
    if (!userId) return;
    const items = [...pending.current.values()];
    pending.current.clear();
    if (!items.length) return;
    setSync('saving');
    chain.current = chain.current.then(async () => {
      try {
        for (const d of items) await pushDossier(d, userId);
        setSync(pending.current.size ? 'saving' : 'saved');
      } catch (e) {
        console.error(e);
        for (const d of items) if (!pending.current.has(d.id)) pending.current.set(d.id, d);
        setSync('error');
      }
    });
  }, [userId]);

  const upsert = useCallback((d: Dossier) => {
    const stamped = { ...d, updatedAt: new Date().toISOString() };
    setDossiers((list) => {
      const l = list ?? [];
      return l.some((x) => x.id === d.id) ? l.map((x) => (x.id === d.id ? stamped : x)) : [stamped, ...l];
    });
    if (cloudEnabled) {
      pending.current.set(d.id, stamped);
      setSync('saving');
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 1200); // sauvegarde 1,2 s après la dernière frappe
    }
  }, [flush]);

  const remove = useCallback((id: string) => {
    setDossiers((l) => (l ?? []).filter((x) => x.id !== id));
    pending.current.delete(id);
    if (cloudEnabled && userId) deleteDossierCloud(id, userId).catch(() => setSync('error'));
  }, [userId]);

  /* Prévenir avant de fermer l'onglet si un envoi est en attente */
  useEffect(() => {
    if (!cloudEnabled) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current.size || sync === 'saving') { flush(); e.preventDefault(); }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [flush, sync]);

  return { dossiers, upsert, remove, sync, loadError, reload, retry: flush };
}
