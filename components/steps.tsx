'use client';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_MISSION, DELIVERABLES, MESURE_CATEGORIES, PHASES, PRIORITY, ZONE_CATEGORIES } from '@/lib/constants';
import { fmtDate, sortDesordres } from '@/lib/calc';
import { newDesordre, uid } from '@/lib/factory';
import { fetchPublicData, type PublicData } from '@/lib/publicData';
import { CARTES, fetchCartes, fetchParcelle, fetchRisques, fmtGps, geocodePoint, lienCarte, liensCartes, parseGps, type CarteDef } from '@/lib/maps';
import type { Dossier, MesureCategorie, Priority, Souhait, Zone, ZoneCategory } from '@/lib/types';
import FicheDesordreEditor from './FicheDesordreEditor';
import { useLibrary } from './LibraryProvider';
import PhraseField from './PhraseField';
import SynthesisTable from './SynthesisTable';
import VisitImport from './VisitImport';
import { copierDansPressePapier, fichesJumelles } from '@/lib/pressePapier';
import PhotosClassement, { mapToutesPhotos, appliquerFiche, dupliquerFiche, supprimerFiche, toutesLesPhotos } from './PhotosClassement';
import { AdresseAuto, GuidesChoix, LiensMeteo, LiensVueEnsemble, PerimetreChoix, PlansZonesEditor, QuestionnaireProjet } from './steps2';
import { reordonnerZones } from '@/lib/zones';
import { completerFiche, ficheApprenable, ficheDiffere, ficheVersModele, modeleDe, suggestions } from '@/lib/fiches';
import { adresseContact, distanceKm, localiserContacts } from '@/lib/geo';
import { CATEGORIES_CONTACT, contactVide } from '@/lib/business';
import { Combo, Field, Input, PhotoDrop, PriorityBadge, SectionTitle, Select, TextArea } from './ui';

export interface StepProps { dossier: Dossier; update: (d: Dossier) => void }

const grid2 = 'grid gap-4 sm:grid-cols-2';
const today = () => new Date().toISOString().slice(0, 10);

/* ───────────── 1. Projet ───────────── */
export interface Affaire { missions: Dossier[]; onOpen: (id: string) => void; onNew: (type: Dossier['type'], reprendre: boolean) => void }

