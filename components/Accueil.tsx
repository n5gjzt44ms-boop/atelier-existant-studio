'use client';
import { useMemo, useState } from 'react';
import { fmtDate } from '@/lib/calc';
import { DELIVERABLES } from '@/lib/constants';
import { dateRenduOf, enRetard, estRappel, eur, today, totalLignes, type AgendaItem } from '@/lib/commercial';
import { TYPE_EVENEMENT, type TypeEvenement } from '@/lib/business';
import { uid } from '@/lib/factory';
import type { Dossier } from '@/lib/types';
import type { Vue } from './AppNav';
import { useLibrary } from './LibraryProvider';
import { agendaComplet, TYPES_SAISIE } from '@/lib/agenda';

const addDays = (iso: string, n: number) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const nom = (d: Dossier) => d.meta.client.nom || d.meta.bien.commune || d.numero;

/** Page d'accueil : l'agenda du jour, la semaine, les choses à faire et les alertes. */
export default function Accueil({ dossiers, go, onOpen, onNewDossier }: { dossiers: Dossier[]; go: (v: Vue) => void; onOpen: (id: string) => void; onNewDossier: () => void }) {
  const { lib, setLib } = useLibrary();
  const t = today();
  const items = useMemo(() => agendaComplet(lib, dossiers), [lib, dossiers]);
  const rappels = items.filter((e) => estRappel(e) && e.date <= addDays(t, 3));
  const auj = items.filter((e) => e.date === t && !estRappel(e));
  const semaine = items.filter((e) => e.date > t && e.date <= addDays(t, 7) && !estRappel(e));
  const [categorie, setCategorie] = useState<TypeEvenement>('autre');
  const [filtre, setFiltre] = useState<TypeEvenement | 'toutes'>('toutes');
  const faitRappel = (id: string) => setLib({ ...lib, rappelsFaits: [...lib.rappelsFaits, id] });
  const [texte, setTexte] = useState('');
  const [date, setDate] = useState('');
  const [dossierId, setDossierId] = useState('');
  const [voirFaites, setVoirFaites] = useState(false);
  const taches = lib.taches;
  const ouvertes = taches.filter((x) => !x.fait && (filtre === 'toutes' || (x.categorie ?? 'autre') === filtre)).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const faites = taches.filter((x) => x.fait);
  const setTaches = (l: typeof taches) => setLib({ ...lib, taches: l });

  const alertes: { texte: string; action: () => void; grave?: boolean }[] = [];
  for (const d of dossiers.filter((x) => !x.archive)) {
    for (const f of d.commercial?.factures ?? []) if (enRetard(f)) alertes.push({ grave: true, texte: `Facture ${f.numero} en retard (${eur(totalLignes(f.lignes))}, échue le ${fmtDate(f.echeance)}) — ${nom(d)}`, action: () => onOpen(d.id) });
    const rendu = dateRenduOf(d);
    if (!d.prospect && (d.status === 'brouillon' || d.status === 'revision') && rendu <= addDays(t, 7)) alertes.push({ grave: rendu < t, texte: `Rendu du rapport ${rendu < t ? 'dépassé' : 'prévu'} le ${fmtDate(rendu)} — ${DELIVERABLES[d.type].titre}, ${nom(d)}`, action: () => onOpen(d.id) });
  }
  const prospects = dossiers.filter((d) => d.prospect && !d.archive);

  const Event = ({ e }: { e: AgendaItem }) => (
    <button type="button" onClick={() => (e.dossierId ? onOpen(e.dossierId) : go({ k: 'organisation', tab: 'agenda' }))} className="flex w-full items-start gap-3 rounded-md border-l-4 bg-white px-3 py-2 text-left shadow-sm hover:bg-ivoire" style={{ borderColor: e.color }}>
      <span className="w-14 shrink-0 text-[13px] font-semibold text-foret">{e.heure ?? 'journée'}</span>
      <span className="flex-1 text-[14px]">{e.titre}<span className="block text-[11px] text-charbon/55">{e.libelleType}{e.lieu ? ` · ${e.lieu}` : ''}</span></span>
    </button>
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-caps">Aujourd’hui</p>
            <h1 className="font-serif text-[36px] font-semibold capitalize leading-tight text-foret">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => go({ k: 'devis' })}>Nouveau devis client</button>
            <button type="button" className="btn-ghost" onClick={onNewDossier}>Nouveau dossier</button>
            <button type="button" className="btn-ghost" onClick={() => go({ k: 'organisation', tab: 'agenda' })}>Agenda complet</button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {rappels.length > 0 && (
              <section>
                <p className="mb-2 font-serif text-xl font-semibold text-foret">Rappels</p>
                <ul className="space-y-1.5">
                  {rappels.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-md border-l-4 bg-white px-3 py-2 shadow-sm" style={{ borderColor: e.color }}>
                      <span className="flex-1 text-[14px]">{e.titre}<span className={`block text-[11px] ${e.date < t ? 'text-p1' : 'text-charbon/55'}`}>{e.libelleType} · {e.date < t ? `depuis le ${fmtDate(e.date)}` : e.date === t ? 'aujourd’hui' : fmtDate(e.date)}</span></span>
                      {e.mail && <button type="button" className="btn-ghost min-h-[34px] text-[12px]" onClick={() => go({ k: 'relation', tab: 'mails', mail: { modele: e.mail, dossierId: e.dossierId } })}>Préparer le mail</button>}
                      {e.dossierId && <button type="button" className="btn-quiet text-[12px]" onClick={() => onOpen(e.dossierId!)}>Dossier</button>}
                      <button type="button" className="btn-quiet text-[12px] text-sauge" onClick={() => faitRappel(e.id)}>Fait ✓</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <p className="mb-2 font-serif text-xl font-semibold text-foret">Au programme aujourd’hui</p>
              {auj.length ? <div className="space-y-2">{auj.map((e) => <Event key={e.id} e={e} />)}</div> : <p className="card p-4 text-[14px] text-charbon/60">Rien de prévu aujourd’hui.</p>}
            </section>
            <section>
              <p className="mb-2 font-serif text-xl font-semibold text-foret">Dans les sept prochains jours</p>
              {semaine.length ? (
                <div className="space-y-2">
                  {semaine.map((e) => (
                    <div key={e.id}>
                      <p className="mb-0.5 text-[11px] uppercase tracking-wider text-charbon/50">{new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      <Event e={e} />
                    </div>
                  ))}
                </div>
              ) : <p className="card p-4 text-[14px] text-charbon/60">Semaine libre pour l’instant.</p>}
            </section>
            {alertes.length > 0 && (
              <section>
                <p className="mb-2 font-serif text-xl font-semibold text-foret">À surveiller</p>
                <ul className="space-y-1.5">
                  {alertes.map((a, i) => (
                    <li key={i}><button type="button" onClick={a.action} className={`w-full rounded-md border px-3 py-2 text-left text-[14px] ${a.grave ? 'border-p1/50 bg-[#FBF1EE] text-p1' : 'border-pierre-100 bg-white'}`}>{a.texte} →</button></li>
                  ))}
                </ul>
              </section>
            )}
            {prospects.length > 0 && (
              <section>
                <p className="mb-2 font-serif text-xl font-semibold text-foret">Devis en préparation</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {prospects.map((d) => (
                    <button key={d.id} type="button" onClick={() => go({ k: 'devis', id: d.id })} className="card p-3 text-left hover:border-sauge">
                      <p className="font-medium">{nom(d)}</p>
                      <p className="text-[12px] text-charbon/55">{[d.meta.bien.adresse, d.meta.bien.commune].filter(Boolean).join(', ') || 'Adresse à préciser'} · {d.commercial?.devis[0] ? `${d.commercial.devis[0].numero}, ${eur(totalLignes(d.commercial.devis[0].lignes))}` : 'devis à établir'}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="card h-fit p-4">
            <p className="mb-3 font-serif text-xl font-semibold text-foret">À faire</p>
            <form className="mb-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (!texte.trim()) return; setTaches([...taches, { id: uid(), texte: texte.trim(), fait: false, date: date || undefined, dossierId: dossierId || undefined, categorie }]); setTexte(''); setDate(''); setDossierId(''); }}>
              <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Nouvelle tâche…" className="field py-2" />
              <select value={categorie} onChange={(e) => setCategorie(e.target.value as TypeEvenement)} className="field py-1.5 text-[13px]" aria-label="Sujet">
                {TYPES_SAISIE.filter((x) => x !== 'visite' && x !== 'rdv').map((x) => <option key={x} value={x}>{TYPE_EVENEMENT[x].label}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field w-auto py-1.5 text-[13px]" aria-label="Échéance" />
                <select value={dossierId} onChange={(e) => setDossierId(e.target.value)} className="field min-w-0 flex-1 py-1.5 text-[13px]" aria-label="Dossier lié">
                  <option value="">Sans dossier</option>
                  {dossiers.filter((d) => !d.archive).map((d) => <option key={d.id} value={d.id}>{nom(d)}</option>)}
                </select>
                <button type="submit" className="btn-primary min-h-[36px] px-3">+</button>
              </div>
            </form>
            <div className="mb-2 flex flex-wrap gap-1">
              {(['toutes', ...Array.from(new Set(taches.filter((x) => !x.fait).map((x) => x.categorie ?? 'autre')))] as (TypeEvenement | 'toutes')[]).map((c) => (
                <button key={c} type="button" onClick={() => setFiltre(c)} className={`rounded-full border px-2 py-0.5 text-[11px] ${filtre === c ? 'border-foret bg-foret text-white' : 'border-pierre'}`}>{c === 'toutes' ? 'Tout' : TYPE_EVENEMENT[c].label}</button>
              ))}
            </div>
            {ouvertes.length === 0 && <p className="text-[13px] text-charbon/55">Tout est fait.</p>}
            <ul className="space-y-1">
              {ouvertes.map((x) => {
                const d = dossiers.find((y) => y.id === x.dossierId);
                const late = x.date && x.date < t;
                const now = x.date === t;
                return (
                  <li key={x.id} className="flex items-start gap-2 rounded px-1 py-1.5 hover:bg-ivoire">
                    <input type="checkbox" checked={false} onChange={() => setTaches(taches.map((y) => (y.id === x.id ? { ...y, fait: true } : y)))} className="mt-1" aria-label="Fait" />
                    <span className="flex-1 text-[14px]">{x.texte}
                      <span className={`block text-[11px] ${late ? 'text-p1' : now ? 'text-terre' : 'text-charbon/50'}`}>
                        <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: TYPE_EVENEMENT[x.categorie ?? 'autre'].color }} />{TYPE_EVENEMENT[x.categorie ?? 'autre'].label}{x.date ? ' · ' : ''}
                        {x.date ? (late ? `en retard (${fmtDate(x.date)})` : now ? 'aujourd’hui' : fmtDate(x.date)) : ''}
                        {d ? <> · <button type="button" className="underline" onClick={() => onOpen(d.id)}>{nom(d)}</button></> : null}
                      </span>
                    </span>
                    <button type="button" className="text-charbon/40 hover:text-terre" onClick={() => setTaches(taches.filter((y) => y.id !== x.id))} aria-label="Supprimer">×</button>
                  </li>
                );
              })}
            </ul>
            {faites.length > 0 && (
              <div className="mt-3 border-t border-pierre-100 pt-2">
                <button type="button" className="text-[12px] text-charbon/55" onClick={() => setVoirFaites(!voirFaites)}>{voirFaites ? '▾' : '▸'} {faites.length} tâche{faites.length > 1 ? 's' : ''} faite{faites.length > 1 ? 's' : ''}</button>
                {voirFaites && (
                  <ul className="mt-1 space-y-1">
                    {faites.map((x) => (
                      <li key={x.id} className="flex items-center gap-2 text-[13px] text-charbon/50 line-through">
                        <input type="checkbox" checked onChange={() => setTaches(taches.map((y) => (y.id === x.id ? { ...y, fait: false } : y)))} />
                        <span className="flex-1">{x.texte}</span>
                      </li>
                    ))}
                    <li><button type="button" className="text-[12px] text-terre" onClick={() => setTaches(taches.filter((y) => !y.fait))}>Effacer les tâches faites</button></li>
                  </ul>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
