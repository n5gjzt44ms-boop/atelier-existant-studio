'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QUESTIONNAIRE_VIDE, Q_LABELS, contactVide, prixSuggere, type Prestation } from '@/lib/business';
import { DEFAULT_MISSION, DELIVERABLES } from '@/lib/constants';
import { eur, nextNumeroDoc, today, totaux } from '@/lib/commercial';
import { newDossier, uid } from '@/lib/factory';
import type { Devis, Dossier, LigneCommerciale, Questionnaire, StatutDevis } from '@/lib/types';
import { useLibrary } from './LibraryProvider';
import { PropositionDoc } from './Supports';
import QuestionnaireForm, { Choix } from './Questionnaire';
import Remise from './Remise';
import { CATEGORIES_CONTACT } from '@/lib/business';
import { appliquerQuestionnaire } from '@/lib/perimetre';
import { Field, Input, TextArea } from './ui';

const ETAPES = ['Client et bien', 'Questionnaire', 'Offre', 'Proposition'] as const;

/**
 * Devis avant dossier : présentation de l'entreprise, offre complète, questionnaire
 * pour adapter le prix, puis proposition imprimable. La validation crée le dossier.
 */
export default function DevisClient({ dossiers, id, pisteId, onSave, onValidate, onPrint, onClose }: {
  dossiers: Dossier[]; id?: string; pisteId?: string; onSave: (d: Dossier) => void; onValidate: (d: Dossier, autres: Dossier[]) => void;
  onPrint: (node: React.ReactNode, titre: string) => void; onClose: () => void;
}) {
  const { lib, setLib } = useLibrary();
  const existant = dossiers.find((d) => d.id === id);
  const [d, setD] = useState<Dossier>(() => existant ?? (() => {
    const n = newDossier('avis', dossiers);
    const piste = lib.pistes.find((p) => p.id === pisteId);
    const client = piste ? { ...n.meta.client, nom: piste.nom, email: piste.email, telephone: piste.telephone } : n.meta.client;
    const bien = piste ? { ...n.meta.bien, commune: piste.ville } : n.meta.bien;
    return { ...n, prospect: true, meta: { ...n.meta, client: { ...client, type: 'particulier' as const }, bien, dateVisite: '' }, commercial: { questionnaire: { ...QUESTIONNAIRE_VIDE, notes: piste?.notes ?? '', besoin: '' }, devis: [], factures: [] } };
  })());
  const [etape, setEtape] = useState(existant?.commercial?.devis.length ? 3 : 0);
  const q: Questionnaire = { ...QUESTIONNAIRE_VIDE, ...(d.commercial?.questionnaire ?? {}) };
  const devis = d.commercial?.devis[0];
  const [choix, setChoix] = useState<string[]>(() => {
    const deja = lib.prestations.filter((p) => devis?.lignes.some((l) => l.libelle.startsWith(p.libelle))).map((p) => p.id);
    return deja.length ? deja : ['avis'];
  });
  const toggleChoix = (pid: string) => setChoix(choix.includes(pid) ? choix.filter((x) => x !== pid) : [...choix, pid]);
  const selection = lib.prestations.filter((p) => choix.includes(p.id));
  const ORDRE = ['avis', 'diagnostic', 'conseil', 'accompagnement'];
  const principale = [...selection].sort((a, b) => ORDRE.indexOf(a.type) - ORDRE.indexOf(b.type))[0];
  const particulier = (d.meta.client.type ?? 'particulier') === 'particulier';
  const [opts, setOpts] = useState<Record<string, number>>({});

  // Enregistrement automatique dès qu'un client ou une adresse est saisi
  const first = useRef(true);
  const pisteLiee = useRef(false);
  useEffect(() => {
    if (first.current) { first.current = false; if (!existant) return; }
    if (d.meta.client.nom.trim() || d.meta.bien.adresse.trim()) {
      onSave(d);
      if (pisteId && !pisteLiee.current) { pisteLiee.current = true; setLib({ ...lib, pistes: lib.pistes.map((p) => (p.id === pisteId ? { ...p, statut: 'devis', dossierId: d.id } : p)) }); }
    }
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMeta = (patch: Partial<Dossier['meta']>) => setD({ ...d, meta: { ...d.meta, ...patch } });
  const setClient = (patch: Partial<Dossier['meta']['client']>) => setMeta({ client: { ...d.meta.client, ...patch } });
  const setBien = (patch: Partial<Dossier['meta']['bien']>) => setMeta({ bien: { ...d.meta.bien, ...patch } });
  const setQ = (patch: Partial<Questionnaire>) => setD({ ...d, commercial: { devis: [], factures: [], ...d.commercial, questionnaire: { ...q, ...patch } } });
  const setDevis = (dv: Devis) => setD({ ...d, commercial: { factures: [], ...d.commercial, questionnaire: q, devis: [dv, ...(d.commercial?.devis.slice(1) ?? [])] } });

  const suggestions = useMemo(() => lib.prestations.map((p) => ({ p, s: prixSuggere(p, q) })), [lib.prestations, q]);
  const kmSup = Math.max(0, (q.distanceKm ?? 0) - lib.entreprise.rayonKm) * 2;

  function genererDevis() {
    if (!principale) return;
    const lignes: LigneCommerciale[] = selection.map((p) => {
      const sp = suggestions.find((x) => x.p.id === p.id)!;
      return { id: uid(), libelle: `${p.libelle} — ${p.detail}`, quantite: 1, unite: p.unite, puHT: sp.s.prix };
    });
    for (const o of lib.options) {
      const n = o.id === 'km' ? (opts.km ?? kmSup) : opts[o.id];
      if (n && n > 0) lignes.push({ id: uid(), libelle: `${o.libelle} — ${o.detail}`, quantite: n, unite: o.unite, puHT: o.prixConseille });
    }
    const autres = dossiers.concat(d);
    const notes = '';
    setDevis({ id: devis?.id ?? uid(), numero: devis?.numero || nextNumeroDoc(autres, 'DEV'), date: today(), validiteJours: 30, lignes, statut: devis?.statut ?? 'brouillon', acomptePct: particulier ? 30 : devis?.acomptePct ?? 30, notes: devis?.notes || notes });
    setD((cur) => ({ ...cur, type: principale.type, meta: { ...cur.meta, titreMission: DELIVERABLES[principale.type].titre, objetMission: DEFAULT_MISSION[principale.type].objet } }));
    setEtape(3);
  }

  function valider() {
    const dv = devis ? { ...devis, statut: 'accepte' as StatutDevis } : undefined;
    const type = principale?.type ?? d.type;
    const base0: Dossier = {
      ...d, prospect: false, type, affaireId: d.id,
      meta: { ...d.meta, titreMission: DELIVERABLES[type].titre, objetMission: d.meta.objetMission || DEFAULT_MISSION[type].objet, dateVisite: d.meta.dateVisite },
      commercial: { factures: [], ...d.commercial, questionnaire: q, devis: dv ? [dv, ...(d.commercial?.devis.slice(1) ?? [])] : (d.commercial?.devis ?? []) },
    };
    const final = appliquerQuestionnaire(base0, q).d; // la rédaction reprend les réponses du questionnaire
    // Une mission de plus sur le même devis = un dossier lié (même bien, même affaire)
    const types = Array.from(new Set(selection.map((p) => p.type))).filter((t) => t !== type);
    const all = [...dossiers, final];
    const autres: Dossier[] = types.map((t) => {
      const n = newDossier(t, all);
      all.push(n);
      return { ...n, affaireId: d.id, meta: { ...n.meta, client: d.meta.client, bien: d.meta.bien, titreMission: DELIVERABLES[t].titre, objetMission: DEFAULT_MISSION[t].objet }, commercial: { devis: [], factures: [], notes: `Mission prévue au devis ${devis?.numero ?? ''} (dossier ${final.numero}).` } };
    });
    const contacts = d.meta.client.nom.trim() && !lib.contacts.some((c) => c.nom === d.meta.client.nom)
      ? [...lib.contacts, { ...contactVide('client'), nom: d.meta.client.nom, email: d.meta.client.email, telephone: d.meta.client.telephone, adresse: d.meta.bien.adresse, codePostal: d.meta.bien.codePostal, ville: d.meta.bien.commune }]
      : lib.contacts;
    setLib({ ...lib, contacts, pistes: lib.pistes.map((p) => (p.dossierId === d.id || p.id === pisteId ? { ...p, statut: 'gagne', dossierId: final.id } : p)) });
    onValidate(final, autres);
  }

  const clients = lib.contacts.filter((c) => c.categorie === 'client');
  const [cherche, setCherche] = useState(false);
  const nq = d.meta.client.nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const trouves = nq.length < 2 ? [] : lib.contacts.filter((c) => [c.nom, c.societe, c.email, c.ville].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(nq)).slice(0, 6);
  const prendreContact = (c: (typeof lib.contacts)[number]) => {
    setMeta({ client: { ...d.meta.client, nom: c.nom || c.societe, email: c.email, telephone: c.telephone, adresse: [c.adresse, c.codePostal, c.ville].filter(Boolean).join(' '), type: c.categorie === 'client' ? d.meta.client.type : 'professionnel' } });
    setCherche(false);
  };
  const t = devis ? totaux(devis.lignes, lib.entreprise) : null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-5 py-7">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-quiet text-[13px]" onClick={onClose}>← Retour</button>
          <h1 className="flex-1 font-serif text-[30px] font-semibold text-foret">{d.meta.client.nom ? `Devis — ${d.meta.client.nom}` : 'Nouveau devis client'}</h1>
          <span className="text-[12px] text-charbon/55">{d.meta.client.nom || d.meta.bien.adresse ? 'Enregistré automatiquement dans « Devis en préparation »' : ''}</span>
        </div>
        <ol className="mb-6 flex flex-wrap gap-1">
          {ETAPES.map((e, i) => (
            <li key={e}><button type="button" onClick={() => setEtape(i)} className={`min-h-[36px] rounded-full px-4 text-[13px] ${etape === i ? 'bg-foret text-ivoire' : 'border border-pierre bg-white text-charbon/70'}`}>{i + 1}. {e}</button></li>
          ))}
        </ol>

        {etape === 0 && (
          <div className="card space-y-4 p-5">
            {clients.length > 0 && (
              <select value="" onChange={(e) => { const c = clients.find((x) => x.id === e.target.value); if (c) setMeta({ client: { ...d.meta.client, nom: c.nom || c.societe, email: c.email, telephone: c.telephone, adresse: [c.adresse, c.codePostal, c.ville].filter(Boolean).join(' ') } }); }} className="field w-auto">
                <option value="">Client déjà connu : choisir dans mes contacts…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.nom || c.societe}{c.ville ? ` — ${c.ville}` : ''}</option>)}
              </select>
            )}
            <Choix label="Type de client" value={d.meta.client.type ?? 'particulier'} options={{ particulier: 'Particulier', professionnel: 'Professionnel ou collectivité' }} onChange={(v) => setClient({ type: v })} />
            {particulier && <p className="-mt-2 text-[12px] text-charbon/60">Particulier : acompte à régler avant la visite, délai de rétractation de 14 jours indiqué sur le devis.</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <Field label="Client" hint="recherche dans vos contacts"><Input value={d.meta.client.nom} onChange={(e) => { setClient({ nom: e.target.value }); setCherche(true); }} onBlur={() => setTimeout(() => setCherche(false), 200)} autoFocus autoComplete="off" /></Field>
                {cherche && trouves.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-pierre bg-white shadow-lg">
                    {trouves.map((c) => (
                      <li key={c.id}><button type="button" className="block w-full px-3 py-2 text-left text-[13px] hover:bg-ivoire" onMouseDown={(e) => { e.preventDefault(); prendreContact(c); }}>
                        <b>{c.nom || c.societe}</b>{c.societe && c.nom ? ` · ${c.societe}` : ''}<span className="block text-[11px] text-charbon/55">{CATEGORIES_CONTACT[c.categorie]}{c.ville ? ` · ${c.ville}` : ''}{c.telephone ? ` · ${c.telephone}` : ''}</span>
                      </button></li>
                    ))}
                  </ul>
                )}
              </div>
              <Field label="Qualité"><Input value={d.meta.client.qualite} onChange={(e) => setClient({ qualite: e.target.value })} /></Field>
              <Field label="E-mail"><Input type="email" value={d.meta.client.email} onChange={(e) => setClient({ email: e.target.value })} /></Field>
              <Field label="Téléphone"><Input type="tel" value={d.meta.client.telephone} onChange={(e) => setClient({ telephone: e.target.value })} /></Field>
            </div>
            <Field label="Adresse du bien"><Input value={d.meta.bien.adresse} onChange={(e) => setBien({ adresse: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
              <Field label="Code postal"><Input value={d.meta.bien.codePostal} onChange={(e) => setBien({ codePostal: e.target.value })} /></Field>
              <Field label="Commune"><Input value={d.meta.bien.commune} onChange={(e) => setBien({ commune: e.target.value })} /></Field>
            </div>
            <button type="button" className="btn-primary" onClick={() => setEtape(1)}>Questionnaire →</button>
          </div>
        )}

        {etape === 1 && (
          <div className="card space-y-5 p-5">
            <p className="text-[13px] text-charbon/65">Ces réponses ajustent le prix proposé ; elles rempliront aussi la rédaction du dossier.</p>
            <QuestionnaireForm value={q} onChange={(nq) => setQ(nq)} rayonKm={lib.entreprise.rayonKm} />
            <button type="button" className="btn-primary" onClick={() => setEtape(2)}>Choisir l’offre →</button>
          </div>
        )}

        {etape === 2 && (
          <div className="space-y-5">
            <p className="text-[13px] text-charbon/65">Cochez une ou plusieurs offres : elles figureront toutes sur le même devis. Chaque mission supplémentaire créera un dossier lié au même bien lors de la validation.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.map(({ p, s }) => (
                <button key={p.id} type="button" onClick={() => toggleChoix(p.id)} className={`card p-4 text-left ${choix.includes(p.id) ? 'border-foret ring-2 ring-foret/20' : 'hover:border-sauge'}`}>
                  <p className="flex items-center gap-2 font-label text-[11px] font-semibold text-terre"><span className={`grid h-4 w-4 place-items-center rounded border ${choix.includes(p.id) ? 'border-foret bg-foret text-[10px] text-white' : 'border-pierre'}`}>{choix.includes(p.id) ? '✓' : ''}</span>{DELIVERABLES[p.type].num}</p>
                  <p className="font-serif text-lg font-semibold leading-tight text-foret">{p.libelle}</p>
                  <p className="mt-1 text-[12px] text-charbon/65">{p.detail}</p>
                  <p className="mt-2 text-[14px]"><b className="tabular-nums">{eur(s.prix)}</b> <span className="text-[12px] text-charbon/55">proposé (fourchette {eur(p.prixBas)} à {eur(p.prixHaut)})</span></p>
                </button>
              ))}
            </div>
            <div className="card p-4">
              <p className="label-caps mb-2">Options</p>
              <div className="space-y-2">
                {lib.options.map((o) => {
                  const val = o.id === 'km' ? (opts.km ?? kmSup) : opts[o.id] ?? 0;
                  return (
                    <div key={o.id} className="flex flex-wrap items-center gap-3 text-[14px]">
                      <input inputMode="decimal" value={val || ''} onChange={(e) => setOpts({ ...opts, [o.id]: Number(e.target.value.replace(',', '.')) || 0 })} className="field w-20 py-1.5" placeholder="0" aria-label={`Quantité ${o.libelle}`} />
                      <span className="w-16 text-[12px] text-charbon/55">{o.unite}</span>
                      <span className="flex-1"><b>{o.libelle}</b> <span className="text-[12px] text-charbon/60">— {o.detail}</span></span>
                      <span className="tabular-nums text-[13px]">{eur(o.prixConseille)} / {o.unite}</span>
                    </div>
                  );
                })}
              </div>
              {kmSup > 0 && <p className="mt-2 text-[12px] text-charbon/55">Déplacement : {kmSup} km facturés (aller-retour au-delà des {lib.entreprise.rayonKm} km inclus).</p>}
              {(q.etat === 'degrade' || q.etat === 'ruine') && <p className="mt-1 text-[12px] text-terre">Bâtiment dégradé : pensez aux sondages destructifs et aux plans de situation.</p>}
            </div>
            <button type="button" className="btn-primary" disabled={!selection.length} onClick={genererDevis}>{devis ? 'Mettre à jour le devis' : 'Établir le devis'} ({selection.length} offre{selection.length > 1 ? 's' : ''}) →</button>
          </div>
        )}

        {etape === 3 && (
          devis ? (
            <div className="space-y-5">
              <div className="card p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foret">{devis.numero}</span>
                  <span className="text-[13px] text-charbon/55">{DELIVERABLES[d.type].titre}</span>
                  <select value={devis.statut} onChange={(e) => setDevis({ ...devis, statut: e.target.value as StatutDevis })} className="field ml-auto w-auto py-1.5 text-[13px]">
                    <option value="brouillon">Brouillon</option><option value="envoye">Envoyé au client</option><option value="accepte">Accepté</option><option value="refuse">Refusé</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {devis.lignes.map((l) => (
                    <div key={l.id} className="grid items-start gap-2 sm:grid-cols-[1fr_70px_110px_auto]">
                      <TextArea rows={1} value={l.libelle} onChange={(v) => setDevis({ ...devis, lignes: devis.lignes.map((x) => (x.id === l.id ? { ...x, libelle: v } : x)) })} className="py-1.5 text-[13px]" />
                      <input inputMode="decimal" value={l.quantite} onChange={(e) => setDevis({ ...devis, lignes: devis.lignes.map((x) => (x.id === l.id ? { ...x, quantite: Number(e.target.value.replace(',', '.')) || 0 } : x)) })} className="field py-1.5 text-[13px]" aria-label="Quantité" />
                      <input inputMode="decimal" value={l.puHT} onChange={(e) => setDevis({ ...devis, lignes: devis.lignes.map((x) => (x.id === l.id ? { ...x, puHT: Number(e.target.value.replace(',', '.')) || 0 } : x)) })} className="field py-1.5 text-right text-[13px]" aria-label="Prix unitaire" />
                      <button type="button" className="px-2 pt-2 text-terre" onClick={() => setDevis({ ...devis, lignes: devis.lignes.filter((x) => x.id !== l.id) })}>×</button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn-quiet text-[13px]" onClick={() => setDevis({ ...devis, lignes: [...devis.lignes, { id: uid(), libelle: '', quantite: 1, unite: 'forfait', puHT: 0 }] })}>+ Ligne libre</button>
                    <Remise lignes={devis.lignes} onChange={(lignes) => setDevis({ ...devis, lignes })} />
                  </div>
                </div>
                {t && <p className="mt-3 text-right text-[15px]">Total hors taxes <b className="tabular-nums">{eur(t.ht)}</b>{lib.entreprise.regimeTva === 'assujetti' && <> · toutes taxes comprises <b>{eur(t.ttc)}</b></>}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => onPrint(<PropositionDoc dossier={d} ent={lib.entreprise} prestations={lib.prestations} options={lib.options} devis={devis} />, `Proposition ${devis.numero} — ${d.meta.client.nom}`)}>Imprimer la proposition complète (PDF)</button>
                <button type="button" className="btn-ghost" onClick={() => { setDevis({ ...devis, statut: devis.statut === 'brouillon' ? 'envoye' : devis.statut }); onSave({ ...d, commercial: { factures: [], ...d.commercial, devis: [{ ...devis, statut: devis.statut === 'brouillon' ? 'envoye' : devis.statut }] } }); }}>Marquer comme envoyé</button>
                <span className="flex-1" />
                <button type="button" className="btn-ghost text-terre" onClick={() => { onSave({ ...d, archive: true, commercial: { factures: [], ...d.commercial, devis: [{ ...devis, statut: 'refuse' }] } }); onClose(); }}>Refusé : archiver</button>
                <button type="button" className="btn-primary bg-sauge" onClick={valider}>Devis accepté : créer {Array.from(new Set(selection.map((p) => p.type))).length > 1 ? 'les dossiers' : 'le dossier'} →</button>
              </div>
              <p className="text-[12px] text-charbon/55">La proposition contient la présentation de l’entreprise, le récapitulatif des besoins, l’offre complète (la mission proposée est mise en avant) et le devis.</p>
            </div>
          ) : <div className="card p-6"><p>Établissez d’abord le devis à l’étape Offre.</p><button type="button" className="btn-primary mt-3" onClick={() => setEtape(2)}>Aller à l’offre</button></div>
        )}
      </div>
    </div>
  );
}

export type { Prestation };
