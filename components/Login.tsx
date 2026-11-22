'use client';
import { useState } from 'react';
import { BRAND } from '@/lib/constants';
import { clearConfig, configFromEnv, supabase, supabaseConfig } from '@/lib/supabase';
import { ASSET_BASE } from './ReportPreview';

const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
  'Email not confirmed': 'Ce compte n’a pas encore été confirmé.',
  'Failed to fetch': 'Serveur injoignable : vérifiez la connexion internet, ou relancez le projet Supabase s’il est en pause.',
};

/** Écran de connexion (comptes créés depuis le tableau de bord Supabase). */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(MESSAGES[error.message] ?? error.message);
  }

  async function forgot() {
    if (!supabase || !email.trim()) { setError('Saisissez d’abord votre e-mail.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.href });
    if (error) setError(error.message); else setInfo('Un lien de réinitialisation vient d’être envoyé par e-mail.');
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ASSET_BASE}logo.png`} alt={BRAND.nom} className="mx-auto mb-8 w-64" />
        <form onSubmit={submit} className="card space-y-4 p-6">
          <p className="font-serif text-2xl font-semibold text-foret">Connexion au studio</p>
          <label className="block">
            <span className="label-caps mb-1.5 block">E-mail</span>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
          </label>
          <label className="block">
            <span className="label-caps mb-1.5 block">Mot de passe</span>
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
          </label>
          {error && <p className="text-[13px] text-p1">{error}</p>}
          {info && <p className="text-[13px] text-sauge">{info}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? 'Connexion…' : 'Se connecter'}</button>
          <button type="button" onClick={forgot} className="btn-quiet w-full text-[13px]">Mot de passe oublié</button>
        </form>
        {!configFromEnv && (
          <p className="mt-4 text-center text-[12px] text-charbon/50">
            Projet : {supabaseConfig?.url.replace('https://', '')} ·{' '}
            <button type="button" onClick={clearConfig} className="underline">changer / revenir au mode local</button>
          </p>
        )}
        <p className="mt-4 text-center text-[12px] text-charbon/45">{BRAND.baseline}</p>
      </div>
    </div>
  );
}
