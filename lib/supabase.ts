'use client';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

/**
 * Client Supabase. La configuration (adresse du projet + clé PUBLIQUE) vient :
 *  1. des variables NEXT_PUBLIC_SUPABASE_* si le site a été compilé avec ;
 *  2. sinon des réglages saisis dans l'application (enregistrés dans ce navigateur).
 * Ainsi, un même site déployé une seule fois peut être branché sur Supabase
 * plus tard, sans nouvelle mise en ligne. Sans configuration : mode local.
 * La sécurité repose sur les règles RLS (supabase/migrations), pas sur la clé.
 */
const CFG_KEY = 'atelier-existant:supabase-config';

export interface SupabaseConfig { url: string; key: string }

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const configFromEnv = Boolean(envUrl && envKey);

function readConfig(): SupabaseConfig | null {
  if (envUrl && envKey) return { url: envUrl, key: envKey };
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CFG_KEY) : null;
    const cfg = raw ? (JSON.parse(raw) as SupabaseConfig) : null;
    return cfg?.url && cfg?.key ? cfg : null;
  } catch {
    return null;
  }
}

export const supabaseConfig = readConfig();

export const supabase: SupabaseClient | null = supabaseConfig
  ? createClient(supabaseConfig.url, supabaseConfig.key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const cloudEnabled = supabase !== null;

export function normalizeUrl(input: string): string {
  let u = input.trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//.test(u)) u = 'https://' + u;
  return u.replace(/\/(rest|auth)\/v1.*$/, '');
}

/**
 * Vérifie l'adresse, la clé et la présence de la table `dossiers`.
 * Renvoie null si tout va bien, sinon un message en français.
 */
export async function testConfig(cfg: SupabaseConfig): Promise<string | null> {
  const headers = { apikey: cfg.key };
  try {
    const auth = await fetch(`${cfg.url}/auth/v1/settings`, { headers });
    if (auth.status === 401 || auth.status === 403) return 'La clé est refusée : copiez la clé « publishable » (ou « anon public ») du projet.';
    if (!auth.ok) return `Le projet ne répond pas correctement (code ${auth.status}). Vérifiez l’adresse, ou relancez le projet s’il est en pause.`;
    const settings = await auth.json().catch(() => ({}));
    const table = await fetch(`${cfg.url}/rest/v1/dossiers?select=id&limit=1`, { headers });
    if (table.status === 404) return 'La base n’est pas encore créée : collez le script supabase-init.sql dans le SQL Editor de Supabase, puis « Run ».';
    if (settings && settings.disable_signup === false) return 'OK_SIGNUP_OPEN';
    return null;
  } catch {
    return 'Adresse injoignable. Elle doit ressembler à https://xxxx.supabase.co';
  }
}

export function saveConfig(cfg: SupabaseConfig) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  window.location.reload();
}

export function clearConfig() {
  try { supabase?.auth.signOut(); } catch { /* */ }
  localStorage.removeItem(CFG_KEY);
  window.location.reload();
}

/** Session courante : undefined = en cours de vérification, null = déconnecté. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(cloudEnabled ? undefined : null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}
