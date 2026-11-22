'use client';
import { useState } from 'react';
import { SOURCES, STATUTS_PISTE, TYPES_PISTE, type Piste, type StatutPiste } from '@/lib/business';
import { fmtDate } from '@/lib/calc';
import { today } from '@/lib/commercial';
import { uid } from '@/lib/factory';
import type { Dossier } from '@/lib/types';
import { useLibrary } from './LibraryProvider';
import { Field, Input, TextArea } from './ui';

const IDEES: [string, string][] = [
  ['Notaires et agences immobilières', 'Les acheteurs de maisons anciennes veulent savoir dans quoi ils s’engagent : un avis sanitaire avant la signature rassure tout le monde.'],
  ['Artisans du patrimoine', 'Maçons à la chaux, charpentiers, couvreurs : ils rencontrent des clients qui ont besoin d’un diagnostic indépendant, et vous leur envoyez des chantiers en retour.'],
  ['Architectes et bureaux d’études', 'Ils sous-traitent volontiers l’état des lieux sanitaire d’un bâtiment ancien avant leur mission.'],
  ['Mairies et petites communes', 'Bâtiments communaux, églises, lavoirs, petit patrimoine : avis sanitaires et accompagnement des élus.'],
  ['Associations du patrimoine', 'Maisons paysannes, fondations, sauvegarde : conférences, ateliers, articles dans leurs bulletins.'],
  ['Salons et marchés', 'Salons de l’habitat, journées du patrimoine, foires : une plaquette et des guides de bonnes pratiques à distribuer.'],
  ['Présence en ligne', 'Fiche d’établissement sur les cartes, avis clients, réalisations publiées avec l’accord des clients.'],
];

