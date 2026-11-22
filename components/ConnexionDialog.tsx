'use client';
import { useState } from 'react';
import { clearConfig, cloudEnabled, configFromEnv, normalizeUrl, saveConfig, supabaseConfig, testConfig } from '@/lib/supabase';

/**
 * Réglage de la connexion Supabase depuis l'application :
 * aucun nouveau déploiement n'est nécessaire pour passer en ligne.
 */
export default function ConnexionDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(supabaseConfig?.url ?? '');
  const [key, setKey] = useState(supabaseConfig?.key ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'warn'; text: string } | null>(null);

  async function submit(e: React.FormEvent, force = false) {
    e.preventDefault();
    const cfg = { url: normalizeUrl(url), key: key.trim() };
    if (/^sb_secret_|service_role/.test(cfg.key)) {
      setMsg({ kind: 'error', text: 'C’est la clé SECRÈTE : ne la mettez jamais ici. Utilisez la clé « publishable » (sb_publishable_…).' });
      return;
    }
    setBusy(true); setMsg(null);
    const res = force ? null : await testConfig(cfg);
    setBusy(false);
    if (res === 'OK_SIGNUP_OPEN') {
      setMsg({ kind: 'warn', text: 'Connexion réussie, mais les inscriptions sont ouvertes : n’importe qui pourrait se créer un compte. Dans Supabase → Authentication → Sign In / Providers, désactivez « Allow new users to sign up ». Vous pouvez enregistrer quand même.' });
      return;
    }
    if (res) { setMsg({ kind: 'error', text: res }); return; }
    saveConfig(cfg);
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-charbon/30 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-lg space-y-4 p-6">
        <div>
          <p className="font-serif text-2xl font-semibold text-foret">Enregistrement en ligne</p>
          <p className="mt-1 text-[14px] text-charbon/65">
            {cloudEnabled
              ? 'Les dossiers sont enregistrés dans votre projet Supabase.'
              : 'Mode local : les dossiers restent dans ce navigateur. Branchez un projet Supabase pour les retrouver sur tous vos appareils.'}
          </p>
        </div>

        {configFromEnv ? (
          <p className="rounded-md bg-sauge-50 p-3 text-[13px]">Ce site a été configuré lors de sa mise en ligne ({supabaseConfig?.url}).</p>
        ) : (
          <>
            {!cloudEnabled && (
              <ol className="list-decimal space-y-1 rounded-md bg-ivoire p-3 pl-7 text-[13px] text-charbon/75">
                <li>Dans Supabase : <b>SQL Editor</b> → coller <code>supabase-init.sql</code> → <b>Run</b>.</li>
                <li><b>Authentication → Users → Add user</b> (cocher « Auto Confirm User »).</li>
                <li><b>Project Settings</b> : copier l’adresse du projet (Data API) et la clé <b>publishable</b> (API Keys).</li>
              </ol>
            )}
            <label className="block">
              <span className="label-caps mb-1.5 block">Adresse du projet</span>
              <input value={url} onChange={(e) => { setUrl(e.target.value); setMsg(null); }} placeholder="https://xxxx.supabase.co" required className="field" autoComplete="off" spellCheck={false} />
            </label>
            <label className="block">
              <span className="label-caps mb-1.5 block">Clé publique (publishable)</span>
              <input value={key} onChange={(e) => { setKey(e.target.value); setMsg(null); }} placeholder="sb_publishable_…" required className="field font-mono text-[13px]" autoComplete="off" spellCheck={false} />
            </label>
            {msg && <p className={`text-[13px] ${msg.kind === 'error' ? 'text-p1' : 'text-terre'}`}>{msg.text}</p>}
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {cloudEnabled && !configFromEnv
            ? <button type="button" className="btn-quiet text-[13px] text-terre" onClick={clearConfig}>Revenir au mode local</button>
            : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Fermer</button>
            {!configFromEnv && (
              msg?.kind === 'warn'
                ? <button type="button" className="btn-primary" onClick={(e) => submit(e as unknown as React.FormEvent, true)}>Enregistrer quand même</button>
                : <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Vérification…' : 'Tester et enregistrer'}</button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
