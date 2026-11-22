'use client';
import { useMemo, useState } from 'react';
import { TYPE_EVENEMENT, type Evenement, type TypeEvenement } from '@/lib/business';
import { fmtDate } from '@/lib/calc';
import { DELIVERABLES } from '@/lib/constants';
import { downloadText, enRetard, ETAPES, etapeOf, eur, toIcs, today, totalLignes, type AgendaItem } from '@/lib/commercial';
import { uid } from '@/lib/factory';
import type { Dossier } from '@/lib/types';
import { useLibrary } from './LibraryProvider';
import { agendaComplet, TYPES_SAISIE } from '@/lib/agenda';
import Developpement from './Developpement';
import { Field, Input, TextArea } from './ui';

export type GestionTab = 'pilotage' | 'devis' | 'factures' | 'agenda' | 'developpement' | 'entreprise';
const TABS: Record<GestionTab, string> = { pilotage: 'Résumé de l’activité', agenda: 'Agenda', devis: 'Devis', factures: 'Factures', developpement: 'Développement', entreprise: 'Mon entreprise' };

/** Organisation de l'entreprise : pilotage, agenda, devis, factures, réglages (page, sous la barre du haut). */
export default function Gestion({ dossiers, onOpen, tab, setTab }: { dossiers: Dossier[]; onOpen: (id: string) => void; tab: GestionTab; setTab: (t: GestionTab) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="border-b border-pierre-100 bg-white">
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-1 px-5 py-2">
          {(['pilotage', 'agenda', 'devis', 'factures', 'developpement', 'entreprise'] as GestionTab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`min-h-[36px] rounded-full px-4 text-[13px] ${tab === t ? 'bg-sauge text-white' : 'text-charbon/70 hover:bg-pierre-50'}`}>{TABS[t]}</button>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-7">
        {tab === 'pilotage' && <Pilotage dossiers={dossiers} onOpen={onOpen} />}
        {tab === 'devis' && <ListeDevis dossiers={dossiers} onOpen={onOpen} />}
        {tab === 'factures' && <ListeFactures dossiers={dossiers} onOpen={onOpen} />}
        {tab === 'agenda' && <Agenda dossiers={dossiers} onOpen={onOpen} />}
        {tab === 'developpement' && <Developpement dossiers={dossiers} />}
        {tab === 'entreprise' && <Entreprise />}
      </div>
    </div>
  );
}

const nomDossier = (d: Dossier) => d.meta.client.nom || d.meta.bien.commune || d.numero;

/* ───────── Pilotage ───────── */
function Pilotage({ dossiers, onOpen }: { dossiers: Dossier[]; onOpen: (id: string) => void }) {
  const year = String(new Date().getFullYear());
  const [annee, setAnnee] = useState(year);
  const actifs = dossiers.filter((d) => !d.archive);
  const factures = dossiers.flatMap((d) => (d.commercial?.factures ?? []).filter((f) => f.statut !== 'brouillon').map((f) => ({ f, d })));
  const annees = Array.from(new Set([year, ...factures.map((x) => x.f.date.slice(0, 4))])).sort().reverse();
  const fy = factures.filter((x) => x.f.date.startsWith(annee));
  const facture = fy.reduce((a, x) => a + totalLignes(x.f.lignes), 0);
  const encaisse = fy.filter((x) => x.f.statut === 'payee').reduce((a, x) => a + totalLignes(x.f.lignes), 0);
  const aEncaisser = factures.filter((x) => x.f.statut === 'emise').reduce((a, x) => a + totalLignes(x.f.lignes), 0);
  const retard = factures.filter((x) => enRetard(x.f));
  const devisAttente = dossiers.flatMap((d) => (d.commercial?.devis ?? []).filter((x) => x.statut === 'envoye').map((x) => ({ x, d })));
  const montantAttente = devisAttente.reduce((a, v) => a + totalLignes(v.x.lignes), 0);
  const parMois = Array.from({ length: 12 }, (_, m) => fy.filter((x) => Number(x.f.date.slice(5, 7)) === m + 1).reduce((a, x) => a + totalLignes(x.f.lignes), 0));
  const max = Math.max(1, ...parMois);
  const mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-[32px] font-semibold text-foret">Résumé de l’activité</h1>
        <select value={annee} onChange={(e) => setAnnee(e.target.value)} className="field w-auto py-1.5">{annees.map((a) => <option key={a}>{a}</option>)}</select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={`Chiffre d’affaires facturé ${annee}`} value={eur(facture)} />
        <Kpi label={`Encaissé ${annee}`} value={eur(encaisse)} />
        <Kpi label="Reste à encaisser" value={eur(aEncaisser)} sub={retard.length ? `${retard.length} facture(s) en retard` : 'aucun retard'} alert={retard.length > 0} />
        <Kpi label="Devis en attente de réponse" value={eur(montantAttente)} sub={`${devisAttente.length} devis`} />
      </div>

      <div className="card p-5">
        <p className="label-caps mb-4">Facturé par mois — {annee}</p>
        <div className="flex h-40 items-end gap-2">
          {parMois.map((v, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div className="w-full rounded-t bg-sauge" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 3 : 0 }} title={eur(v)} />
              </div>
              <span className="text-[10px] text-charbon/55">{mois[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 font-serif text-xl font-semibold text-foret">Avancement des projets</p>
        <div className="grid gap-3 lg:grid-cols-7">
          {ETAPES.map((e) => {
            const list = actifs.filter((d) => etapeOf(d) === e);
            return (
              <div key={e} className="rounded-lg bg-white p-3 shadow-sm">
                <p className="mb-2 text-[12px] font-semibold text-foret">{e} <span className="text-charbon/45">{list.length}</span></p>
                <ul className="space-y-1.5">
                  {list.map((d) => (
                    <li key={d.id}><button type="button" onClick={() => onOpen(d.id)} className="w-full rounded border border-pierre-100 px-2 py-1.5 text-left text-[12px] hover:border-sauge">
                      <span className="block font-medium">{nomDossier(d)}</span><span className="text-charbon/55">{DELIVERABLES[d.type].titre}</span>
                    </button></li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {retard.length > 0 && (
        <div className="card border-p1 p-5">
          <p className="mb-2 font-semibold text-p1">Factures en retard de paiement</p>
          <ul className="space-y-1 text-[14px]">{retard.map(({ f, d }) => <li key={f.id}><button type="button" className="underline" onClick={() => onOpen(d.id)}>{f.numero}</button> — {nomDossier(d)} — {eur(totalLignes(f.lignes))}, échue le {fmtDate(f.echeance)}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-[12px] text-charbon/60">{label}</p>
      <p className="mt-1 font-serif text-[26px] font-semibold tabular-nums text-foret">{value}</p>
      {sub && <p className={`text-[12px] ${alert ? 'text-p1' : 'text-charbon/50'}`}>{sub}</p>}
    </div>
  );
}

/* ───────── Listes ───────── */
const STATUT_D: Record<string, string> = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé' };
function ListeDevis({ dossiers, onOpen }: { dossiers: Dossier[]; onOpen: (id: string) => void }) {
  const rows = dossiers.flatMap((d) => (d.commercial?.devis ?? []).map((x) => ({ x, d }))).sort((a, b) => b.x.numero.localeCompare(a.x.numero));
  return (
    <Table title="Devis" empty="Les devis se créent dans chaque dossier, étape « Devis et factures »."
      head={['Numéro', 'Date', 'Client', 'Mission', 'Montant hors taxes', 'Statut']}
      rows={rows.map(({ x, d }) => ({ key: x.id, onClick: () => onOpen(d.id), cells: [x.numero, fmtDate(x.date), nomDossier(d), DELIVERABLES[d.type].titre, eur(totalLignes(x.lignes)), STATUT_D[x.statut]] }))} />
  );
}
function ListeFactures({ dossiers, onOpen }: { dossiers: Dossier[]; onOpen: (id: string) => void }) {
  const rows = dossiers.flatMap((d) => (d.commercial?.factures ?? []).map((f) => ({ f, d }))).sort((a, b) => (b.f.numero || 'z').localeCompare(a.f.numero || 'z'));
  return (
    <div className="space-y-8">
    <Table title="Factures" empty="Les factures se créent depuis un devis accepté, dans chaque dossier."
      head={['Numéro', 'Date', 'Client', 'Nature', 'Montant hors taxes', 'Échéance', 'État']}
      rows={rows.map(({ f, d }) => ({ key: f.id, onClick: () => onOpen(d.id), alert: enRetard(f), cells: [f.numero || 'Brouillon', fmtDate(f.date), nomDossier(d), f.nature === 'acompte' ? 'Acompte' : f.nature === 'solde' ? 'Solde' : 'Totalité', eur(totalLignes(f.lignes)), fmtDate(f.echeance), f.statut === 'payee' ? `Payée le ${fmtDate(f.datePaiement ?? '')}` : f.statut === 'emise' ? (enRetard(f) ? 'En retard' : 'En attente') : 'Brouillon'] }))} />
    <LivreRecettes dossiers={dossiers} />
    </div>
  );
}

/** Livre des recettes (obligatoire en micro-entreprise) et chiffre d'affaires encaissé à déclarer. */
function LivreRecettes({ dossiers }: { dossiers: Dossier[] }) {
  const year = String(new Date().getFullYear());
  const [annee, setAnnee] = useState(year);
  const payees = dossiers.flatMap((d) => (d.commercial?.factures ?? []).filter((f) => f.statut === 'payee' && f.datePaiement).map((f) => ({ f, d })))
    .sort((a, b) => a.f.datePaiement!.localeCompare(b.f.datePaiement!));
  const annees = Array.from(new Set([year, ...payees.map((x) => x.f.datePaiement!.slice(0, 4))])).sort().reverse();
  const l = payees.filter((x) => x.f.datePaiement!.startsWith(annee));
  const parMois = Array.from({ length: 12 }, (_, m) => l.filter((x) => Number(x.f.datePaiement!.slice(5, 7)) === m + 1).reduce((a, x) => a + totalLignes(x.f.lignes), 0));
  const trim = [0, 1, 2, 3].map((t) => parMois.slice(t * 3, t * 3 + 3).reduce((a, b) => a + b, 0));
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const csv = () => {
    const lignes = [['Date d’encaissement', 'Numéro de facture', 'Client', 'Nature de la prestation', 'Montant', 'Mode de règlement'],
      ...l.map(({ f, d }) => [f.datePaiement!, f.numero, nomDossier(d), `${DELIVERABLES[d.type].titre} (${f.nature})`, totalLignes(f.lignes).toFixed(2).replace('.', ','), f.modePaiement ?? ''])];
    downloadText(`livre-des-recettes-${annee}.csv`, '\ufeff' + lignes.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n'));
  };
  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="flex-1 font-serif text-xl font-semibold text-foret">Livre des recettes et chiffre d’affaires encaissé</p>
        <select value={annee} onChange={(e) => setAnnee(e.target.value)} className="field w-auto py-1.5">{annees.map((a) => <option key={a}>{a}</option>)}</select>
        <button type="button" className="btn-ghost" disabled={!l.length} onClick={csv}>Exporter pour le tableur (.csv)</button>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        {trim.map((v, i) => <div key={i} className="rounded-md bg-ivoire p-3"><p className="text-[12px] text-charbon/60">{i + 1}{i ? 'e' : 'er'} trimestre</p><p className="font-serif text-xl font-semibold tabular-nums text-foret">{eur(v)}</p></div>)}
      </div>
      <details className="text-[13px]">
        <summary className="cursor-pointer text-charbon/70">Détail par mois (déclaration mensuelle)</summary>
        <div className="mt-2 grid gap-1 sm:grid-cols-3">{parMois.map((v, i) => <p key={i} className="flex justify-between border-b border-pierre-50 py-1"><span className="capitalize">{mois[i]}</span><span className="tabular-nums">{eur(v)}</span></p>)}</div>
      </details>
      <p className="mt-3 text-[12px] text-charbon/55">En micro-entreprise, le chiffre d’affaires à déclarer est celui encaissé sur la période. Le livre des recettes (date, client, nature, montant, mode de règlement) doit être tenu au fil de l’eau : marquez chaque facture « payée » avec sa date pour qu’il se remplisse.</p>
    </div>
  );
}
function Table({ title, head, rows, empty }: { title: string; head: string[]; empty: string; rows: { key: string; cells: string[]; onClick: () => void; alert?: boolean }[] }) {
  return (
    <div>
      <h1 className="mb-4 font-serif text-[32px] font-semibold text-foret">{title}</h1>
      {rows.length === 0 ? <p className="card p-6 text-[14px] text-charbon/60">{empty}</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead><tr className="border-b border-pierre-100 text-left text-[12px] text-charbon/55">{head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.key} onClick={r.onClick} className={`cursor-pointer border-b border-pierre-50 hover:bg-ivoire ${r.alert ? 'text-p1' : ''}`}>{r.cells.map((c, i) => <td key={i} className={`px-3 py-2 ${i === 4 ? 'tabular-nums' : ''}`}>{c}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ───────── Agenda ───────── */
const JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function Agenda({ dossiers, onOpen }: { dossiers: Dossier[]; onOpen: (id: string) => void }) {
  const { lib, setLib } = useLibrary();
  const items = useMemo(() => agendaComplet(lib, dossiers), [lib, dossiers]);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [edit, setEdit] = useState<Evenement | null>(null);
  const start = new Date(month); start.setDate(1 - ((month.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const t = today();
  const avenir = items.filter((e) => e.date >= t).slice(0, 12);

  const save = (e: Evenement) => { setLib({ ...lib, agenda: lib.agenda.some((x) => x.id === e.id) ? lib.agenda.map((x) => (x.id === e.id ? e : x)) : [...lib.agenda, e] }); setEdit(null); };
  const click = (e: AgendaItem) => { if (e.auto) { if (e.dossierId) onOpen(e.dossierId); } else setEdit(lib.agenda.find((x) => x.id === e.id) ?? null); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-serif text-[32px] font-semibold text-foret">Agenda</h1>
        <button type="button" className="btn-ghost" onClick={() => downloadText('agenda-atelier-existant.ics', toIcs(items.filter((e) => e.date >= iso(new Date(Date.now() - 30 * 864e5)))))}>Exporter vers mon calendrier (.ics)</button>
        <button type="button" className="btn-primary" onClick={() => setEdit({ id: uid(), date: t, heure: '09:00', titre: '', type: 'rdv' })}>Nouveau rendez-vous</button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="btn-quiet" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button>
            <p className="font-serif text-lg font-semibold capitalize text-foret">{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
            <button type="button" className="btn-quiet" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button>
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded bg-pierre-100 text-[12px]">
            {JOURS.map((j) => <div key={j} className="bg-ivoire px-1.5 py-1 text-center text-charbon/55">{j}</div>)}
            {days.map((d) => {
              const k = iso(d);
              const ev = items.filter((e) => e.date === k);
              const out = d.getMonth() !== month.getMonth();
              return (
                <div key={k} className={`min-h-[86px] bg-white p-1 ${out ? 'opacity-45' : ''}`} onDoubleClick={() => setEdit({ id: uid(), date: k, heure: '09:00', titre: '', type: 'rdv' })}>
                  <p className={`mb-0.5 text-right text-[11px] ${k === t ? 'font-bold text-terre' : 'text-charbon/55'}`}>{d.getDate()}</p>
                  {ev.slice(0, 3).map((e) => (
                    <button key={e.id} type="button" onClick={() => click(e)} title={`${e.libelleType} — ${e.titre}`} className="mb-0.5 block w-full truncate rounded px-1 py-0.5 text-left text-[11px] text-white" style={{ background: e.color }}>
                      {e.heure ? `${e.heure} ` : ''}{e.titre}
                    </button>
                  ))}
                  {ev.length > 3 && <p className="text-[10px] text-charbon/55">+ {ev.length - 3}</p>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-charbon/60">
            {Object.values(TYPE_EVENEMENT).map((x) => <span key={x.label} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: x.color }} />{x.label}</span>)}
          </div>
          <p className="mt-2 text-[11px] text-charbon/45">Les visites, dates de rendu, validités de devis et échéances de factures sont ajoutées automatiquement depuis les dossiers. Double-cliquez sur un jour pour y ajouter un rendez-vous.</p>
        </div>
        <div className="card p-4">
          <p className="label-caps mb-3">À venir</p>
          {avenir.length === 0 && <p className="text-[13px] text-charbon/55">Rien de prévu.</p>}
          <ul className="space-y-2">
            {avenir.map((e) => (
              <li key={e.id}><button type="button" onClick={() => click(e)} className="w-full border-l-4 pl-2 text-left text-[13px]" style={{ borderColor: e.color }}>
                <span className="block text-[11px] text-charbon/55">{fmtDate(e.date)}{e.heure ? ` à ${e.heure}` : ''} · {e.libelleType}</span>{e.titre}
              </button></li>
            ))}
          </ul>
        </div>
      </div>

      {edit && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-charbon/30 p-4" onClick={() => setEdit(null)}>
          <div className="card w-full max-w-md space-y-3 p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-xl font-semibold text-foret">Rendez-vous</p>
            <Field label="Titre"><Input value={edit.titre} onChange={(e) => setEdit({ ...edit, titre: e.target.value })} autoFocus /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><Input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field>
              <Field label="Heure"><Input type="time" value={edit.heure ?? ''} onChange={(e) => setEdit({ ...edit, heure: e.target.value || undefined })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as TypeEvenement })} className="field">
                  {TYPES_SAISIE.map((x) => <option key={x} value={x}>{TYPE_EVENEMENT[x].label}</option>)}
                </select>
              </Field>
              <Field label="Durée (minutes)"><Input type="number" value={edit.dureeMin ?? 60} onChange={(e) => setEdit({ ...edit, dureeMin: Number(e.target.value) || 60 })} /></Field>
            </div>
            <Field label="Dossier">
              <select value={edit.dossierId ?? ''} onChange={(e) => setEdit({ ...edit, dossierId: e.target.value || undefined })} className="field">
                <option value="">Aucun</option>
                {dossiers.filter((d) => !d.archive).map((d) => <option key={d.id} value={d.id}>{d.numero} — {nomDossier(d)}</option>)}
              </select>
            </Field>
            <Field label="Lieu"><Input value={edit.lieu ?? ''} onChange={(e) => setEdit({ ...edit, lieu: e.target.value })} /></Field>
            <Field label="Notes"><Input value={edit.notes ?? ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" className="btn-primary" disabled={!edit.titre.trim() || !edit.date} onClick={() => save(edit)}>Enregistrer</button>
              {lib.agenda.some((x) => x.id === edit.id) && <button type="button" className="btn-ghost text-terre" onClick={() => { setLib({ ...lib, agenda: lib.agenda.filter((x) => x.id !== edit.id) }); setEdit(null); }}>Supprimer</button>}
              <button type="button" className="btn-quiet ml-auto" onClick={() => setEdit(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Mon entreprise ───────── */
function Entreprise() {
  const { lib, setLib } = useLibrary();
  const e = lib.entreprise;
  const setE = (p: Partial<typeof e>) => setLib({ ...lib, entreprise: { ...e, ...p } });
  const txt = (k: keyof typeof e, label: string, ph = '') => (
    <Field label={label}><Input value={String(e[k] ?? '')} onChange={(ev) => setE({ [k]: ev.target.value } as Partial<typeof e>)} placeholder={ph} /></Field>
  );
  return (
    <div className="space-y-8">
      <h1 className="font-serif text-[32px] font-semibold text-foret">Mon entreprise</h1>
      <div className="card space-y-4 p-5">
        <p className="font-serif text-lg font-semibold text-foret">Identité (en-tête des devis et factures)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {txt('nom', 'Nom commercial')}{txt('forme', 'Forme juridique', 'Entreprise individuelle, micro-entreprise…')}
          {txt('siret', 'Numéro SIRET', '14 chiffres')}{txt('email', 'E-mail')}
          {txt('telephone', 'Téléphone')}{txt('adresse', 'Adresse')}
          {txt('codePostal', 'Code postal')}{txt('ville', 'Ville')}
        </div>
      </div>
      <div className="card space-y-4 p-5">
        <p className="font-serif text-lg font-semibold text-foret">Taxe sur la valeur ajoutée et paiement</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Régime">
            <select value={e.regimeTva} onChange={(ev) => setE({ regimeTva: ev.target.value as 'franchise' | 'assujetti' })} className="field">
              <option value="franchise">Franchise en base (TVA non applicable, article 293 B)</option>
              <option value="assujetti">Assujettie à la TVA</option>
            </select>
          </Field>
          {e.regimeTva === 'assujetti' && <Field label="Taux (%)"><Input type="number" value={e.tauxTva} onChange={(ev) => setE({ tauxTva: Number(ev.target.value) || 20 })} /></Field>}
          {e.regimeTva === 'assujetti' && txt('numeroTva', 'Numéro de TVA intracommunautaire')}
          <Field label="Délai de paiement (jours)"><Input type="number" value={e.delaiPaiementJours} onChange={(ev) => setE({ delaiPaiementJours: Number(ev.target.value) || 30 })} /></Field>
          {txt('iban', 'IBAN')}{txt('bic', 'BIC')}
          <Field label="Rayon d’intervention inclus (km)"><Input type="number" value={e.rayonKm} onChange={(ev) => setE({ rayonKm: Number(ev.target.value) || 0 })} /></Field>
        </div>
        <Field label="Mentions complémentaires des devis"><Input value={e.mentionsDevis} onChange={(ev) => setE({ mentionsDevis: ev.target.value })} /></Field>
      </div>

      <div className="card space-y-4 p-5">
        <p className="font-serif text-lg font-semibold text-foret">Présentation (propositions commerciales, plaquette)</p>
        <Field label="Qui sommes-nous"><TextArea value={e.presentation} onChange={(v) => setE({ presentation: v })} /></Field>
        <Field label="Notre approche"><TextArea value={e.approche} onChange={(v) => setE({ approche: v })} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          {txt('siteWeb', 'Site internet')}{txt('assureur', 'Assureur responsabilité civile professionnelle')}{txt('policeAssurance', 'Numéro de contrat')}{txt('mediateur', 'Médiateur de la consommation (nom et site)')}
        </div>
        <p className="text-[12px] text-charbon/55">L’assurance apparaît dans les limites de chaque rapport. Faites relire ces limites par votre assureur.</p>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-serif text-lg font-semibold text-foret">Équipe (intervenants)</p>
          <button type="button" className="btn-ghost" onClick={() => setLib({ ...lib, employes: [...lib.employes, { id: uid(), nom: '', fonction: '', email: '' }] })}>Ajouter</button>
        </div>
        <div className="space-y-2">
          {lib.employes.map((p) => (
            <div key={p.id} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Field label="Nom"><Input value={p.nom} onChange={(ev) => setLib({ ...lib, employes: lib.employes.map((x) => (x.id === p.id ? { ...x, nom: ev.target.value } : x)) })} /></Field>
              <Field label="Fonction"><Input value={p.fonction} onChange={(ev) => setLib({ ...lib, employes: lib.employes.map((x) => (x.id === p.id ? { ...x, fonction: ev.target.value } : x)) })} /></Field>
              <Field label="E-mail"><Input value={p.email} onChange={(ev) => setLib({ ...lib, employes: lib.employes.map((x) => (x.id === p.id ? { ...x, email: ev.target.value } : x)) })} /></Field>
              <button type="button" disabled={lib.employes.length < 2} className="btn-quiet text-terre" onClick={() => setLib({ ...lib, employes: lib.employes.filter((x) => x.id !== p.id) })}>×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <p className="mb-1 font-serif text-lg font-semibold text-foret">Mon offre commerciale</p>
        <p className="mb-4 text-[13px] text-charbon/60">Prix hors taxes repris automatiquement dans les devis. Le nom de chaque prestation est aussi le titre de la mission dans le rapport.</p>
        <div className="space-y-3">
          {lib.prestations.map((p) => (
            <div key={p.id} className="rounded-md border border-pierre-100 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-label text-[11px] font-semibold text-terre">{DELIVERABLES[p.type]?.num}</span>
                <Input value={p.libelle} onChange={(ev) => setLib({ ...lib, prestations: lib.prestations.map((x) => (x.id === p.id ? { ...x, libelle: ev.target.value } : x)) })} className="max-w-sm py-1.5 font-semibold" />
                <span className="text-[12px] text-charbon/55">livrable : {DELIVERABLES[p.type]?.titre}</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(['prixBas', 'prixConseille', 'prixHaut'] as const).map((k) => (
                  <Field key={k} label={k === 'prixBas' ? 'Prix minimum' : k === 'prixHaut' ? 'Prix maximum' : 'Prix proposé par défaut'}>
                    <Input inputMode="decimal" value={p[k]} onChange={(ev) => setLib({ ...lib, prestations: lib.prestations.map((x) => (x.id === p.id ? { ...x, [k]: Number(ev.target.value.replace(',', '.')) || 0 } : x)) })} />
                  </Field>
                ))}
              </div>
              <div className="mt-2"><Field label="Description sur le devis"><Input value={p.detail} onChange={(ev) => setLib({ ...lib, prestations: lib.prestations.map((x) => (x.id === p.id ? { ...x, detail: ev.target.value } : x)) })} /></Field></div>
            </div>
          ))}
          <button type="button" className="btn-quiet text-[13px]" onClick={() => setLib({ ...lib, prestations: [...lib.prestations, { id: uid(), type: 'conseil', libelle: 'Nouvelle prestation', detail: '', prixBas: 0, prixHaut: 0, prixConseille: 0, unite: 'forfait' }] })}>+ Ajouter une prestation</button>
          <p className="label-caps pt-2">Options</p>
          {lib.options.map((o) => (
            <div key={o.id} className="grid items-end gap-2 sm:grid-cols-[1fr_120px_120px_auto]">
              <Field label="Option"><Input value={o.libelle} onChange={(ev) => setLib({ ...lib, options: lib.options.map((x) => (x.id === o.id ? { ...x, libelle: ev.target.value } : x)) })} /></Field>
              <Field label={`Prix par ${o.unite}`}><Input inputMode="decimal" value={o.prixConseille} onChange={(ev) => setLib({ ...lib, options: lib.options.map((x) => (x.id === o.id ? { ...x, prixConseille: Number(ev.target.value.replace(',', '.')) || 0 } : x)) })} /></Field>
              <Field label="Unité"><Input value={o.unite} onChange={(ev) => setLib({ ...lib, options: lib.options.map((x) => (x.id === o.id ? { ...x, unite: ev.target.value } : x)) })} /></Field>
              <button type="button" className="px-2 pb-2 text-terre" onClick={() => setLib({ ...lib, options: lib.options.filter((x) => x.id !== o.id) })} aria-label="Supprimer">×</button>
            </div>
          ))}
          <button type="button" className="btn-quiet text-[13px]" onClick={() => setLib({ ...lib, options: [...lib.options, { id: uid(), libelle: 'Nouvelle option', detail: '', unite: 'forfait', prixBas: 0, prixHaut: 0, prixConseille: 0 }] })}>+ Ajouter une option</button>
        </div>
      </div>
    </div>
  );
}