export function StepProjet({ dossier, update, affaire }: StepProps & { affaire?: Affaire }) {
  const m = dossier.meta;
  const setMeta = (patch: Partial<Dossier['meta']>) => update({ ...dossier, meta: { ...m, ...patch } });
  const setClient = (k: keyof Dossier['meta']['client'], v: string) => setMeta({ client: { ...m.client, [k]: v } });
  const setBien = (k: keyof Dossier['meta']['bien'], v: string) => setMeta({ bien: { ...m.bien, [k]: v } });

  /** Changer de livrable met à jour le titre et l'objet s'ils n'ont pas été personnalisés. */
  function changeType(type: Dossier['type']) {
    const old = DEFAULT_MISSION[dossier.type];
    const next = DEFAULT_MISSION[type];
    update({
      ...dossier,
      type,
      meta: {
        ...m,
        titreMission: DELIVERABLES[type].titre, // le titre de la mission est le type de livrable
        objetMission: !m.objetMission.trim() || m.objetMission === old.objet ? next.objet : m.objetMission,
      },
    });
  }

  const { lib, setLib } = useLibrary();
  const clients = lib.contacts.filter((c) => c.categorie === 'client');
  const [nouvelle, setNouvelle] = useState<{ type: Dossier['type']; reprendre: boolean } | null>(null);
  const enregistrerClient = () => {
    const c = { ...contactVide('client'), nom: m.client.nom, email: m.client.email, telephone: m.client.telephone, adresse: m.client.adresse || m.bien.adresse, codePostal: m.bien.codePostal, ville: m.bien.commune, notes: m.client.qualite };
    setLib({ ...lib, contacts: [...lib.contacts, c] });
  };
  const employes = lib.employes.length ? lib.employes : [{ id: 'x', nom: m.intervenant || 'Lorine Gratadour', fonction: '' }];
  const setRendu = (v: string) => update({ ...dossier, commercial: { devis: [], factures: [], ...dossier.commercial, dateRendu: v } });
  const objetIsDefault = m.objetMission === DEFAULT_MISSION[dossier.type].objet;

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow={`${dossier.numero} · ${DELIVERABLES[dossier.type].court}`} title="Le projet" />
      <QuestionnaireProjet dossier={dossier} update={update} />
      <div className="card space-y-4 p-5">
        <Field label="Mission (type de livrable)" hint="devient le titre du rapport">
          <Select value={dossier.type} onChange={changeType} options={(Object.keys(DELIVERABLES) as Dossier['type'][]).map((t) => ({ value: t, label: `${DELIVERABLES[t].num} — ${DELIVERABLES[t].titre}` }))} />
        </Field>
        <PhraseField phraseKey="objetMission" label="Objet de la mission" hint={objetIsDefault ? 'proposé selon le livrable' : undefined} value={m.objetMission} onChange={(v) => setMeta({ objetMission: v })} rows={4} />
        <PerimetreChoix dossier={dossier} update={update} />
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <div>
            <PhotoDrop title="Couverture — vue d’ensemble de l’édifice" hint="Photo de l’édifice entier, prise avec du recul" photo={m.photoCouverture} onChange={(p) => setMeta({ photoCouverture: p })} choix={toutesLesPhotos(dossier)} />
            <LiensVueEnsemble dossier={dossier} />
          </div>
          <Field label="Indice de révision"><Input value={dossier.version} onChange={(e) => update({ ...dossier, version: e.target.value })} /></Field>
        </div>
      </div>

      {affaire && (
        <div className="card p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-serif text-lg font-semibold text-foret">Missions pour ce bien</p>
            <button type="button" className="btn-ghost" onClick={() => setNouvelle({ type: dossier.type === 'avis' ? 'diagnostic' : 'accompagnement', reprendre: true })}>Nouvelle mission pour ce bien</button>
          </div>
          <ul className="space-y-1 text-[14px]">
            {affaire.missions.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-2 border-b border-pierre-50 py-1.5">
                <span className="font-medium">{DELIVERABLES[x.type].num} — {DELIVERABLES[x.type].titre}</span>
                <span className="text-[12px] text-charbon/55">{x.numero} · {fmtDate(x.meta.dateVisite || x.createdAt.slice(0, 10))}{x.archive ? ' · archivé' : ''}{x.prospect ? ' · devis en préparation' : ''}</span>
                {x.id === dossier.id ? <span className="ml-auto text-[12px] text-sauge">dossier ouvert</span> : <button type="button" className="btn-quiet ml-auto text-[13px]" onClick={() => affaire.onOpen(x.id)}>Ouvrir →</button>}
              </li>
            ))}
          </ul>
          {nouvelle && (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-md bg-ivoire p-3">
              <Field label="Mission">
                <select value={nouvelle.type} onChange={(e) => setNouvelle({ ...nouvelle, type: e.target.value as Dossier['type'] })} className="field w-auto">
                  {(Object.keys(DELIVERABLES) as Dossier['type'][]).map((t) => <option key={t} value={t}>{DELIVERABLES[t].num} — {DELIVERABLES[t].titre}</option>)}
                </select>
              </Field>
              <label className="flex items-center gap-2 pb-2 text-[13px]"><input type="checkbox" checked={nouvelle.reprendre} onChange={(e) => setNouvelle({ ...nouvelle, reprendre: e.target.checked })} /> Reprendre les désordres déjà relevés (à relire)</label>
              <button type="button" className="btn-primary" onClick={() => { affaire.onNew(nouvelle.type, nouvelle.reprendre); setNouvelle(null); }}>Créer la mission</button>
              <button type="button" className="btn-quiet" onClick={() => setNouvelle(null)}>Annuler</button>
              <p className="w-full text-[12px] text-charbon/55">Le client, le bien, le contexte, les zones, les photos et le classeur sont repris. Ce dossier reste consultable dans les archives de l’affaire.</p>
            </div>
          )}
        </div>
      )}

      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-serif text-lg font-semibold text-foret">Client et bien</p>
          <div className="flex flex-wrap gap-2">
            {clients.length > 0 && (
              <select value="" onChange={(e) => { const c = clients.find((x) => x.id === e.target.value); if (c) setMeta({ client: { ...m.client, nom: c.nom || c.societe, email: c.email, telephone: c.telephone, adresse: [c.adresse, c.codePostal, c.ville].filter(Boolean).join(' ') } }); }} className="field w-auto py-1.5 text-[13px]">
                <option value="">Choisir dans mes contacts…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.nom || c.societe}{c.ville ? ` — ${c.ville}` : ''}</option>)}
              </select>
            )}
            {m.client.nom.trim() && !lib.contacts.some((c) => c.nom === m.client.nom) && <button type="button" className="btn-quiet text-[13px]" onClick={enregistrerClient}>+ Enregistrer dans {CATEGORIES_CONTACT.client.toLowerCase()}</button>}
          </div>
        </div>
        <div className={grid2}>
          <Field label="Client"><Input value={m.client.nom} onChange={(e) => setClient('nom', e.target.value)} placeholder="Nom ou raison sociale" /></Field>
          <Field label="Type de client" hint="particulier : acompte avant la visite">
            <select value={m.client.type ?? 'particulier'} onChange={(e) => setMeta({ client: { ...m.client, type: e.target.value as 'particulier' | 'professionnel' } })} className="field">
              <option value="particulier">Particulier</option><option value="professionnel">Professionnel ou collectivité</option>
            </select>
          </Field>
          <Field label="Qualité"><Combo value={m.client.qualite} onChange={(v) => setClient('qualite', v)} options={['Propriétaire', 'Propriétaires', 'Société civile immobilière', 'Syndic de copropriété', 'Architecte', 'Notaire', 'Futur acquéreur']} /></Field>
          <Field label="E-mail"><Input type="email" value={m.client.email} onChange={(e) => setClient('email', e.target.value)} /></Field>
          <Field label="Téléphone"><Input type="tel" value={m.client.telephone} onChange={(e) => setClient('telephone', e.target.value)} /></Field>
        </div>
        <Field label="Adresse du bien"><Input value={m.bien.adresse} onChange={(e) => setBien('adresse', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <Field label="Code postal"><Input inputMode="numeric" value={m.bien.codePostal} onChange={(e) => setBien('codePostal', e.target.value)} /></Field>
          <Field label="Commune"><Input value={m.bien.commune} onChange={(e) => setBien('commune', e.target.value)} /></Field>
        </div>
        <AdresseAuto dossier={dossier} update={update} />
        <div className={grid2}>
          <Field label="Références cadastrales"><Input value={m.bien.cadastre} onChange={(e) => setBien('cadastre', e.target.value)} placeholder="Section AB numéro 000" /></Field>
          <Field label="Urbanisme et protection"><TextArea rows={1} value={m.bien.plu} onChange={(v) => setBien('plu', v)} placeholder="Zone du plan local d’urbanisme, site patrimonial…" /></Field>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <p className="font-serif text-lg font-semibold text-foret">Visite</p>
        <div className={grid2}>
          <Field label="Date de la première visite"><Input type="date" value={m.dateVisite} onChange={(e) => setMeta({ dateVisite: e.target.value })} /></Field>
          <Field label="Date du rapport" hint={m.dateRapportFixe ? 'fixée à la main' : 'mise à jour à chaque modification'}>
            <div className="flex gap-2">
              <Input type="date" value={m.dateRapport} onChange={(e) => setMeta({ dateRapport: e.target.value, dateRapportFixe: true })} />
              {m.dateRapportFixe && <button type="button" className="btn-quiet whitespace-nowrap text-[12px]" onClick={() => setMeta({ dateRapport: today(), dateRapportFixe: false })}>Date du jour</button>}
            </div>
          </Field>
          <Field label="Intervenant" hint="employés de l’entreprise (Bibliothèque › Mon entreprise)">
            <select value={m.intervenant} onChange={(e) => setMeta({ intervenant: e.target.value })} className="field">
              {!employes.some((e) => e.nom === m.intervenant) && <option value={m.intervenant}>{m.intervenant || 'Choisir…'}</option>}
              {employes.map((e) => <option key={e.id} value={e.nom}>{e.nom}{e.fonction ? ` — ${e.fonction}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Date de rendu prévue" hint="apparaît dans l’agenda"><Input type="date" value={dossier.commercial?.dateRendu ?? ''} onChange={(e) => setRendu(e.target.value)} /></Field>
        </div>
        <PhraseField phraseKey="personnesPresentes" label="Personnes présentes" mode="append" multiline={false} value={m.personnesPresentes} onChange={(v) => setMeta({ personnesPresentes: v.replace(/\. /g, ', ') })} />
        {(dossier.visites?.length ?? 0) > 0 && (
          <p className="text-[13px] text-charbon/65">Visites enregistrées : {dossier.visites!.map((v) => `${v.libelle} (${fmtDate(v.date)})`).join(' · ')}</p>
        )}
        <PhraseField phraseKey="conditionsAcces" label="Conditions d’accès" rows={2} value={m.conditionsAcces} onChange={(v) => setMeta({ conditionsAcces: v })} />
        <div>
          <PhraseField phraseKey="meteo" label="Météo le jour de la visite" mode="append" multiline={false} value={m.meteo} onChange={(v) => setMeta({ meteo: v })} placeholder="Choisissez dans la liste puis complétez (température…)" />
          <LiensMeteo commune={m.bien.commune} date={m.dateVisite} />
        </div>
        <PhraseField phraseKey="limitesVisite" label="Limites de la visite" hint="parties non visibles" rows={2} value={m.limitesVisite} onChange={(v) => setMeta({ limitesVisite: v })} />
      </div>
    </div>
  );
}

/* ───────────── 2. Contexte ───────────── */
export function StepContexte({ dossier, update }: StepProps) {
  const c = dossier.contexte;
  const set = (patch: Partial<Dossier['contexte']>) => update({ ...dossier, contexte: { ...c, ...patch } });
  const setSouhaits = (souhaits: Souhait[]) => update({ ...dossier, souhaits });
  const { phrases } = useLibrary();
  const avis = dossier.type === 'avis';
  const [lookup, setLookup] = useState<{ state: 'idle' | 'busy' | 'done' | 'error'; msg?: string; data?: PublicData }>({ state: 'idle' });
  const adresse = [dossier.meta.bien.adresse, dossier.meta.bien.codePostal, dossier.meta.bien.commune].filter(Boolean).join(' ');

  async function runLookup() {
    if (!adresse.trim()) { setLookup({ state: 'error', msg: 'Renseignez d’abord l’adresse du bien (étape Projet).' }); return; }
    setLookup({ state: 'busy' });
    try {
      const data = await fetchPublicData(adresse);
      // On ne remplit que les champs vides : rien de ce que vous avez saisi n'est écrasé
      const patch: Partial<Dossier['contexte']> = {};
      if (data.datation && !c.datation.trim()) patch.datation = data.datation;
      if (data.typologie && !c.typologie.trim()) patch.typologie = data.typologie;
      if (data.materiaux && !c.materiaux.trim()) patch.materiaux = data.materiaux;
      if (data.argiles && !c.geotechnique.trim()) patch.geotechnique = data.argiles;
      const meta = data.patrimoine && !dossier.meta.bien.plu.trim() ? { ...dossier.meta, bien: { ...dossier.meta.bien, plu: data.patrimoine } } : dossier.meta;
      update({ ...dossier, meta, contexte: { ...c, ...patch } });
      setLookup({ state: 'done', data, msg: data.champs ? `${Object.keys(patch).length + (meta !== dossier.meta ? 1 : 0)} champ(s) vide(s) complété(s) à partir des données publiques pour « ${data.adresse} ». À vérifier sur place.` : 'Bâtiment trouvé, mais sans information exploitable.' });
    } catch (e) {
      setLookup({ state: 'error', msg: (e as Error).message });
    }
  }

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Bâti et historique" title="Contexte du bâti" />
      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-ivoire p-3">
          <p className="max-w-md text-[13px] text-charbon/70">Proposer la datation, la typologie et les matériaux à partir de l’adresse (Base Adresse Nationale et base nationale des bâtiments, gratuites).</p>
          <button type="button" className="btn-ghost" disabled={lookup.state === 'busy'} onClick={runLookup}>{lookup.state === 'busy' ? 'Recherche…' : 'Proposer à partir des données publiques'}</button>
          {lookup.msg && <p className={`w-full text-[13px] ${lookup.state === 'error' ? 'text-terre' : 'text-sauge'}`}>{lookup.msg}</p>}
        </div>
        <PhraseField phraseKey="datation" label="Datation estimée" mode="replace" multiline={false} value={c.datation} onChange={(v) => set({ datation: v })} />
        <PhraseField phraseKey="typologie" label="Typologie" mode="replace" multiline={false} value={c.typologie} onChange={(v) => set({ typologie: v })} />
        {avis && <p className="rounded-md bg-sauge-50 p-3 text-[13px] text-charbon/75">Avis sanitaire : contexte allégé. Seuls la datation, la typologie, l’historique et un plan historique figurent dans le rapport.</p>}
        {!avis && <PhraseField phraseKey="systemeConstructif" label="Système constructif" rows={2} value={c.systemeConstructif} onChange={(v) => set({ systemeConstructif: v })} />}
        {!avis && <PhraseField phraseKey="materiaux" label="Matériaux dominants" rows={2} value={c.materiaux} onChange={(v) => set({ materiaux: v })} />}
        <Field label="Historique et modifications" hint="d’après les informations données par le client">
          <TextArea value={c.historique} onChange={(v) => set({ historique: v })} placeholder="Travaux connus, extensions, changements d’usage, dates…" />
        </Field>
        {!avis && <PhraseField phraseKey="abords" label="Abords, relief et eaux pluviales" value={c.abords} onChange={(v) => set({ abords: v })} />}
        {!avis && <PhraseField phraseKey="geotechnique" label="Contexte géotechnique" rows={2} value={c.geotechnique} onChange={(v) => set({ geotechnique: v })} />}
        {!avis && <Field label="Risques naturels et technologiques" hint="repris de Géorisques, à compléter">
          <TextArea value={c.risques ?? ''} onChange={(v) => set({ risques: v })} placeholder="Inondation, mouvements de terrain, argiles, radon, sismicité…" />
        </Field>}
        <CartesPanel dossier={dossier} update={update} />
        <div>
          <p className="label-caps mb-2">{avis ? 'Plan historique et plans de situation' : 'Vues parcellaires, cartes anciennes'}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[...c.vues, null].slice(0, 9).map((v, i) => (
              <PhotoDrop key={i} title={`Vue ${i + 1}`} hint="Cadastre, carte, photo aérienne" photo={v}
                onChange={(p) => set({ vues: p ? (i < c.vues.length ? c.vues.map((x, j) => (j === i ? p : x)) : [...c.vues, p]) : c.vues.filter((_, j) => j !== i) })} />
            ))}
          </div>
        </div>
      </div>

      {(dossier.type === 'conseil' || dossier.type === 'accompagnement') && (
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-serif text-lg font-semibold text-foret">Souhaits des propriétaires</p>
            <button type="button" className="btn-ghost" onClick={() => setSouhaits([...dossier.souhaits, { id: uid(), rubrique: 'Usage', besoin: '', importance: 'souhaite' }])}>Ajouter</button>
          </div>
          <div className="space-y-3">
            {dossier.souhaits.length === 0 && <p className="text-sm text-charbon/50">Confort, usage, budget, planning… Ils seront repris dans la synthèse.</p>}
            {dossier.souhaits.map((s) => (
              <div key={s.id} className="grid items-end gap-3 sm:grid-cols-[150px_1fr_150px_auto]">
                <Field label="Rubrique"><Combo value={s.rubrique} onChange={(v) => setSouhaits(dossier.souhaits.map((x) => (x.id === s.id ? { ...x, rubrique: v } : x)))} options={['Confort', 'Usage', 'Budget', 'Planning', 'Patrimoine', 'Énergie']} /></Field>
                <Field label="Besoin"><Combo value={s.besoin} onChange={(v) => setSouhaits(dossier.souhaits.map((x) => (x.id === s.id ? { ...x, besoin: v } : x)))} options={phrases('souhaits')} /></Field>
                <Field label="Importance"><Select value={s.importance} onChange={(v) => setSouhaits(dossier.souhaits.map((x) => (x.id === s.id ? { ...x, importance: v } : x)))} options={[{ value: 'essentiel', label: 'Essentiel' }, { value: 'souhaite', label: 'Souhaité' }, { value: 'optionnel', label: 'Optionnel' }]} /></Field>
                <button type="button" className="btn-quiet text-terre" onClick={() => setSouhaits(dossier.souhaits.filter((x) => x.id !== s.id))} aria-label="Supprimer">×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Plans et cartes automatiques à partir de l'adresse, avec liens Géoportail / Géorisques en secours. */
function CartesPanel({ dossier, update }: StepProps) {
  const b = dossier.meta.bien;
  const c = dossier.contexte;
  const pt = parseGps(b.gps ?? '');
  const [sel, setSel] = useState<string[]>(dossier.type === 'avis' ? ['cadastre', 'etatmajor'] : ['cadastre', 'ortho', 'etatmajor', 'cassini']);
  const [st, setSt] = useState<{ busy?: boolean; msg?: string; err?: boolean; echecs?: CarteDef[]; p?: { lon: number; lat: number } }>({});
  const adresse = [b.adresse, b.codePostal, b.commune].filter(Boolean).join(' ');

  async function run() {
    setSt({ busy: true, msg: 'Localisation de l’adresse…' });
    try {
      let p = pt;
      let label = '';
      if (!p) {
        if (!adresse.trim()) throw new Error('Renseignez d’abord l’adresse du bien (étape Projet).');
        const g = await geocodePoint(adresse);
        if (!g) throw new Error('Adresse introuvable : vérifiez l’adresse et le code postal, ou saisissez les coordonnées GPS.');
        p = g; label = g.label;
      }
      setSt({ busy: true, msg: 'Récupération des plans, cartes et risques…' });
      const [parcelle, res, risques] = await Promise.all([
        fetchParcelle(p).catch(() => null),
        fetchCartes(p, sel),
        fetchRisques(p).catch(() => null),
      ]);
      const cartes = res.photos;
      const ids = new Set(cartes.map((x) => x.id));
      const vues = [...cartes, ...c.vues.filter((v) => !ids.has(v.id))];
      const bien = { ...b, gps: fmtGps(p), cadastre: b.cadastre.trim() || parcelle || b.cadastre };
      update({ ...dossier, meta: { ...dossier.meta, bien }, contexte: { ...c, vues, risques: c.risques?.trim() ? c.risques : risques ?? c.risques } });
      const local = cartes.filter((x) => x.src.startsWith('data:')).length;
      setSt({ p, echecs: res.echecs, err: !cartes.length, msg: `${cartes.length} carte(s) ajoutée(s)${label ? ` pour « ${label} »` : ''}${parcelle ? `, parcelle ${parcelle}` : ''}${risques ? ', risques Géorisques repris' : ''}.${local < cartes.length ? ' Certaines cartes s’affichent directement depuis l’IGN (connexion nécessaire).' : ''}${res.echecs.length ? ` ${res.echecs.length} carte(s) n’ont pas pu être récupérées : ouvrez les liens ci-dessous pour faire la capture.` : ' Vérifiez le cadrage.'}` });
    } catch (e) {
      setSt({ err: true, msg: `${(e as Error).message} Utilisez les liens cartes.gouv.fr et Géorisques ci-dessous.` });
    }
  }

  return (
    <div className="rounded-md border border-pierre-100 bg-ivoire p-3">
      <p className="label-caps mb-2">Plans et cartes automatiques</p>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {CARTES.map((x) => (
          <label key={x.id} className="flex items-center gap-1.5 text-[13px]">
            <input type="checkbox" checked={sel.includes(x.id)} onChange={(e) => setSel(e.target.checked ? [...sel, x.id] : sel.filter((y) => y !== x.id))} />{x.titre}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-52"><Field label="Coordonnées GPS" hint="latitude, longitude"><Input value={b.gps ?? ''} onChange={(e) => update({ ...dossier, meta: { ...dossier.meta, bien: { ...b, gps: e.target.value } } })} placeholder="auto depuis l’adresse" /></Field></div>
        <button type="button" className="btn-primary" disabled={st.busy || !sel.length} onClick={run}>{st.busy ? 'Recherche…' : 'Ajouter cadastre, cartes et risques'}</button>
      </div>
      {st.msg && <p className={`mt-2 text-[13px] ${st.err ? 'text-terre' : 'text-sauge'}`}>{st.msg}</p>}
      {st.echecs && st.p && st.echecs.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-md border border-terre/40 bg-terre-50 p-2 text-[13px]">
          {st.echecs.map((c) => <li key={c.id}><a href={lienCarte(c, st.p!)} target="_blank" rel="noreferrer" className="font-medium text-terre underline">{c.titre} : ouvrir sur cartes.gouv.fr pour faire la capture ↗</a></li>)}
        </ul>
      )}
      {pt && (
        <ul className="mt-3 grid gap-1 text-[13px] sm:grid-cols-2">
          {liensCartes(pt).map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer" className="text-foret underline decoration-pierre underline-offset-2 hover:text-terre">{l.titre} ↗</a></li>)}
        </ul>
      )}
      {!pt && (
        <div className="mt-2 text-[12px] text-charbon/60">
          <p>Dès que l’adresse est localisée, les liens s’ouvrent directement sur le bâtiment. Vous pouvez aussi coller les coordonnées GPS (clic droit sur le bâtiment dans Google Maps ou cartes.gouv.fr).</p>
          <p className="mt-1 flex flex-wrap gap-x-4">
            <a className="text-foret underline" href="https://cartes.gouv.fr/explorer-les-cartes" target="_blank" rel="noreferrer">cartes.gouv.fr ↗</a>
            <a className="text-foret underline" href="https://remonterletemps.ign.fr/" target="_blank" rel="noreferrer">Remonter le temps ↗</a>
            <a className="text-foret underline" href="https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi" target="_blank" rel="noreferrer">Géorisques ↗</a>
            <a className="text-foret underline" href="https://cadastre.data.gouv.fr/" target="_blank" rel="noreferrer">Cadastre ↗</a>
          </p>
        </div>
      )}
    </div>
  );
}

/* ───────────── 3. Zones (définies par l'expert) ───────────── */
export function StepZones({ dossier, update }: StepProps) {
  const setZones = (zones: Zone[]) => update({ ...dossier, zones });
  const order = Object.keys(ZONE_CATEGORIES) as ZoneCategory[];
  const { phrases } = useLibrary();
  const [draft, setDraft] = useState<Record<string, string>>({});

  function addZone(cat: ZoneCategory, preset?: string) {
    const nom = (preset ?? draft[cat] ?? '').trim();
    let n = dossier.zones.filter((z) => z.categorie === cat).length + 1;
    while (dossier.zones.some((z) => z.code === `${cat}-${String(n).padStart(2, '0')}`)) n++;
    setZones([...dossier.zones, { code: `${cat}-${String(n).padStart(2, '0')}`, nom, categorie: cat, observations: '', photos: [] }]);
    setDraft({ ...draft, [cat]: '' });
  }
  const [glisse, setGlisse] = useState<string | null>(null);
  /** Déplace une zone (avant une autre zone, ou à la fin d'une catégorie) puis renumérote les codes. */
  function deplacer(code: string, cat: ZoneCategory, avant?: string) {
    const z = dossier.zones.find((x) => x.code === code);
    if (!z || code === avant) return;
    const reste = dossier.zones.filter((x) => x.code !== code);
    const moved = { ...z, categorie: cat };
    let i = avant ? reste.findIndex((x) => x.code === avant) : -1;
    if (i < 0) { const last = reste.map((x) => x.categorie).lastIndexOf(cat); i = last >= 0 ? last + 1 : reste.length; }
    reste.splice(i, 0, moved);
    update(reordonnerZones(dossier, reste));
  }
  function monter(code: string, sens: -1 | 1) {
    const z = dossier.zones.find((x) => x.code === code)!;
    const list = dossier.zones.filter((x) => x.categorie === z.categorie);
    const k = list.indexOf(z) + sens;
    if (k < 0 || k >= list.length) return;
    if (sens === -1) deplacer(code, z.categorie, list[k].code);
    else deplacer(list[k].code, z.categorie, code);
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="De l’extérieur vers l’intérieur, du bas vers le haut" title="Zones du projet" />
      <p className="-mt-3 text-[14px] text-charbon/65">Créez les zones propres à ce bâtiment ; nommez les façades par leur orientation ou leur emplacement (le mode constructif se décrit dans les observations). Glissez une zone (⠿) ou utilisez ▲ ▼ pour changer l’ordre : les codes sont renumérotés et les photos et fiches suivent.</p>
      {order.map((cat) => {
        const list = dossier.zones.filter((z) => z.categorie === cat);
        return (
          <div key={cat} className={`card p-5 ${glisse ? 'outline-dashed outline-1 outline-pierre' : ''}`}
            onDragOver={(e) => { if (glisse) e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); if (glisse) { deplacer(glisse, cat); setGlisse(null); } }}>
            <p className="mb-3 font-serif text-lg font-semibold text-foret">{ZONE_CATEGORIES[cat]}</p>
            <div className="space-y-4">
              {list.map((z) => {
                const count = dossier.desordres.filter((d) => d.zoneCode === z.code).length;
                return (
                  <div key={z.code} className={`rounded-md border p-3 ${glisse === z.code ? 'border-sauge opacity-60' : 'border-pierre-100'}`}
                    onDragOver={(e) => { if (glisse && glisse !== z.code) e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (glisse) { deplacer(glisse, cat, z.code); setGlisse(null); } }}>
                    <div className="grid items-end gap-3 sm:grid-cols-[auto_1fr_auto]">
                      <div className="flex items-center gap-1.5 pb-1.5">
                        <span draggable onDragStart={(e) => { setGlisse(z.code); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', z.code); }} onDragEnd={() => setGlisse(null)} className="cursor-grab select-none text-[18px] text-charbon/35" title="Glisser pour déplacer la zone">⠿</span>
                        <span className="rounded bg-foret px-2 py-1 font-label text-[12px] font-bold text-ivoire" title="Code attribué automatiquement selon l’ordre">{z.code}</span>
                        <span className="flex flex-col">
                          <button type="button" className="px-1 text-[11px] leading-none text-charbon/50 hover:text-foret" onClick={() => monter(z.code, -1)} aria-label="Monter">▲</button>
                          <button type="button" className="px-1 text-[11px] leading-none text-charbon/50 hover:text-foret" onClick={() => monter(z.code, 1)} aria-label="Descendre">▼</button>
                        </span>
                        <select value={cat} onChange={(e) => deplacer(z.code, e.target.value as ZoneCategory)} className="field w-auto py-1 text-[11px]" aria-label="Catégorie" title="Changer de catégorie">
                          {order.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <Field label="Nom de la zone"><Combo value={z.nom} onChange={(v) => setZones(dossier.zones.map((x) => (x.code === z.code ? { ...x, nom: v } : x)))} options={phrases('zoneNoms')} /></Field>
                      <button type="button" disabled={count > 0 || (z.photos?.length ?? 0) > 0} title={count ? 'Zone utilisée par des fiches' : 'Supprimer'} className="btn-quiet text-terre" onClick={() => setZones(dossier.zones.filter((x) => x.code !== z.code))}>Supprimer</button>
                    </div>
                    <div className="mt-3">
                      <PhraseField phraseKey="zoneObservations" label="Observations générales" rows={2} value={z.observations} onChange={(v) => setZones(dossier.zones.map((x) => (x.code === z.code ? { ...x, observations: v } : x)))} />
                    </div>
                  </div>
                );
              })}
              {cat === 'FAC' && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="self-center text-[12px] text-charbon/55">Ajouter :</span>
                  {['Façade nord', 'Façade sud', 'Façade est', 'Façade ouest', 'Façade sur rue', 'Façade sur cour', 'Pignon est', 'Pignon ouest'].map((n) => (
                    <button key={n} type="button" disabled={list.some((z) => z.nom === n)} className="rounded-full border border-pierre bg-white px-3 py-1 text-[12px] text-charbon/75 hover:border-sauge disabled:opacity-40" onClick={() => addZone(cat, n)}>+ {n}</button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1"><Combo value={draft[cat] ?? ''} onChange={(v) => setDraft({ ...draft, [cat]: v })} options={phrases('zoneNoms')} placeholder="Nom de la nouvelle zone" /></div>
                <button type="button" className="btn-ghost" onClick={() => addZone(cat)}>Ajouter la zone</button>
              </div>
            </div>
          </div>
        );
      })}
      <PlansZonesEditor dossier={dossier} update={update} />
    </div>
  );
}

/* ───────────── 4. Photos : par visite et par zone ───────────── */
export function StepPhotos({ dossier, update, goZones }: StepProps & { goZones: () => void }) {
  const [assistant, setAssistant] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Classer le reportage" title="Photos de la visite" />
      {assistant && (
        <VisitImport dossier={dossier} onClose={() => setAssistant(false)}
          onDone={(d, n, classees) => { update(d); setAssistant(false); setFlash(`${classees} photo${classees > 1 ? 's' : ''} classée${classees > 1 ? 's' : ''}${n ? ` et ${n} fiche${n > 1 ? 's' : ''} désordre pré-rédigée${n > 1 ? 's' : ''} (à relire dans l’étape Désordres)` : ''}.`); }} />
      )}
      {flash && <p className="card border-sauge bg-sauge-50 p-3 text-[14px]">{flash}</p>}
      {!dossier.zones.length && (
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <p className="flex-1 text-[14px] text-charbon/70">Vous pouvez déjà importer les photos ; créez ensuite les zones pour les y ranger.</p>
          <button type="button" className="btn-ghost" onClick={goZones}>Aller aux zones</button>
        </div>
      )}
      <PhotosClassement dossier={dossier} update={update} onAssistant={() => setAssistant(true)} />
      {(dossier.visites?.length ?? 0) > 0 && <VisitesListe dossier={dossier} update={update} />}
    </div>
  );
}

/* ───────────── 5. Fiches désordres ───────────── */
export function StepDesordres({ dossier, update, openId, setOpenId }: StepProps & { openId: string | null; setOpenId: (id: string | null) => void }) {
  const [filter, setFilter] = useState<'all' | Priority | 'relire'>('all');
  const aRelire = dossier.desordres.filter((d) => d.aRelire).length;
  const list = sortDesordres(dossier.desordres).filter((d) => filter === 'all' || (filter === 'relire' ? d.aRelire : d.priorite === filter));
  const open = dossier.desordres.find((d) => d.id === openId);
  const { lib, apprendre } = useLibrary();
  const [msg, setMsg] = useState<string | null>(null);
  // Fiches qui n'ont que leur titre (ou des champs vides) et que la bibliothèque peut compléter
  const aCompleter = dossier.desordres.filter((d) => completerFiche(d, lib, dossier.type).champs.length > 0);
  // Fiches relues et complètes dont la rédaction diffère de la bibliothèque
  const aApprendre = dossier.desordres.filter((d) => ficheApprenable(d) && ficheDiffere(d, modeleDe(lib, d.type)?.exact ? modeleDe(lib, d.type)!.t : undefined, dossier.zones.find((z) => z.code === d.zoneCode)));
  const completerTout = () => {
    const desordres = dossier.desordres.map((d) => completerFiche(d, lib, dossier.type).fiche);
    update({ ...dossier, desordres });
    setMsg(`${aCompleter.length} fiche${aCompleter.length > 1 ? 's' : ''} complétée${aCompleter.length > 1 ? 's' : ''} avec votre bibliothèque : à relire (marquées « À relire »).`);
  };
  const apprendreTout = () => {
    apprendre(aApprendre.map((d) => { const m = modeleDe(lib, d.type); return ficheVersModele(d, dossier.zones.find((z) => z.code === d.zoneCode), m?.exact ? m.t : undefined); }));
    setMsg(`Bibliothèque enrichie avec ${aApprendre.length} fiche${aApprendre.length > 1 ? 's' : ''} relue${aApprendre.length > 1 ? 's' : ''} : vos prochains dossiers seront pré-rédigés avec ces textes.`);
  };

  function add() {
    const d = newDesordre(dossier.desordres, dossier.zones[0]?.code ?? '');
    update({ ...dossier, desordres: [...dossier.desordres, d] });
    setOpenId(d.id);
  }

  if (open) {
    return (
      <div>
        <button type="button" onClick={() => setOpenId(null)} className="btn-quiet mb-3 -ml-2 text-[13px]">← Toutes les fiches</button>
        <FicheDesordreEditor
          desordre={open}
          zones={dossier.zones}
          onChange={(d) => update(appliquerFiche(dossier, d))}
          photosDispo={toutesLesPhotos(dossier)}
          onDelete={() => { update(supprimerFiche(dossier, open.id)); setOpenId(null); }}
          onDuplicate={() => { const r = dupliquerFiche(dossier, open.id); if (r) { update(r.d); setOpenId(r.copie.id); } }}
          onCopy={() => copierDansPressePapier(dossier, open)}
          jumelles={fichesJumelles(dossier, open).map((x) => ({ numero: x.numero, zoneCode: x.zoneCode }))}
          onClose={() => setOpenId(null)}
          mode={dossier.type}
        />
      </div>
    );
  }

  return (
    <div>
      <SectionTitle eyebrow="Cœur du rapport" title="Fiches désordres">
        <button type="button" className="btn-ghost" onClick={add}>Nouvelle fiche</button>
      </SectionTitle>
      {(aCompleter.length > 0 || aApprendre.length > 0 || msg) && (
        <div className="mb-4 space-y-2 rounded-md border border-pierre-100 bg-ivoire/60 p-3 text-[13px]">
          {aCompleter.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{aCompleter.length} fiche{aCompleter.length > 1 ? 's' : ''} incomplète{aCompleter.length > 1 ? 's' : ''} (titre seul ou champs vides) : la bibliothèque peut les pré-rédiger, sans toucher à ce que vous avez écrit.</span>
              <button type="button" className="btn-primary min-h-[36px] text-[13px]" onClick={completerTout}>Compléter ces fiches</button>
            </div>
          )}
          {aApprendre.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{aApprendre.length} fiche{aApprendre.length > 1 ? 's' : ''} relue{aApprendre.length > 1 ? 's' : ''} rédigée{aApprendre.length > 1 ? 's' : ''} autrement que votre bibliothèque : {aApprendre.map((d) => d.numero).join(', ')}.</span>
              <button type="button" className="btn-ghost min-h-[36px] text-[13px]" onClick={apprendreTout} title="Le désordre type du même nom reprend le texte de la fiche (les noms de zone deviennent « … »)">Enrichir ma bibliothèque</button>
            </div>
          )}
          {msg && <p className="text-sauge">✓ {msg}</p>}
        </div>
      )}
      <p className="mb-3 text-[12px] text-charbon/55">Fiches numérotées zone par zone, du moins urgent au plus urgent : les numéros se mettent à jour d’eux-mêmes quand une fiche est supprimée, déplacée ou change de priorité.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'P1', 'P2', 'P3', 'relire'] as const).filter((f) => f !== 'relire' || aRelire > 0).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`min-h-[36px] rounded-full border px-3.5 text-[13px] ${filter === f ? 'border-foret bg-foret text-ivoire' : f === 'relire' ? 'border-terre bg-white text-terre' : 'border-pierre bg-white text-charbon/70'}`}>
            {f === 'all' ? `Toutes (${dossier.desordres.length})` : f === 'relire' ? `À relire (${aRelire})` : `${PRIORITY[f].court} (${dossier.desordres.filter((d) => d.priorite === f).length})`}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <p className="font-serif text-xl text-foret">Aucune fiche pour l’instant</p>
          <p className="mt-1 max-w-sm text-sm text-charbon/60">Les fiches se créent depuis l’étape Photos (en choisissant un type de désordre pour une série de photos) ou à la main.</p>
          <button type="button" className="btn-ghost mt-5" onClick={add}>Créer une fiche vide</button>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((d, i) => {
            const zone = dossier.zones.find((z) => z.code === d.zoneCode);
            const nouvelleZone = i === 0 || list[i - 1].zoneCode !== d.zoneCode || !!list[i - 1].general !== !!d.general;
            const nSugg = suggestions(d, lib, dossier.type).filter((x) => x.appliquer || x.biblio).length;
            const blanks = (d.constat + d.analyse + d.preconisation).split('…').length - 1;
            const sansPreco = dossier.type === 'avis' ? false : dossier.type === 'diagnostic' ? !(d.solutions ?? []).length && !d.preconisation : !d.preconisation;
            const missing = [!d.constat && (dossier.type === 'avis' ? 'observation' : 'constat'), sansPreco && 'préconisation', !d.photoEnsemble && 'photo 1', dossier.type !== 'avis' && !d.photoDetail && 'photo 2', blanks > 0 && `${blanks} « … » à compléter`].filter(Boolean);
            return (
              <li key={d.id}>
                {nouvelleZone && <p className="label-caps mb-1 mt-4 first:mt-0">{d.general ? 'Désordres généraux' : zone ? `${zone.code} — ${zone.nom}` : 'Sans zone'}</p>}
                <button type="button" onClick={() => setOpenId(d.id)} className="card flex w-full items-center gap-4 p-3 text-left transition hover:border-sauge">
                  <div className="grid h-14 w-14 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded">
                    {[d.photoEnsemble, d.photoDetail].map((p, i) => p
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img key={i} src={p.src} alt="" className="h-full w-full object-cover" />
                      : <span key={i} className="bg-pierre-50" />)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foret">{d.numero}</span>
                      <PriorityBadge p={d.priorite} />
                      {d.aRelire && <span className="rounded-full bg-terre-50 px-2 py-0.5 text-[11px] font-medium text-terre">À relire</span>}
                      <span className="truncate text-[14px]">{d.type}</span>
                    </div>
                    <p className="truncate text-[13px] text-charbon/55">{d.zoneCode} {zone?.nom} · {d.element}</p>
                    {missing.length > 0 && <p className="text-[12px] text-terre">À compléter : {missing.join(', ')}</p>}
                    {nSugg > 0 && <p className="text-[12px] text-sauge">💡 {nSugg} proposition{nSugg > 1 ? 's' : ''} d’amélioration</p>}
                  </div>
                  <span className="text-sauge" aria-hidden>→</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ───────────── 6. Mesures conservatoires ───────────── */
export function StepMesures({ dossier, update }: StepProps) {
  const set = (mesures: Dossier['mesures']) => update({ ...dossier, mesures });
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Sécurisation" title="Mesures conservatoires">
        <button type="button" className="btn-primary" onClick={() => set([...dossier.mesures, { id: uid(), categorie: 'etaiement', localisation: '', description: '', delai: 'Immédiat' }])}>Ajouter une mesure</button>
      </SectionTitle>
      {dossier.mesures.length === 0 && <p className="card p-6 text-sm text-charbon/60">Étaiements, tirants provisoires, purges, bâchage, périmètre de sécurité, fissuromètres…</p>}
      {dossier.mesures.map((m) => (
        <div key={m.id} className="card space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-[220px_1fr_150px]">
            <Field label="Catégorie"><Select value={m.categorie} onChange={(v) => set(dossier.mesures.map((x) => (x.id === m.id ? { ...x, categorie: v as MesureCategorie } : x)))} options={(Object.keys(MESURE_CATEGORIES) as MesureCategorie[]).map((c) => ({ value: c, label: MESURE_CATEGORIES[c] }))} /></Field>
            <Field label="Localisation"><Combo value={m.localisation} onChange={(v) => set(dossier.mesures.map((x) => (x.id === m.id ? { ...x, localisation: v } : x)))} options={dossier.zones.map((z) => `${z.code} ${z.nom}`)} /></Field>
            <Field label="Délai"><Combo value={m.delai} onChange={(v) => set(dossier.mesures.map((x) => (x.id === m.id ? { ...x, delai: v } : x)))} options={['Immédiat', 'Sous 48 heures', 'Sous 8 jours', 'Sous 1 mois']} /></Field>
          </div>
          <PhraseField phraseKey="mesure" label="Prescription" rows={2} value={m.description} onChange={(v) => set(dossier.mesures.map((x) => (x.id === m.id ? { ...x, description: v } : x)))} />
          <div className="text-right"><button type="button" className="btn-quiet text-[13px] text-terre" onClick={() => set(dossier.mesures.filter((x) => x.id !== m.id))}>Supprimer</button></div>
        </div>
      ))}
      {dossier.mesures.length > 0 && (
        <div className="card p-5">
          <PhraseField phraseKey="avisTiers" label="Avis aux tiers et responsabilités" hint="mitoyens, voie publique" value={dossier.avisTiers} onChange={(v) => update({ ...dossier, avisTiers: v })} />
        </div>
      )}
    </div>
  );
}

/* ───────────── 7. Synthèse ───────────── */
export function StepSynthese({ dossier, update, onOpenDesordre }: StepProps & { onOpenDesordre: (id: string) => void }) {
  const showBudget = dossier.type === 'conseil' || dossier.type === 'accompagnement';
  return (
    <div className="space-y-10">
      <SectionTitle eyebrow="Rédigée automatiquement" title="Synthèse et feuille de route" />
      <p className="-mt-6 rounded-md bg-sauge-50 p-3 text-[14px] text-charbon/75">
        La synthèse du rapport est rédigée automatiquement à partir de tout ce que vous avez saisi : bâtiment, désordres et leurs causes, urgences, étapes de travaux, budget, souhaits du client, erreurs à éviter, entretien. Elle se met à jour en direct dans l’aperçu. Vos textes ci-dessous la complètent (« Le mot de l’expert »).
      </p>
      {showBudget && <SynthesisTable dossier={dossier} onFinancesChange={(finances) => update({ ...dossier, finances })} onOpenDesordre={onOpenDesordre} />}

      {(dossier.type === 'conseil' || dossier.type === 'accompagnement') && (
        <div className="card p-5">
          <p className="mb-1 font-serif text-xl font-semibold text-foret">Planning prévisionnel</p>
          <p className="mb-4 text-[13px] text-charbon/60">Semaine de début et durée de chaque étape : alimente le chronogramme et la feuille de route.</p>
          <div className="space-y-2">
            {dossier.planning.map((p) => (
              <div key={p.phase} className="grid grid-cols-[1fr_80px_80px] items-center gap-3 text-[14px]">
                <span><b className="text-terre">{p.phase}.</b> {PHASES[p.phase].titre}</span>
                <input type="number" min={1} aria-label="Semaine de début" value={p.debut} className="field py-1.5" onChange={(e) => update({ ...dossier, planning: dossier.planning.map((x) => (x.phase === p.phase ? { ...x, debut: Math.max(1, Number(e.target.value) || 1) } : x)) })} />
                <input type="number" min={1} aria-label="Durée en semaines" value={p.duree} className="field py-1.5" onChange={(e) => update({ ...dossier, planning: dossier.planning.map((x) => (x.phase === p.phase ? { ...x, duree: Math.max(1, Number(e.target.value) || 1) } : x)) })} />
              </div>
            ))}
            <div className="grid grid-cols-[1fr_80px_80px] gap-3 text-[11px] text-charbon/50"><span /><span>Semaine de début</span><span>Durée en semaines</span></div>
          </div>
        </div>
      )}

      <div className="card space-y-4 p-5">
        <p className="font-serif text-xl font-semibold text-foret">Le mot de l’expert</p>
        <PhraseField phraseKey="bilan" label={dossier.type === 'diagnostic' ? 'Bilan structurel' : dossier.type === 'avis' ? 'Notre avis général' : 'Avis général'} value={dossier.conclusion.bilan} onChange={(v) => update({ ...dossier, conclusion: { ...dossier.conclusion, bilan: v } })} />
        <PhraseField phraseKey="conclusion" label="Conclusion et orientation" value={dossier.conclusion.conclusion} onChange={(v) => update({ ...dossier, conclusion: { ...dossier.conclusion, conclusion: v } })} />
      </div>

      <GuidesChoix dossier={dossier} update={update} />
    </div>
  );
}

/* ───────────── 8. Annuaire ───────────── */
export function StepAnnuaire({ dossier, update }: StepProps) {
  const set = (annuaire: Dossier['annuaire']) => update({ ...dossier, annuaire });
  const { phrases, lib, setLib } = useLibrary();
  const entreprises = lib.contacts.filter((c) => c.categorie === 'entreprise' || c.categorie === 'entreprise-possible');
  const [st, setSt] = useState<{ busy?: boolean; msg?: string; err?: boolean }>({});
  const auto = useRef(false);

  /** Remplit l'annuaire depuis mes contacts : par lot des désordres, entreprises déjà éprouvées et mieux notées d'abord, puis les plus proches. */
  async function remplir() {
    setSt({ busy: true, msg: 'Recherche des entreprises les plus adaptées…' });
    try {
      let centre = parseGps(dossier.meta.bien.gps ?? '');
      if (!centre) {
        const a = [dossier.meta.bien.adresse, dossier.meta.bien.codePostal, dossier.meta.bien.commune].filter(Boolean).join(' ');
        const g = a.trim() ? await geocodePoint(a).catch(() => null) : null;
        if (g) centre = g;
      }
      let contacts = lib.contacts;
      if (centre && entreprises.some((c) => c.lat == null && adresseContact(c).trim())) {
        const r = await localiserContacts(contacts).catch(() => null);
        if (r) { contacts = r.contacts; setLib({ ...lib, contacts }); }
      }
      const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const cands = contacts.filter((c) => c.categorie === 'entreprise' || c.categorie === 'entreprise-possible').map((c) => ({
        c, km: centre && c.lat != null && c.lon != null ? distanceKm(centre, { lat: c.lat, lon: c.lon }) : null,
      })).filter((x) => x.km == null || x.km <= 80);
      const rang = (x: { c: typeof contacts[number]; km: number | null }) => (x.c.categorie === 'entreprise' ? 0 : 100) - (x.c.note ?? 0) * 10 + (x.km ?? 60) / 10;
      cands.sort((a, b) => rang(a) - rang(b));
      const lots = Array.from(new Set(dossier.desordres.map((d) => d.lot).filter(Boolean)));
      const deja = new Set(dossier.annuaire.map((a) => norm(a.nom)));
      const choisis: typeof cands = [];
      for (const lot of lots) {
        const mot = norm(lot).split(/[\s–—-]+/).filter((w) => w.length > 3);
        cands.filter((x) => mot.some((w) => norm(`${x.c.metier} ${x.c.notes}`).includes(w)) && !choisis.includes(x) && !deja.has(norm(x.c.societe || x.c.nom))).slice(0, 2).forEach((x) => choisis.push(x));
      }
      for (const x of cands) { if (choisis.length >= 10) break; if (!choisis.includes(x) && !deja.has(norm(x.c.societe || x.c.nom))) choisis.push(x); }
      const lignes = choisis.map(({ c, km }) => ({
        id: uid(), lot: c.metier, nom: c.societe || c.nom,
        ville: `${c.ville}${km != null ? ` (${Math.round(km)} km)` : ''}`,
        contact: [c.societe && c.nom ? c.nom : '', c.telephone, c.email].filter(Boolean).join(' · '),
      }));
      set([...dossier.annuaire, ...lignes]);
      setSt({ msg: lignes.length ? `${lignes.length} entreprise(s) ajoutée(s), classées selon vos préférences et la distance${centre ? '' : ' (adresse du bien non localisée : distance non prise en compte)'}. Modifiez ou retirez librement.` : 'Aucune entreprise trouvée dans vos contacts à moins de 80 km. Ajoutez-en dans Relation client › Contacts.', err: !lignes.length });
    } catch (e) { setSt({ err: true, msg: (e as Error).message }); }
  }
  useEffect(() => {
    if (!auto.current && dossier.annuaire.length === 0 && entreprises.length > 0) { auto.current = true; remplir(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Intervenants locaux" title="Annuaire des entreprises">
        {entreprises.length > 0 && <button type="button" className="btn-ghost" disabled={st.busy} onClick={remplir}>{st.busy ? 'Recherche…' : 'Remplir depuis mes contacts'}</button>}
        {entreprises.length > 0 && (
          <select value="" onChange={(e) => { const c = entreprises.find((x) => x.id === e.target.value); if (c) set([...dossier.annuaire, { id: uid(), lot: c.metier, nom: c.societe || c.nom, ville: c.ville, contact: [c.nom !== c.societe ? c.nom : '', c.telephone, c.email].filter(Boolean).join(' · ') }]); }} className="field w-auto">
            <option value="">Ajouter depuis mes contacts…</option>
            {entreprises.map((c) => <option key={c.id} value={c.id}>{c.societe || c.nom}{c.metier ? ` — ${c.metier}` : ''}{c.categorie === 'entreprise' ? ' ✓' : ''}</option>)}
          </select>
        )}
        <button type="button" className="btn-primary" onClick={() => set([...dossier.annuaire, { id: uid(), lot: '', nom: '', ville: '', contact: '' }])}>Ajouter</button>
      </SectionTitle>
      {st.msg && <p className={`text-[13px] ${st.err ? 'text-terre' : 'text-sauge'}`}>{st.msg}</p>}
      {dossier.annuaire.length === 0 && <p className="card p-6 text-sm text-charbon/60">Artisans spécialisés pierre, chaux et patrimoine, par lot. {entreprises.length ? '' : 'Ajoutez vos entreprises dans Relation client › Contacts pour remplir l’annuaire automatiquement.'}</p>}
      {dossier.annuaire.map((e) => (
        <div key={e.id} className="card grid items-end gap-3 p-4 sm:grid-cols-[1fr_1fr_140px_1fr_auto]">
          <Field label="Lot"><Combo value={e.lot} onChange={(v) => set(dossier.annuaire.map((x) => (x.id === e.id ? { ...x, lot: v } : x)))} options={phrases('lots')} /></Field>
          <Field label="Entreprise"><Input value={e.nom} onChange={(ev) => set(dossier.annuaire.map((x) => (x.id === e.id ? { ...x, nom: ev.target.value } : x)))} /></Field>
          <Field label="Commune"><Input value={e.ville} onChange={(ev) => set(dossier.annuaire.map((x) => (x.id === e.id ? { ...x, ville: ev.target.value } : x)))} /></Field>
          <Field label="Contact"><Input value={e.contact} onChange={(ev) => set(dossier.annuaire.map((x) => (x.id === e.id ? { ...x, contact: ev.target.value } : x)))} /></Field>
          <button type="button" className="btn-quiet text-terre" onClick={() => set(dossier.annuaire.filter((x) => x.id !== e.id))} aria-label="Supprimer">×</button>
        </div>
      ))}
    </div>
  );
}

/** Visites du dossier : dates et libellés modifiables ; suppression possible même si des photos y sont rattachées (elles sont conservées). */
function VisitesListe({ dossier, update }: StepProps) {
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  const nbPhotos = (id: string) => toutesLesPhotos(dossier).filter((x) => x.photo.visiteId === id).length;
  const supprimer = (id: string) => {
    const d = mapToutesPhotos(dossier, (p) => (p.visiteId === id ? { ...p, visiteId: undefined } : p));
    const visites = (d.visites ?? []).filter((x) => x.id !== id);
    const premiere = [...visites].sort((a, b) => a.date.localeCompare(b.date))[0];
    update({ ...d, visites, meta: { ...d.meta, dateVisite: visites.some((v) => v.date === d.meta.dateVisite) ? d.meta.dateVisite : premiere?.date ?? '' } });
    setAConfirmer(null);
  };
  return (
    <div className="card p-4">
      <p className="label-caps mb-2">Visites (dates réelles des photos)</p>
      <div className="space-y-2">
        {dossier.visites!.map((v) => {
          const n = nbPhotos(v.id);
          return (
            <div key={v.id} className="grid items-center gap-2 sm:grid-cols-[160px_1fr_auto]">
              <Input type="date" value={v.date} onChange={(e) => update({ ...dossier, visites: dossier.visites!.map((x) => (x.id === v.id ? { ...x, date: e.target.value } : x)) })} />
              <Input value={v.libelle} onChange={(e) => update({ ...dossier, visites: dossier.visites!.map((x) => (x.id === v.id ? { ...x, libelle: e.target.value } : x)) })} />
              {aConfirmer === v.id ? (
                <span className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="text-charbon/60">{n ? `${n} photo${n > 1 ? 's' : ''} conservée${n > 1 ? 's' : ''}, sans date de visite.` : ''}</span>
                  <button type="button" className="btn-primary min-h-[32px] px-3 text-[12px]" onClick={() => supprimer(v.id)}>Confirmer</button>
                  <button type="button" className="btn-quiet text-[12px]" onClick={() => setAConfirmer(null)}>Annuler</button>
                </span>
              ) : (
                <button type="button" className="btn-quiet text-[12px] text-terre" onClick={() => (n ? setAConfirmer(v.id) : supprimer(v.id))}>Supprimer</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
