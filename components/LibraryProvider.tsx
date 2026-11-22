'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { defaultLibrary, type Library, type PhraseKey } from '@/lib/library';
import { loadLibrary, saveLibrary } from '@/lib/libraryStore';
import type { DesordreTemplate } from '@/lib/templates';
import type { PreconisationType } from '@/lib/preconisations';

interface Ctx {
  lib: Library;
  setLib: (l: Library) => void;
  /** Liste triée : favoris d'abord, puis les plus utilisés, puis l'ordre de la liste. */
  phrases: (k: PhraseKey) => string[];
  addPhrase: (k: PhraseKey, text: string) => void;
  /** Ajoute un désordre type (rubrique « À catégoriser » par défaut) ; renvoie le modèle existant ou créé. */
  addDesordreType: (type: string, patch?: Partial<DesordreTemplate>) => DesordreTemplate;
  addPreconisation: (p: PreconisationType) => void;
  /** Enregistre (ou met à jour) des désordres types tirés de fiches relues */
  apprendre: (modeles: DesordreTemplate[]) => void;
  noteUse: (k: string, text: string) => void;
  toggleFavori: (k: string, text: string) => void;
  isFavori: (k: string, text: string) => boolean;
  usageOf: (k: string, text: string) => number;
}

const noop = () => {};
const LibraryContext = createContext<Ctx>({
  lib: defaultLibrary(), setLib: noop, phrases: (k) => defaultLibrary().phrases[k], addPhrase: noop,
  addDesordreType: (type) => nouveauType(type), addPreconisation: noop, apprendre: noop,
  noteUse: noop, toggleFavori: noop, isFavori: () => false, usageOf: () => 0,
});

export const useLibrary = () => useContext(LibraryContext);
export const nouveauType = (type: string, patch: Partial<DesordreTemplate> = {}): DesordreTemplate => ({
  type: type.trim(), famille: 'À catégoriser', element: 'Mur', priorite: 'P2', lot: '', unite: 'forfait', constat: '', analyse: '', investigations: '', preconisation: '', ...patch,
});
const keyOf = (k: string, t: string) => `${k}::${t}`;

export function LibraryProvider({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  const [lib, setLibState] = useState<Library>(defaultLibrary);
  const libRef = useRef(lib);
  const loaded = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    loadLibrary(userId).then((l) => { loaded.current = true; libRef.current = l; setLibState(l); });
  }, [userId]);

  const setLib = useCallback((l: Library) => {
    libRef.current = l;
    setLibState(l);
    if (!loaded.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveLibrary(libRef.current, userId).catch((e) => console.error(e)), 800);
  }, [userId]);

  // Enregistre immédiatement une modification en attente si le composant disparaît
  useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current); if (loaded.current) saveLibrary(libRef.current, userId).catch(() => {}); }
  }, [userId]);

  const isFavori = useCallback((k: string, t: string) => lib.favoris.includes(keyOf(k, t)), [lib]);
  const usageOf = useCallback((k: string, t: string) => lib.usage[keyOf(k, t)] ?? 0, [lib]);

  const phrases = useCallback((k: PhraseKey) => {
    const list = (lib.phrases[k] ?? []).filter((t) => t.trim());
    return list
      .map((t, i) => ({ t, i, f: lib.favoris.includes(keyOf(k, t)) ? 1 : 0, u: lib.usage[keyOf(k, t)] ?? 0 }))
      .sort((a, b) => b.f - a.f || b.u - a.u || a.i - b.i)
      .map((x) => x.t);
  }, [lib]);

  const addPhrase = useCallback((k: PhraseKey, text: string) => {
    const t = text.trim();
    const cur = libRef.current;
    if (!t || cur.phrases[k]?.includes(t)) return;
    setLib({ ...cur, phrases: { ...cur.phrases, [k]: [...(cur.phrases[k] ?? []), t] } });
  }, [setLib]);

  const addDesordreType = useCallback((type: string, patch?: Partial<DesordreTemplate>) => {
    const cur = libRef.current;
    const t = type.trim();
    const exist = cur.desordres.find((x) => x.type.toLowerCase() === t.toLowerCase());
    if (exist) return exist;
    const n = nouveauType(t, patch);
    setLib({ ...cur, desordres: [...cur.desordres, n] });
    return n;
  }, [setLib]);
  const addPreconisation = useCallback((p: PreconisationType) => {
    const cur = libRef.current;
    setLib({ ...cur, preconisations: [...cur.preconisations, p] });
  }, [setLib]);

  const apprendre = useCallback((modeles: DesordreTemplate[]) => {
    const cur = libRef.current;
    let desordres = cur.desordres;
    for (const m of modeles) {
      const k = m.type.toLowerCase();
      const i = desordres.findIndex((x) => x.type.toLowerCase() === k || (x.alias ?? []).some((a) => a.toLowerCase() === k));
      desordres = i < 0 ? [...desordres, m] : desordres.map((x, j) => (j === i ? { ...x, ...m, type: x.type, alias: x.alias, categorie: x.categorie, prixId: x.prixId ?? m.prixId } : x));
    }
    setLib({ ...cur, desordres });
  }, [setLib]);

  const noteUse = useCallback((k: string, t: string) => {
    const cur = libRef.current;
    const key = keyOf(k, t);
    setLib({ ...cur, usage: { ...cur.usage, [key]: (cur.usage[key] ?? 0) + 1 } });
  }, [setLib]);

  const toggleFavori = useCallback((k: string, t: string) => {
    const cur = libRef.current;
    const key = keyOf(k, t);
    setLib({ ...cur, favoris: cur.favoris.includes(key) ? cur.favoris.filter((x) => x !== key) : [...cur.favoris, key] });
  }, [setLib]);

  const value = useMemo(() => ({
    lib: { ...lib, desordres: lib.desordres.filter((t) => t.type.trim()) },
    setLib, phrases, addPhrase, addDesordreType, addPreconisation, apprendre, noteUse, toggleFavori, isFavori, usageOf,
  }), [lib, setLib, phrases, addPhrase, addDesordreType, addPreconisation, apprendre, noteUse, toggleFavori, isFavori, usageOf]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
