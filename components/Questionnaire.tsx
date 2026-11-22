'use client';
import { QUESTIONNAIRE_VIDE, Q_LABELS } from '@/lib/business';
import { ZONES_PERIMETRE } from '@/lib/perimetre';
import type { Questionnaire } from '@/lib/types';
import { Field, Input, TextArea } from './ui';

export function Choix<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Record<T, string>; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="label-caps mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(options) as T[]).map((k) => (
          <button key={k} type="button" onClick={() => onChange(k)} className={`rounded-full border px-3 py-1.5 text-[13px] ${value === k ? 'border-foret bg-foret text-ivoire' : 'border-pierre bg-white'}`}>{options[k]}</button>
        ))}
      </div>
    </div>
  );
}

/** Questionnaire préalable (devis et dossier). */
export default function QuestionnaireForm({ value, onChange, rayonKm }: { value?: Questionnaire; onChange: (q: Questionnaire) => void; rayonKm?: number }) {
  const q = { ...QUESTIONNAIRE_VIDE, ...(value ?? {}) };
  const setQ = (p: Partial<Questionnaire>) => onChange({ ...q, ...p });
  return (
    <div className="space-y-5">
      <Field label="Le projet du client"><Input value={q.besoin} onChange={(e) => setQ({ besoin: e.target.value })} placeholder="Achat, travaux, entretien, sinistre, fissures récentes…" /></Field>
      <Choix label="Type de bâtiment" value={q.typeBatiment} options={Q_LABELS.typeBatiment} onChange={(v) => setQ({ typeBatiment: v })} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Surface de plancher (m²)"><Input inputMode="numeric" value={q.surface ?? ''} onChange={(e) => setQ({ surface: Number(e.target.value) || null })} /></Field>
        <Field label="Nombre de niveaux"><Input inputMode="numeric" value={q.niveaux ?? ''} onChange={(e) => setQ({ niveaux: Number(e.target.value) || null })} /></Field>
        <Field label="Distance depuis l’atelier (km)" hint={rayonKm != null ? `${rayonKm} km inclus` : undefined}><Input inputMode="numeric" value={q.distanceKm ?? ''} onChange={(e) => setQ({ distanceKm: Number(e.target.value) || null })} /></Field>
      </div>
      <Choix label="État apparent" value={q.etat} options={Q_LABELS.etat} onChange={(v) => setQ({ etat: v })} />
      <Choix label="Désordres signalés" value={q.desordres} options={Q_LABELS.desordres} onChange={(v) => setQ({ desordres: v })} />
      <Choix label="Étendue de la mission" value={q.etendue} options={Q_LABELS.etendue} onChange={(v) => setQ({ etendue: v })} />
      {q.etendue !== 'complet' && (
        <div>
          <Field label="Parties concernées"><Input value={q.zonesConcernees} onChange={(e) => setQ({ zonesConcernees: e.target.value })} placeholder="Ex. cave et sous-sol, cheminée, façade sur rue…" /></Field>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {ZONES_PERIMETRE.map((z) => <button key={z} type="button" onClick={() => setQ({ zonesConcernees: q.zonesConcernees ? `${q.zonesConcernees}, ${z.toLowerCase()}` : z })} className="rounded-full border border-pierre bg-white px-2 py-0.5 text-[11px]">+ {z}</button>)}
          </div>
        </div>
      )}
      <Choix label="Accès" value={q.acces} options={Q_LABELS.acces} onChange={(v) => setQ({ acces: v })} />
      <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={q.urgence} onChange={(e) => setQ({ urgence: e.target.checked })} /> Intervention urgente (danger, sinistre, vente imminente)</label>
      <Field label="Documents disponibles"><Input value={q.documents} onChange={(e) => setQ({ documents: e.target.value })} placeholder="Plans, anciens diagnostics, photos…" /></Field>
      <Field label="Remarques"><TextArea value={q.notes} onChange={(v) => setQ({ notes: v })} /></Field>
    </div>
  );
}