/** Recherche de clients et prospection : pistes, prochaines actions, prescripteurs. */
export default function Prospection({ dossiers, onDevis }: { dossiers: Dossier[]; onDevis: (pisteId: string) => void }) {
  const { lib, setLib } = useLibrary();
  const [edit, setEdit] = useState<Piste | null>(null);
  const pistes = lib.pistes;
  const set = (l: Piste[]) => setLib({ ...lib, pistes: l });
  const save = (p: Piste) => { set(pistes.some((x) => x.id === p.id) ? pistes.map((x) => (x.id === p.id ? p : x)) : [...pistes, p]); setEdit(null); };
  const vide = (): Piste => ({ id: uid(), nom: '', type: 'Particulier', source: 'Bouche à oreille', statut: 'a-contacter', telephone: '', email: '', ville: '', prochaineAction: '', notes: '', creeLe: today() });

  // Indicateurs : sources des clients (dossiers et pistes gagnées)
  const gagnees = pistes.filter((p) => p.statut === 'gagne').length;
  const closes = pistes.filter((p) => p.statut === 'gagne' || p.statut === 'perdu').length;
  const parSource = SOURCES.map((s) => ({ s, n: pistes.filter((p) => p.source === s).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  const colonnes: StatutPiste[] = ['a-contacter', 'contacte', 'rdv', 'devis', 'gagne', 'perdu'];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[32px] font-semibold leading-none text-foret">Prospection</h1>
          <p className="mt-2 text-[14px] text-charbon/60">Pistes de clients et de prescripteurs, avec la prochaine action à mener (elle apparaît dans l’agenda).</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEdit(vide())}>Nouvelle piste</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-[12px] text-charbon/60">Pistes en cours</p><p className="font-serif text-[26px] font-semibold text-foret">{pistes.filter((p) => !['gagne', 'perdu'].includes(p.statut)).length}</p></div>
        <div className="card p-4"><p className="text-[12px] text-charbon/60">Taux de transformation</p><p className="font-serif text-[26px] font-semibold text-foret">{closes ? `${Math.round((gagnees / closes) * 100)} %` : '—'}</p><p className="text-[12px] text-charbon/50">{gagnees} gagnée{gagnees > 1 ? 's' : ''} sur {closes} close{closes > 1 ? 's' : ''}</p></div>
        <div className="card p-4"><p className="text-[12px] text-charbon/60">D’où viennent vos clients</p><p className="mt-1 text-[13px]">{parSource.length ? parSource.slice(0, 4).map((x) => `${x.s} (${x.n})`).join(' · ') : 'Pas encore de données'}</p></div>
      </div>

      <div className="grid gap-3 overflow-x-auto lg:grid-cols-6">
        {colonnes.map((st) => {
          const l = pistes.filter((p) => p.statut === st).sort((a, b) => (a.dateAction || '9').localeCompare(b.dateAction || '9'));
          return (
            <div key={st} className="min-w-[200px] rounded-lg bg-white/70 p-2.5">
              <p className="mb-2 text-[12px] font-semibold text-foret">{STATUTS_PISTE[st]} <span className="text-charbon/45">{l.length}</span></p>
              <div className="space-y-2">
                {l.map((p) => {
                  const late = p.dateAction && p.dateAction < today() && !['gagne', 'perdu'].includes(p.statut);
                  return (
                    <button key={p.id} type="button" onClick={() => setEdit(p)} className="block w-full rounded-md border border-pierre-100 bg-white p-2 text-left text-[12.5px] shadow-sm hover:border-sauge">
                      <span className="block font-medium">{p.nom || 'Sans nom'}</span>
                      <span className="block text-[11px] text-charbon/55">{p.type}{p.ville ? ` · ${p.ville}` : ''}</span>
                      {p.prochaineAction && <span className={`mt-1 block text-[11px] ${late ? 'text-p1' : 'text-terre'}`}>→ {p.prochaineAction}{p.dateAction ? ` (${fmtDate(p.dateAction)})` : ''}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <p className="mb-3 font-serif text-xl font-semibold text-foret">Où trouver des clients</p>
        <div className="grid gap-3 md:grid-cols-2">
          {IDEES.map(([t, d]) => (
            <div key={t} className="rounded-md bg-ivoire p-3">
              <p className="font-medium text-foret">{t}</p>
              <p className="text-[13px] text-charbon/70">{d}</p>
              <button type="button" className="btn-quiet mt-1 text-[12px]" onClick={() => setEdit({ ...vide(), type: t.includes('Notaire') ? 'Notaire' : t.includes('Artisan') ? 'Artisan' : t.includes('Architecte') ? 'Architecte' : t.includes('Mairie') ? 'Mairie, collectivité' : t.includes('Association') ? 'Association du patrimoine' : 'Autre', source: 'Démarchage', prochaineAction: 'Premier contact' })}>+ Ajouter une piste</button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-charbon/55">Un modèle de mail « Présentation à un prescripteur » et la plaquette sont dans Modèles de mails et Supports de communication.</p>
      </div>

      {edit && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-charbon/30 p-4" onClick={() => setEdit(null)}>
          <div className="card w-full max-w-2xl space-y-3 p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-2xl font-semibold text-foret">Piste</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom (personne ou structure)"><Input value={edit.nom} onChange={(e) => setEdit({ ...edit, nom: e.target.value })} autoFocus /></Field>
              <Field label="Type"><select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} className="field">{TYPES_PISTE.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Source"><select value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value })} className="field">{SOURCES.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Statut"><select value={edit.statut} onChange={(e) => setEdit({ ...edit, statut: e.target.value as StatutPiste })} className="field">{(Object.keys(STATUTS_PISTE) as StatutPiste[]).map((s) => <option key={s} value={s}>{STATUTS_PISTE[s]}</option>)}</select></Field>
              <Field label="Téléphone"><Input value={edit.telephone} onChange={(e) => setEdit({ ...edit, telephone: e.target.value })} /></Field>
              <Field label="E-mail"><Input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
              <Field label="Ville"><Input value={edit.ville} onChange={(e) => setEdit({ ...edit, ville: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
              <Field label="Prochaine action"><Input value={edit.prochaineAction} onChange={(e) => setEdit({ ...edit, prochaineAction: e.target.value })} placeholder="Appeler, envoyer la plaquette, passer à l’étude…" /></Field>
              <Field label="Pour le"><Input type="date" value={edit.dateAction ?? ''} onChange={(e) => setEdit({ ...edit, dateAction: e.target.value || undefined })} /></Field>
            </div>
            <Field label="Notes"><TextArea value={edit.notes} onChange={(v) => setEdit({ ...edit, notes: v })} /></Field>
            {edit.dossierId && dossiers.some((d) => d.id === edit.dossierId) && <p className="text-[13px] text-sauge">Un devis a été préparé pour cette piste.</p>}
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" className="btn-primary" onClick={() => save(edit)}>Enregistrer</button>
              {edit.type === 'Particulier' && <button type="button" className="btn-ghost" onClick={() => { save({ ...edit, statut: 'devis' }); onDevis(edit.id); }}>Préparer un devis</button>}
              {edit.email && <a className="btn-ghost" href={`mailto:${edit.email}`}>Écrire</a>}
              {pistes.some((x) => x.id === edit.id) && <button type="button" className="btn-quiet text-terre" onClick={() => { set(pistes.filter((x) => x.id !== edit.id)); setEdit(null); }}>Supprimer</button>}
              <button type="button" className="btn-quiet ml-auto" onClick={() => setEdit(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
