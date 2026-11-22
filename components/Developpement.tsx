'use client';
import { useState } from 'react';
import { TYPE_EVENEMENT, type ActionDev, type TypeEvenement } from '@/lib/business';
import { fmtDate } from '@/lib/calc';
import { eur, today, totalLignes } from '@/lib/commercial';
import { TYPES_SAISIE } from '@/lib/agenda';
import { uid } from '@/lib/factory';
import type { Dossier } from '@/lib/types';
import { useLibrary } from './LibraryProvider';
import { Field, Input, TextArea } from './ui';

/** Développement de l'entreprise : objectifs, indicateurs, plan d'actions, idées. */
export default function Developpement({ dossiers }: { dossiers: Dossier[] }) {
  const { lib, setLib } = useLibrary();
  const dev = lib.developpement;
  const setDev = (p: Partial<typeof dev>) => setLib({ ...lib, developpement: { ...dev, ...p } });
  const year = String(new Date().getFullYear());
  const [nouvelle, setNouvelle] = useState<{ titre: string; categorie: TypeEvenement; echeance: string }>({ titre: '', categorie: 'developpement', echeance: '' });

  // Indicateurs de l'année
  const fact = dossiers.flatMap((d) => (d.commercial?.factures ?? []).filter((f) => f.statut !== 'brouillon' && f.date.startsWith(year)));
  const ca = fact.reduce((a, f) => a + totalLignes(f.lignes), 0);
  const missions = dossiers.filter((d) => !d.prospect && d.createdAt.startsWith(year)).length;
  const devis = dossiers.flatMap((d) => d.commercial?.devis ?? []).filter((x) => x.date.startsWith(year) && x.statut !== 'brouillon');
  const acceptes = devis.filter((x) => x.statut === 'accepte');
  const transfo = devis.length ? Math.round((acceptes.length / devis.length) * 100) : null;
  const panier = acceptes.length ? acceptes.reduce((a, x) => a + totalLignes(x.lignes), 0) / acceptes.length : null;
  const delais = dossiers.flatMap((d) => d.commercial?.factures ?? []).filter((f) => f.statut === 'payee' && f.datePaiement && f.date.startsWith(year)).map((f) => (new Date(f.datePaiement!).getTime() - new Date(f.date).getTime()) / 864e5);
  const delaiMoyen = delais.length ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length) : null;
  const moisEcoules = new Date().getMonth() + 1;
  const projection = Math.round((ca / moisEcoules) * 12);
  const pct = (v: number, obj: number) => (obj ? Math.min(100, Math.round((v / obj) * 100)) : 0);

  const actions = [...dev.actions].sort((a, b) => Number(a.fait) - Number(b.fait) || (a.echeance || '9').localeCompare(b.echeance || '9'));
  const setAction = (id: string, p: Partial<ActionDev>) => setDev({ actions: dev.actions.map((a) => (a.id === id ? { ...a, ...p } : a)) });

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-[32px] font-semibold text-foret">Développement de l’entreprise</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="mb-2 flex items-end justify-between gap-3">
            <p className="font-serif text-lg font-semibold text-foret">Chiffre d’affaires {year}</p>
            <label className="text-[12px] text-charbon/60">Objectif <input inputMode="numeric" value={dev.objectifCA || ''} onChange={(e) => setDev({ objectifCA: Number(e.target.value) || 0 })} className="field ml-1 inline-block w-28 py-1 text-right" /> €</label>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-pierre-50"><div className="h-full bg-sauge" style={{ width: `${pct(ca, dev.objectifCA)}%` }} /></div>
          <p className="mt-2 text-[14px]"><b className="tabular-nums">{eur(ca)}</b> facturés · {pct(ca, dev.objectifCA)} % de l’objectif</p>
          <p className="text-[12px] text-charbon/55">Au rythme actuel : environ {eur(projection)} sur l’année.</p>
        </div>
        <div className="card p-5">
          <div className="mb-2 flex items-end justify-between gap-3">
            <p className="font-serif text-lg font-semibold text-foret">Missions {year}</p>
            <label className="text-[12px] text-charbon/60">Objectif <input inputMode="numeric" value={dev.objectifMissions || ''} onChange={(e) => setDev({ objectifMissions: Number(e.target.value) || 0 })} className="field ml-1 inline-block w-20 py-1 text-right" /></label>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-pierre-50"><div className="h-full bg-terre" style={{ width: `${pct(missions, dev.objectifMissions)}%` }} /></div>
          <p className="mt-2 text-[14px]"><b>{missions}</b> mission{missions > 1 ? 's' : ''} · {pct(missions, dev.objectifMissions)} % de l’objectif</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-[12px] text-charbon/60">Devis acceptés</p><p className="font-serif text-[26px] font-semibold text-foret">{transfo != null ? `${transfo} %` : '—'}</p><p className="text-[12px] text-charbon/50">{acceptes.length} sur {devis.length} envoyés</p></div>
        <div className="card p-4"><p className="text-[12px] text-charbon/60">Montant moyen d’une mission</p><p className="font-serif text-[26px] font-semibold text-foret">{panier != null ? eur(panier) : '—'}</p></div>
        <div className="card p-4"><p className="text-[12px] text-charbon/60">Délai moyen de paiement</p><p className="font-serif text-[26px] font-semibold text-foret">{delaiMoyen != null ? `${delaiMoyen} jours` : '—'}</p></div>
      </div>

      <div className="card p-5">
        <p className="mb-3 font-serif text-xl font-semibold text-foret">Plan d’actions</p>
        <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (!nouvelle.titre.trim()) return; setDev({ actions: [...dev.actions, { id: uid(), titre: nouvelle.titre.trim(), categorie: nouvelle.categorie, echeance: nouvelle.echeance || undefined, fait: false }] }); setNouvelle({ ...nouvelle, titre: '', echeance: '' }); }}>
          <Field label="Action" className="min-w-[260px] flex-1"><Input value={nouvelle.titre} onChange={(e) => setNouvelle({ ...nouvelle, titre: e.target.value })} placeholder="Ex. Créer le site internet, rencontrer les notaires de Montauban…" /></Field>
          <Field label="Sujet"><select value={nouvelle.categorie} onChange={(e) => setNouvelle({ ...nouvelle, categorie: e.target.value as TypeEvenement })} className="field w-auto">{TYPES_SAISIE.map((t) => <option key={t} value={t}>{TYPE_EVENEMENT[t].label}</option>)}</select></Field>
          <Field label="Échéance"><Input type="date" value={nouvelle.echeance} onChange={(e) => setNouvelle({ ...nouvelle, echeance: e.target.value })} /></Field>
          <button type="submit" className="btn-primary">Ajouter</button>
        </form>
        <ul className="space-y-1">
          {actions.map((a) => (
            <li key={a.id} className={`flex flex-wrap items-center gap-3 rounded px-2 py-2 hover:bg-ivoire ${a.fait ? 'opacity-50' : ''}`}>
              <input type="checkbox" checked={a.fait} onChange={(e) => setAction(a.id, { fait: e.target.checked })} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_EVENEMENT[a.categorie].color }} title={TYPE_EVENEMENT[a.categorie].label} />
              <span className={`flex-1 text-[14px] ${a.fait ? 'line-through' : ''}`}>{a.titre}</span>
              <span className={`text-[12px] ${a.echeance && a.echeance < today() && !a.fait ? 'text-p1' : 'text-charbon/50'}`}>{a.echeance ? fmtDate(a.echeance) : ''}</span>
              <input type="date" value={a.echeance ?? ''} onChange={(e) => setAction(a.id, { echeance: e.target.value || undefined })} className="field w-auto py-1 text-[12px]" aria-label="Échéance" />
              <button type="button" className="text-charbon/40 hover:text-terre" onClick={() => setDev({ actions: dev.actions.filter((x) => x.id !== a.id) })} aria-label="Supprimer">×</button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] text-charbon/55">Les actions datées apparaissent dans l’agenda.</p>
      </div>

      <div className="card p-5">
        <Field label="Idées, pistes de développement, nouvelles prestations"><TextArea rows={6} value={dev.idees} onChange={(v) => setDev({ idees: v })} placeholder="Formations pour particuliers, partenariat avec une association du patrimoine, conférences…" /></Field>
      </div>
    </div>
  );
}
