'use client';
import { useState } from 'react';
import { fmtDate } from '@/lib/calc';
import {
  ETAPES, enRetard, etapeOf, eur, factureDepuisDevis, ligneOption, newDevis, nextNumeroDoc, today, totaux,
} from '@/lib/commercial';
import { uid } from '@/lib/factory';
import type { Commercial, Devis, Dossier, Facture, LigneCommerciale, StatutDevis } from '@/lib/types';
import { useLibrary } from './LibraryProvider';
import { Field, Input, SectionTitle } from './ui';
import Remise from './Remise';

const STATUT_DEVIS: Record<StatutDevis, string> = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé' };

/** Étape « Devis et facturation » d'un dossier : devis, factures, rendez-vous, date de rendu. */
export default function CommercialStep({ dossier, update, all, onPrint }: {
  dossier: Dossier; update: (d: Dossier) => void; all: Dossier[];
  onPrint: (kind: 'devis' | 'facture', id: string) => void;
}) {
  const { lib, setLib } = useLibrary();
  const ent = lib.entreprise;
  const c: Commercial = dossier.commercial ?? { devis: [], factures: [] };
  const setC = (patch: Partial<Commercial>) => update({ ...dossier, commercial: { ...c, ...patch } });
  const others = all.filter((x) => x.id !== dossier.id).concat(dossier);
  const etape = etapeOf(dossier);
  const [rdv, setRdv] = useState({ date: '', heure: '', titre: 'Rendez-vous client', type: 'rdv' as 'rdv' | 'visite' });

  const setDevis = (id: string, patch: Partial<Devis>) => setC({ devis: c.devis.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const setFacture = (id: string, patch: Partial<Facture>) => setC({ factures: c.factures.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const evenements = lib.agenda.filter((e) => e.dossierId === dossier.id).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Suivi de l’affaire" title="Devis, facturation et agenda" />

      {/* Avancement */}
      <div className="card p-4">
        <p className="label-caps mb-3">Avancement (calculé automatiquement)</p>
        <ol className="flex flex-wrap gap-1">
          {ETAPES.map((e, i) => {
            const reached = ETAPES.indexOf(etape) >= i;
            return <li key={e} className={`rounded-full px-3 py-1 text-[12px] ${e === etape ? 'bg-foret text-ivoire' : reached ? 'bg-sauge-100 text-foret' : 'bg-pierre-50 text-charbon/45'}`}>{e}</li>;
          })}
        </ol>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Date de rendu prévue du rapport"><Input type="date" value={c.dateRendu ?? ''} onChange={(e) => setC({ dateRendu: e.target.value })} /></Field>
          <Field label="Notes de suivi"><Input value={c.notes ?? ''} onChange={(e) => setC({ notes: e.target.value })} placeholder="Relances, échanges…" /></Field>
        </div>
      </div>

      {/* Rendez-vous */}
      <div className="card p-4">
        <p className="label-caps mb-3">Rendez-vous et visites de ce dossier</p>
        {evenements.length > 0 && (
          <ul className="mb-3 space-y-1 text-[14px]">
            {evenements.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 border-b border-pierre-100 py-1.5">
                <span>{fmtDate(e.date)}{e.heure ? ` à ${e.heure}` : ''} — {e.titre}</span>
                <button type="button" className="text-terre" onClick={() => setLib({ ...lib, agenda: lib.agenda.filter((x) => x.id !== e.id) })}>×</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <input type="date" value={rdv.date} onChange={(e) => setRdv({ ...rdv, date: e.target.value })} className="field w-auto py-1.5" aria-label="Date" />
          <input type="time" value={rdv.heure} onChange={(e) => setRdv({ ...rdv, heure: e.target.value })} className="field w-auto py-1.5" aria-label="Heure" />
          <select value={rdv.type} onChange={(e) => setRdv({ ...rdv, type: e.target.value as 'rdv' | 'visite', titre: e.target.value === 'visite' ? 'Visite sur site' : 'Rendez-vous client' })} className="field w-auto py-1.5">
            <option value="rdv">Rendez-vous</option><option value="visite">Visite</option>
          </select>
          <input value={rdv.titre} onChange={(e) => setRdv({ ...rdv, titre: e.target.value })} className="field w-56 py-1.5" aria-label="Titre" />
          <button type="button" className="btn-ghost min-h-[38px]" disabled={!rdv.date} onClick={() => {
            setLib({ ...lib, agenda: [...lib.agenda, { id: uid(), date: rdv.date, heure: rdv.heure || undefined, titre: `${rdv.titre} — ${dossier.meta.client.nom || dossier.numero}`, type: rdv.type, dossierId: dossier.id, lieu: [dossier.meta.bien.adresse, dossier.meta.bien.commune].filter(Boolean).join(', ') }] });
            setRdv({ ...rdv, date: '', heure: '' });
          }}>Ajouter à l’agenda</button>
        </div>
      </div>

      {/* Devis */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-serif text-xl font-semibold text-foret">Devis</p>
          <button type="button" className="btn-primary" onClick={() => setC({ devis: [...c.devis, newDevis(others, dossier, lib.prestations)] })}>Nouveau devis</button>
        </div>
        {c.devis.length === 0 && <p className="card p-4 text-[14px] text-charbon/60">Le devis reprend la prestation de votre offre correspondant au livrable ({dossier.meta.titreMission}), modifiable, avec les options.</p>}
        <div className="space-y-4">
          {c.devis.map((d) => {
            const t = totaux(d.lignes, ent);
            const locked = d.statut !== 'brouillon';
            return (
              <div key={d.id} className="card p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foret">{d.numero}</span>
                  <span className="text-[13px] text-charbon/60">du {fmtDate(d.date)}</span>
                  <select value={d.statut} onChange={(e) => setDevis(d.id, { statut: e.target.value as StatutDevis })} className="field ml-auto w-auto py-1.5 text-[13px]">
                    {(Object.keys(STATUT_DEVIS) as StatutDevis[]).map((s) => <option key={s} value={s}>{STATUT_DEVIS[s]}</option>)}
                  </select>
                  <button type="button" className="btn-ghost min-h-[36px] text-[13px]" onClick={() => onPrint('devis', d.id)}>Imprimer / PDF</button>
                </div>
                <Lignes lignes={d.lignes} locked={locked} onChange={(lignes) => setDevis(d.id, { lignes })} />
                {!locked && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <select value="" onChange={(e) => { const o = lib.options.find((x) => x.id === e.target.value); if (o) setDevis(d.id, { lignes: [...d.lignes, ligneOption(o)] }); }} className="field w-auto py-1.5 text-[13px]">
                      <option value="">+ Ajouter une option…</option>
                      {lib.options.map((o) => <option key={o.id} value={o.id}>{o.libelle} ({eur(o.prixConseille)} / {o.unite})</option>)}
                    </select>
                    <select value="" onChange={(e) => { const p = lib.prestations.find((x) => x.id === e.target.value); if (p) setDevis(d.id, { lignes: [...d.lignes, { id: uid(), libelle: `${p.libelle} — ${p.detail}`, quantite: 1, unite: p.unite, puHT: p.prixConseille }] }); }} className="field w-auto py-1.5 text-[13px]">
                      <option value="">+ Ajouter une prestation…</option>
                      {lib.prestations.map((p) => <option key={p.id} value={p.id}>{p.libelle} ({eur(p.prixBas)} à {eur(p.prixHaut)})</option>)}
                    </select>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-wrap gap-3">
                    <Field label="Validité (jours)"><Input type="number" disabled={locked} value={d.validiteJours} onChange={(e) => setDevis(d.id, { validiteJours: Number(e.target.value) || 30 })} className="w-24" /></Field>
                    <Field label="Acompte (%)"><Input type="number" disabled={locked} value={d.acomptePct} onChange={(e) => setDevis(d.id, { acomptePct: Number(e.target.value) || 0 })} className="w-24" /></Field>
                  </div>
                  <p className="text-right text-[14px]">Total hors taxes <b className="tabular-nums">{eur(t.ht)}</b>{ent.regimeTva === 'assujetti' && <> · toutes taxes comprises <b className="tabular-nums">{eur(t.ttc)}</b></>}</p>
                </div>
                {d.statut === 'accepte' && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-pierre-100 pt-3">
                    <span className="text-[13px] text-charbon/60">Facturer :</span>
                    <button type="button" className="btn-ghost min-h-[34px] text-[13px]" onClick={() => setC({ factures: [...c.factures, factureDepuisDevis(d, 'acompte', c.factures, ent)] })}>Acompte de {d.acomptePct} %</button>
                    <button type="button" className="btn-ghost min-h-[34px] text-[13px]" onClick={() => setC({ factures: [...c.factures, factureDepuisDevis(d, 'solde', c.factures, ent)] })}>Solde</button>
                    <button type="button" className="btn-ghost min-h-[34px] text-[13px]" onClick={() => setC({ factures: [...c.factures, factureDepuisDevis(d, 'totale', c.factures, ent)] })}>Totalité</button>
                  </div>
                )}
                {d.statut === 'brouillon' && <button type="button" className="btn-quiet mt-2 text-[12px] text-terre" onClick={() => setC({ devis: c.devis.filter((x) => x.id !== d.id) })}>Supprimer ce brouillon</button>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Factures */}
      <div>
        <p className="mb-3 font-serif text-xl font-semibold text-foret">Factures</p>
        {c.factures.length === 0 && <p className="card p-4 text-[14px] text-charbon/60">Les factures se créent depuis un devis accepté (acompte, solde ou totalité).</p>}
        <div className="space-y-4">
          {c.factures.map((f) => {
            const t = totaux(f.lignes, ent);
            const retard = enRetard(f);
            return (
              <div key={f.id} className={`card p-4 ${retard ? 'border-p1' : ''}`}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foret">{f.numero || 'Brouillon'}</span>
                  <span className="text-[13px] text-charbon/60">{f.nature === 'acompte' ? 'Acompte' : f.nature === 'solde' ? 'Solde' : 'Totalité'} · échéance {fmtDate(f.echeance)}</span>
                  {retard && <span className="rounded-full bg-p1 px-2 py-0.5 text-[11px] text-white">En retard</span>}
                  {f.statut === 'payee' && <span className="rounded-full bg-sauge px-2 py-0.5 text-[11px] text-white">Payée le {fmtDate(f.datePaiement ?? '')}</span>}
                  <span className="ml-auto" />
                  {f.statut === 'brouillon' && (
                    <button type="button" className="btn-primary min-h-[36px] text-[13px]" onClick={() => setFacture(f.id, { statut: 'emise', numero: nextNumeroDoc(others, 'FAC'), date: today() })}>Émettre (numéroter)</button>
                  )}
                  {f.statut === 'emise' && (
                    <button type="button" className="btn-ghost min-h-[36px] text-[13px]" onClick={() => setFacture(f.id, { statut: 'payee', datePaiement: today(), modePaiement: 'virement' })}>Marquer payée</button>
                  )}
                  <button type="button" className="btn-ghost min-h-[36px] text-[13px]" onClick={() => onPrint('facture', f.id)}>Imprimer / PDF</button>
                </div>
                <Lignes lignes={f.lignes} locked={f.statut !== 'brouillon'} onChange={(lignes) => setFacture(f.id, { lignes })} />
                <p className="mt-2 text-right text-[14px]">Total hors taxes <b className="tabular-nums">{eur(t.ht)}</b>{ent.regimeTva === 'assujetti' && <> · toutes taxes comprises <b className="tabular-nums">{eur(t.ttc)}</b></>}</p>
                {f.statut === 'brouillon' && <button type="button" className="btn-quiet text-[12px] text-terre" onClick={() => setC({ factures: c.factures.filter((x) => x.id !== f.id) })}>Supprimer ce brouillon</button>}
                {f.statut !== 'brouillon' && <p className="text-[11px] text-charbon/45">Facture émise : elle ne peut plus être modifiée ni supprimée (numérotation continue). Pour l’annuler, il faudra un avoir.</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Lignes({ lignes, locked, onChange }: { lignes: LigneCommerciale[]; locked: boolean; onChange: (l: LigneCommerciale[]) => void }) {
  const set = (id: string, patch: Partial<LigneCommerciale>) => onChange(lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-2">
      {lignes.map((l) => (
        <div key={l.id} className="grid items-start gap-2 sm:grid-cols-[1fr_70px_90px_110px_auto]">
          <textarea disabled={locked} rows={2} value={l.libelle} onChange={(e) => set(l.id, { libelle: e.target.value })} className="field resize-y py-1.5 text-[13px]" aria-label="Désignation" />
          <input disabled={locked} inputMode="decimal" value={l.quantite} onChange={(e) => set(l.id, { quantite: Number(e.target.value.replace(',', '.')) || 0 })} className="field py-1.5 text-[13px]" aria-label="Quantité" />
          <input disabled={locked} value={l.unite} onChange={(e) => set(l.id, { unite: e.target.value })} className="field py-1.5 text-[13px]" aria-label="Unité" />
          <input disabled={locked} inputMode="decimal" value={l.puHT} onChange={(e) => set(l.id, { puHT: Number(e.target.value.replace(',', '.')) || 0 })} className="field py-1.5 text-right text-[13px]" aria-label="Prix unitaire hors taxes" />
          {!locked ? <button type="button" className="px-2 pt-2 text-terre" onClick={() => onChange(lignes.filter((x) => x.id !== l.id))} aria-label="Retirer">×</button> : <span />}
        </div>
      ))}
      {!locked && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-quiet text-[13px]" onClick={() => onChange([...lignes, { id: uid(), libelle: '', quantite: 1, unite: 'forfait', puHT: 0 }])}>+ Ligne libre</button>
          <Remise lignes={lignes} onChange={onChange} />
        </div>
      )}
      {lignes.length > 0 && <p className="text-[11px] text-charbon/45">Colonnes : désignation · quantité · unité · prix unitaire hors taxes</p>}
    </div>
  );
}
