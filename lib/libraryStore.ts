'use client';
import { idbGet, idbSet } from './idb';
import { normalizeLibrary, type Library } from './library';
import { supabase } from './supabase';

const KEY = 'atelier-existant:bibliotheque:v1';

/** Charge la bibliothèque : Supabase si connecté, sinon navigateur. */
export async function loadLibrary(userId: string | null): Promise<Library> {
  if (supabase && userId) {
    const { data, error } = await supabase.from('bibliotheques').select('data').eq('owner', userId).maybeSingle();
    // Premier passage en ligne : pas encore de bibliothèque sur le compte → on reprend celle de ce navigateur
    // (elle sera enregistrée en ligne à la prochaine modification)
    if (!error && data?.data) return normalizeLibrary(data.data as Library);
    if (!error) { try { return normalizeLibrary(await idbGet<Library>(KEY)); } catch { return normalizeLibrary(null); } }
    console.warn('Bibliothèque en ligne indisponible, repli local', error);
  }
  try { return normalizeLibrary(await idbGet<Library>(KEY)); } catch { return normalizeLibrary(null); }
}

export async function saveLibrary(lib: Library, userId: string | null): Promise<void> {
  try { await idbSet(KEY, lib); } catch { /* */ }
  if (supabase && userId) {
    const { error } = await supabase.from('bibliotheques').upsert({ owner: userId, data: lib, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
}
