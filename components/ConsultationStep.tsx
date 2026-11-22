'use client';
import { useState } from 'react';
import { estimatePrix } from '@/lib/business';
import { eur, today } from '@/lib/commercial';
import { uid } from '@/lib/factory';
import type { Consultation, Dossier, LotConsultation, OffreEntreprise } from '@/lib/types';
import { useLibrary } from './LibraryProvider';
import { Combo, Field, Input, SectionTitle, TextArea } from './ui';

/** Accompagnement : consultation des entreprises, comparatif des offres, apprentissage des prix. */
export default function ConsultationStep({ dossier, update }: { dossier: Dossier; update: (d: Dossier) => void }) {
  const { lib, setLib, phrases } = useLibrary();
  const c: Consultation = dossier.consultation ?? { lots: [], offres: [], analyse: '' };
  const setC = (patch: Partial<Consultation>) => update({ ...dossier, consultation: { ...c, ...patch } });
  const setLot = (id: string, p: Partial<LotConsultation>) => setC({ lots: c.lots.map((l) => (l.id === id ? { ...l, ...p } : l)) });
  const setOffre = (id: string, p: Partial<OffreEntreprise>) => setC({ offres: c.offres.map((o) => (o.id === id ? { ...o, ...p } : o)) });
  const [flash, setFlash] = useState<string | null>(null);

  /** Pré-remplit les lots depuis les fiches désordres (lot et chiffrage). */
  function lotsDepuisFiches() {
    const by = new Map<string, { bas: number; haut: number; types: string[] }>();
    for (const d of dossier.desordres) {
      const lot = d.lot?.trim();
      if (!lot) continue;
      const e = by.get(lot) ?? { bas: 0, haut: 0, types: [] };
      e.bas += d.chiffrage?.bas ?? 0; e.haut += d.chiffrage?.haut ?? 0; e.types.push(d.type);
      by.set(lot, e);
    }
    const existing = new Set(c.lots.map((l) => l.lot));
    const add = Array.from(by.entries()).filter(([lot]) => !existing.has(lot)).map(([lot, e]) => ({
      id: uid(), lot, description: Array.from(new Set(e.types)).join(', '), estimationBas: Math.round(e.bas), estimationHaut: Math.round(e.haut),
    }));
    setC({ lots: [...c.lots, ...add] });
    setFlash(add.length ? `${add.length} lot(s) repris des fiches désordres.` : 'Aucun nouveau lot à reprendre (renseignez le lot dans les fiches).');
  }

  function apprendre(o: OffreEntreprise) {
    const item = lib.prix.find((p) => p.id === o.prixId);
    if (!item || !o.quantite || !o.montantHT) return;
    const pu = Math.round((o.montantHT / o.quantite) * 100) / 100;
    setLib({ ...lib, prix: lib.prix.map((p) => (p.id === item.id ? { ...p, observations: [...p.observations, { id: uid(), date: o.dateDevis || today(), prixUnitaire: pu, source: 'devis', entreprise: o.entreprise, commune: dossier.meta.bien.commune }] } : p)) });
    setFlash(`Prix ajouté à votre bibliothèque : ${item.libelle}, ${eur(pu)} par ${item.unite} (${o.entreprise || 'entreprise'}). Les prochaines estimations en tiendront compte.`);
  }

  const retenues = c.offres.filter((o) => o.retenue);
  const totalRetenu = retenues.reduce((a, o) => a + (o.montantHT || 0), 0);

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Accompagnement" title="Consultation des entreprises">
        <button type="button" className="btn-ghost" onClick={lotsDepuisFiches}>Reprendre les lots des fiches</button>
      </SectionTitle>
      {flash && <p className="card border-sauge bg-sauge-50 p-3 text-[14px]">{flash}</p>}

      {c.lots.length === 0 && <p className="card p-5 text-[14px] text-charbon/60">Créez un lot par corps de métier consulté, puis saisissez les offres reçues. Le rapport présente le comparatif et l’écart avec votre estimation.</p>}

      {c.lots.map((l) => {
        const offres = c.offres.filter((o) => o.lotId === l.id);
        return (
          <div key={l.id} className="card space-y-4 p-5">
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_120px_120px_auto]">
              <Field label="Lot"><Combo value={l.lot} onChange={(v) => setLot(l.id, { lot: v })} options={phrases('lots')} /></Field>
              <Field label="Estimation basse"><Input inputMode="numeric" value={l.estimationBas || ''} onChange={(e) => setLot(l.id, { estimationBas: Number(e.target.value) || 0 })} /></Field>
              <Field label="Estimation haute"><Input inputMode="numeric" value={l.estimationHaut || ''} onChange={(e) => setLot(l.id, { estimationHaut: Number(e.target.value) || 0 })} /></Field>
              <button type="button" disabled={offres.length > 0} className="btn-quiet text-terre" onClick={() => setC({ lots: c.lots.filter((x) => x.id !== l.id) })}>Supprimer</button>
            </div>
            <Field label="Travaux du lot"><Input value={l.description} onChange={(e) => setLot(l.id, { description: e.target.value })} /></Field>

            <div className="space-y-3">
              {offres.map((o) => {
                const moy = ((l.estimationBas ?? 0) + (l.estimationHaut ?? 0)) / 2;
                const ecart = moy > 0 && o.montantHT ? Math.round(((o.montantHT - moy) / moy) * 100) : null;
                const item = lib.prix.find((p) => p.id === o.prixId);
                return (
                  <div key={o.id} className={`rounded-md border p-3 ${o.retenue ? 'border-sauge bg-sauge-50' : 'border-pierre-100'}`}>
                    <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
                      <Field label="Entreprise"><Combo value={o.entreprise} onChange={(v) => setOffre(o.id, { entreprise: v })} options={dossier.annuaire.map((a) => a.nom).filter(Boolean)} /></Field>
                      <Field label="Date du devis"><Input type="date" value={o.dateDevis} onChange={(e) => setOffre(o.id, { dateDevis: e.target.value })} /></Field>
                      <Field label="Montant hors taxes"><Input inputMode="decimal" value={o.montantHT || ''} onChange={(e) => setOffre(o.id, { montantHT: Number(e.target.value.replace(',', '.')) || 0 })} /></Field>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
                      <Field label="Délai"><Input value={o.delai} onChange={(e) => setOffre(o.id, { delai: e.target.value })} placeholder="ex. 6 semaines" /></Field>
                      <Field label="Exclusions et réserves"><Input value={o.exclusions} onChange={(e) => setOffre(o.id, { exclusions: e.target.value })} placeholder="Échafaudage, évacuation des gravats…" /></Field>
                    </div>
                    <div className="mt-3"><Field label="Observations"><Input value={o.observations} onChange={(e) => setOffre(o.id, { observations: e.target.value })} placeholder="Méthodes, matériaux, références…" /></Field></div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!o.retenue} onChange={(e) => setOffre(o.id, { retenue: e.target.checked })} /> Offre retenue</label>
                      {ecart !== null && <span className={Math.abs(ecart) > 25 ? 'text-terre' : 'text-sauge'}>{ecart > 0 ? '+' : ''}{ecart} % par rapport à l’estimation moyenne</span>}
                      <button type="button" className="btn-quiet ml-auto text-terre" onClick={() => setC({ offres: c.offres.filter((x) => x.id !== o.id) })}>Retirer</button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-pierre-100 pt-3">
                      <span className="w-full text-[12px] text-charbon/55">Enrichir ma bibliothèque de prix avec ce devis :</span>
                      <select value={o.prixId ?? ''} onChange={(e) => setOffre(o.id, { prixId: e.target.value || undefined })} className="field w-auto max-w-[280px] py-1.5 text-[13px]">
                        <option value="">Ouvrage correspondant…</option>
                        {lib.prix.map((p) => <option key={p.id} value={p.id}>{p.lot} — {p.libelle}</option>)}
                      </select>
                      <input inputMode="decimal" value={o.quantite ?? ''} onChange={(e) => setOffre(o.id, { quantite: Number(e.target.value.replace(',', '.')) || undefined })} className="field w-24 py-1.5 text-[13px]" placeholder={item ? `quantité (${item.unite})` : 'quantité'} aria-label="Quantité" />
                      <button type="button" className="btn-ghost min-h-[36px] text-[13px]" disabled={!item || !o.quantite || !o.montantHT} onClick={() => apprendre(o)}>Ajouter ce prix</button>
                      {item && <span className="text-[12px] text-charbon/55">Estimation actuelle : {eur(estimatePrix(item).bas)} à {eur(estimatePrix(item).haut)} par {item.unite}</span>}
                    </div>
                  </div>
                );
              })}
              <button type="button" className="btn-ghost text-[13px]" onClick={() => setC({ offres: [...c.offres, { id: uid(), lotId: l.id, entreprise: '', dateDevis: today(), montantHT: 0, delai: '', exclusions: '', observations: '', retenue: false }] })}>+ Offre d’entreprise</button>
            </div>
          </div>
        );
      })}

      <button type="button" className="btn-primary" onClick={() => setC({ lots: [...c.lots, { id: uid(), lot: '', description: '', estimationBas: 0, estimationHaut: 0 }] })}>Ajouter un lot</button>

      {retenues.length > 0 && (
        <p className="card p-4 text-[14px]">Offres retenues : <b>{retenues.length}</b> pour un total hors taxes de <b className="tabular-nums">{eur(totalRetenu)}</b>.</p>
      )}

      <div className="card p-5">
        <Field label="Analyse et recommandation" hint="reprise dans le rapport">
          <TextArea rows={5} value={c.analyse} onChange={(v) => setC({ analyse: v })} placeholder="Comparaison des méthodes, points de vigilance, entreprise recommandée et pourquoi…" />
        </Field>
      </div>
    </div>
  );
}
