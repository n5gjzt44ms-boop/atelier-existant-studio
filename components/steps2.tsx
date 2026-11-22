'use client';
import { useMemo, useRef, useState } from 'react';
import { fmtDate } from '@/lib/calc';
import { ZONE_CATEGORIES } from '@/lib/constants';
import { uid } from '@/lib/factory';
import { fileToPhoto } from '@/lib/image';
import { fetchParcelle, fetchUrbanisme, fmtGps, geocodePoint, liensUrbanisme, parseGps, texteUrbanisme } from '@/lib/maps';
import { precoOf } from '@/lib/narrative';
import type { Dossier, Echange, Photo, PlanZones, Questionnaire, Solution, ZoneCategory } from '@/lib/types';
import { QUESTIONNAIRE_VIDE, Q_LABELS } from '@/lib/business';
import { appliquerQuestionnaire, phrasePerimetre, ZONES_PERIMETRE } from '@/lib/perimetre';
import QuestionnaireForm from './Questionnaire';
import { guidesSuggeres } from './guides';
import { COULEUR_CATEGORIE } from '@/lib/zones';
import { useLibrary } from './LibraryProvider';
import PhraseField from './PhraseField';
import { Combo, Field, Input, PriorityBadge, SectionTitle, TextArea } from './ui';
import { StepMesures, type StepProps } from './steps';

const today = () => new Date().toISOString().slice(0, 10);

/* ───────────── Adresse → cadastre, urbanisme, protections ───────────── */
export function AdresseAuto({ dossier, update }: StepProps) {
  const b = dossier.meta.bien;
  const [st, setSt] = useState<{ busy?: boolean; msg?: string; err?: boolean; propose?: { cadastre?: string; plu?: string } }>({});
  const pt = parseGps(b.gps ?? '');
  const adresse = [b.adresse, b.codePostal, b.commune].filter(Boolean).join(' ');

  async function run() {
    setSt({ busy: true, msg: 'Recherche de l’adresse…' });
    try {
      let p = pt as { lon: number; lat: number; citycode?: string } | null;
      if (!p) {
        if (!adresse.trim()) throw new Error('Renseignez d’abord l’adresse.');
        const g = await geocodePoint(adresse);
        if (!g) throw new Error('Adresse introuvable : vérifiez l’adresse et le code postal.');
        p = g;
      }
      setSt({ busy: true, msg: 'Recherche de la parcelle et des règles d’urbanisme…' });
      const [parcelle, urba] = await Promise.all([fetchParcelle(p).catch(() => null), fetchUrbanisme(p, p.citycode).catch(() => null)]);
      const plu = urba ? texteUrbanisme(urba) : '';
      const bien = { ...b, gps: fmtGps(p) };
      const propose: { cadastre?: string; plu?: string } = {};
      if (parcelle) { if (!b.cadastre.trim()) bien.cadastre = parcelle; else if (b.cadastre.trim() !== parcelle) propose.cadastre = parcelle; }
      if (plu) { if (!b.plu.trim()) bien.plu = plu; else if (b.plu.trim() !== plu) propose.plu = plu; }
      update({ ...dossier, meta: { ...dossier.meta, bien } });
      const trouves = [parcelle && 'la parcelle', plu && 'les règles d’urbanisme'].filter(Boolean);
      setSt({ msg: trouves.length ? `Trouvé : ${trouves.join(' et ')}. À vérifier sur les sites officiels.` : 'Aucune information trouvée automatiquement : utilisez les liens ci-dessous.', err: !trouves.length, propose });
    } catch (e) {
      setSt({ err: true, msg: `${(e as Error).message} Utilisez les liens ci-dessous.` });
    }
  }

  const setBien = (patch: Partial<Dossier['meta']['bien']>) => update({ ...dossier, meta: { ...dossier.meta, bien: { ...b, ...patch } } });
  return (
    <div className="rounded-md bg-ivoire p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-ghost" disabled={st.busy} onClick={run}>{st.busy ? 'Recherche…' : 'Compléter cadastre, urbanisme et protections'}</button>
        <span className="text-[12px] text-charbon/55">à partir de l’adresse (services publics gratuits)</span>
      </div>
      {st.msg && <p className={`mt-2 text-[13px] ${st.err ? 'text-terre' : 'text-sauge'}`}>{st.msg}</p>}
      {st.propose?.cadastre && <p className="mt-1 text-[13px]">Parcelle trouvée : « {st.propose.cadastre} » <button type="button" className="text-terre underline" onClick={() => { setBien({ cadastre: st.propose!.cadastre! }); setSt({ ...st, propose: { ...st.propose, cadastre: undefined } }); }}>Remplacer</button></p>}
      {st.propose?.plu && <p className="mt-1 text-[13px]">Urbanisme trouvé : « {st.propose.plu} » <button type="button" className="text-terre underline" onClick={() => { setBien({ plu: st.propose!.plu! }); setSt({ ...st, propose: { ...st.propose, plu: undefined } }); }}>Remplacer</button></p>}
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        {(pt ? liensUrbanisme(pt) : [
          { titre: 'Géoportail de l’urbanisme', url: 'https://www.geoportail-urbanisme.gouv.fr/map/' },
          { titre: 'Cadastre officiel', url: 'https://www.cadastre.gouv.fr/scpc/rechercherPlan.do' },
          { titre: 'Atlas des patrimoines', url: 'http://atlas.patrimoines.culture.fr/atlas/trunk/' },
          { titre: 'cartes.gouv.fr', url: 'https://cartes.gouv.fr/explorer-les-cartes' },
          { titre: 'Géorisques', url: 'https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi' },
        ]).map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-foret underline decoration-pierre underline-offset-2 hover:text-terre">{l.titre} ↗</a>)}
      </p>
    </div>
  );
}

/** Liens vers des sites gratuits pour retrouver la météo du jour de visite. */
export function LiensMeteo({ commune, date }: { commune: string; date: string }) {
  const d = date ? new Date(date) : null;
  const mois = d ? d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';
  const jour = d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const q = encodeURIComponent(`météo ${commune} ${jour || mois}`.trim());
  return (
    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-charbon/60">
      <span>Retrouver la météo{jour ? ` du ${jour}` : ''} :</span>
      <a className="text-foret underline" target="_blank" rel="noreferrer" href="https://www.infoclimat.fr/climatologie/">Infoclimat (archives par station) ↗</a>
      <a className="text-foret underline" target="_blank" rel="noreferrer" href="https://www.historique-meteo.net/france/">Historique météo ↗</a>
      <a className="text-foret underline" target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${q}`}>Recherche « {decodeURIComponent(q)} » ↗</a>
    </p>
  );
}

/* ───────────── Avis sanitaire : points de vigilance et études ───────────── */
export function StepVigilance({ dossier, update }: StepProps) {
  const { phrases } = useLibrary();
  const vig = dossier.vigilance ?? [];
  const et = dossier.etudes ?? [];
  const setV = (vigilance: Dossier['vigilance']) => update({ ...dossier, vigilance });
  const setE = (etudes: Dossier['etudes']) => update({ ...dossier, etudes });
  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Avis sanitaire" title="Points de vigilance et études complémentaires" />
      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="font-serif text-lg font-semibold text-foret">Points de vigilance</p>
          <button type="button" className="btn-ghost" onClick={() => setV([...vig, { id: uid(), localisation: '', texte: '' }])}>Ajouter</button>
        </div>
        {vig.length === 0 && <p className="text-[13px] text-charbon/55">Ce que le client doit surveiller ou éviter, qu’il engage des travaux ou non.</p>}
        {vig.map((v) => (
          <div key={v.id} className="rounded-md border border-pierre-100 p-3">
            <div className="mb-2 grid items-end gap-2 sm:grid-cols-[1fr_auto]">
              <Field label="Localisation (facultatif)"><Combo value={v.localisation} onChange={(x) => setV(vig.map((y) => (y.id === v.id ? { ...y, localisation: x } : y)))} options={dossier.zones.map((z) => `${z.code} ${z.nom}`)} /></Field>
              <button type="button" className="btn-quiet text-terre" onClick={() => setV(vig.filter((y) => y.id !== v.id))}>Supprimer</button>
            </div>
            <PhraseField phraseKey="vigilance" label="Point de vigilance" rows={2} value={v.texte} onChange={(x) => setV(vig.map((y) => (y.id === v.id ? { ...y, texte: x } : y)))} />
          </div>
        ))}
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="font-serif text-lg font-semibold text-foret">Études complémentaires à mener</p>
          <button type="button" className="btn-ghost" onClick={() => setE([...et, { id: uid(), nature: '', objet: '', intervenant: '' }])}>Ajouter</button>
        </div>
        {et.length === 0 && <p className="text-[13px] text-charbon/55">Diagnostic structurel, étude de sol, diagnostic des bois, recherche de fuite…</p>}
        {et.map((e) => (
          <div key={e.id} className="grid items-end gap-2 rounded-md border border-pierre-100 p-3 sm:grid-cols-[1fr_1fr_180px_auto]">
            <Field label="Étude"><Combo value={e.nature} onChange={(x) => setE(et.map((y) => (y.id === e.id ? { ...y, nature: x } : y)))} options={phrases('etudes')} /></Field>
            <Field label="Objet"><Input value={e.objet} onChange={(x) => setE(et.map((y) => (y.id === e.id ? { ...y, objet: x.target.value } : y)))} placeholder="Ce qu’elle doit établir" /></Field>
            <Field label="Intervenant pressenti"><Input value={e.intervenant} onChange={(x) => setE(et.map((y) => (y.id === e.id ? { ...y, intervenant: x.target.value } : y)))} /></Field>
            <button type="button" className="btn-quiet text-terre" onClick={() => setE(et.filter((y) => y.id !== e.id))}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Diagnostic structurel : préconisations par désordre ───────────── */
export function StepPreconisations({ dossier, update, onOpenDesordre }: StepProps & { onOpenDesordre: (id: string) => void }) {
  const { lib } = useLibrary();
  const [mesures, setMesures] = useState(dossier.mesures.length > 0);
  const setSol = (id: string, solutions: Solution[]) => update({ ...dossier, desordres: dossier.desordres.map((d) => (d.id === id ? { ...d, solutions } : d)) });
  const list = [...dossier.desordres].sort((a, b) => a.priorite.localeCompare(b.priorite) || a.numero.localeCompare(b.numero));
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Diagnostic structurel" title="Préconisations" />
      <p className="-mt-3 text-[14px] text-charbon/65">Pour chaque désordre, proposez une ou plusieurs solutions et indiquez celle que vous recommandez. Pas d’estimation de prix dans cette mission.</p>
      {list.length === 0 && <p className="card p-6 text-[14px] text-charbon/60">Créez d’abord les fiches désordres.</p>}
      {list.map((d) => {
        const sol = d.solutions ?? [];
        const sugg = lib.preconisations.filter((x) => x.pour?.includes(d.type) && !sol.some((s) => s.titre === x.titre));
        return (
          <div key={d.id} className="card p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foret">{d.numero}</span><PriorityBadge p={d.priorite} />
              <span className="text-[14px]">{d.type}</span><span className="text-[13px] text-charbon/55">{d.zoneCode}</span>
              <button type="button" className="btn-quiet ml-auto text-[13px]" onClick={() => onOpenDesordre(d.id)}>Modifier dans la fiche →</button>
            </div>
            {sol.length === 0 && d.preconisation.trim() && <p className="mb-2 text-[13px] text-charbon/70">Préconisation actuelle : {d.preconisation}</p>}
            <ul className="space-y-1.5">
              {sol.map((s, i) => (
                <li key={s.id} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-[14px] ${s.recommandee ? 'border-sauge bg-sauge-50' : 'border-pierre-100'}`}>
                  <span className="font-serif font-semibold text-terre">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1"><b>{s.titre}</b>{s.texte ? <span className="text-charbon/65"> — {s.texte.slice(0, 140)}{s.texte.length > 140 ? '…' : ''}</span> : null}</span>
                  <label className="flex items-center gap-1 whitespace-nowrap text-[12px]"><input type="radio" checked={!!s.recommandee} onChange={() => setSol(d.id, sol.map((x) => ({ ...x, recommandee: x.id === s.id })))} /> Recommandée</label>
                  <button type="button" className="text-terre" onClick={() => setSol(d.id, sol.filter((x) => x.id !== s.id))} aria-label="Retirer">×</button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-2">
              {sugg.slice(0, 4).map((x) => <button key={x.id} type="button" className="rounded-full border border-pierre bg-white px-3 py-1 text-[12px] hover:border-sauge" onClick={() => setSol(d.id, [...sol, { id: uid(), titre: x.titre, texte: x.texte }])}>+ {x.titre}</button>)}
              <select value="" onChange={(e) => { const x = lib.preconisations.find((p) => p.id === e.target.value); if (x) setSol(d.id, [...sol, { id: uid(), titre: x.titre, texte: x.texte }]); }} className="field w-auto py-1 text-[12px]">
                <option value="">Autre préconisation type…</option>
                {lib.preconisations.map((x) => <option key={x.id} value={x.id}>{x.titre}</option>)}
              </select>
            </div>
          </div>
        );
      })}
      <div className="card p-4">
        <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={mesures} onChange={(e) => setMesures(e.target.checked)} /> Ajouter des mesures conservatoires immédiates (étaiement, bâchage, périmètre…)</label>
      </div>
      {mesures && <StepMesures dossier={dossier} update={update} />}
    </div>
  );
}

/* ───────────── Guides de bonnes pratiques (option) ───────────── */
export function GuidesChoix({ dossier, update }: StepProps) {
  const { lib } = useLibrary();
  const sugg = useMemo(() => guidesSuggeres(dossier, lib.guides), [dossier, lib.guides]);
  const sel = dossier.guides ?? [];
  const toggle = (id: string) => update({ ...dossier, guides: sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id] });
  return (
    <div className="card p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="font-serif text-xl font-semibold text-foret">Guides de bonnes pratiques</p>
        <span className="rounded-full bg-terre-50 px-2.5 py-0.5 text-[11px] text-terre">option commerciale</span>
      </div>
      <p className="mb-3 text-[13px] text-charbon/60">Fiches illustrées et pédagogiques jointes en fin de rapport. Les guides adaptés aux matériaux et aux désordres du bâtiment sont signalés ★.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {lib.guides.map((g) => (
          <label key={g.id} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-[13px] ${sel.includes(g.id) ? 'border-sauge bg-sauge-50' : 'border-pierre-100'}`}>
            <input type="checkbox" checked={sel.includes(g.id)} onChange={() => toggle(g.id)} className="mt-0.5" />
            <span><b>{sugg.includes(g.id) ? '★ ' : ''}{g.titre}</b><br /><span className="text-charbon/60">{g.accroche}</span></span>
          </label>
        ))}
      </div>
      {sugg.some((id) => !sel.includes(id)) && <button type="button" className="btn-quiet mt-2 text-[13px]" onClick={() => update({ ...dossier, guides: Array.from(new Set([...sel, ...sugg])) })}>Ajouter les guides suggérés ★</button>}
    </div>
  );
}

/* ───────────── Plans de repérage des zones ───────────── */
export function PlansZonesEditor({ dossier, update }: StepProps) {
  const plans = dossier.plansZones ?? [];
  const set = (plansZones: PlanZones[]) => update({ ...dossier, plansZones });
  const [actif, setActif] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [cible, setCible] = useState<string | null>(null);
  const order = Object.keys(ZONE_CATEGORIES) as ZoneCategory[];
  const zones = [...dossier.zones].sort((a, b) => order.indexOf(a.categorie) - order.indexOf(b.categorie));

  async function onFile(f?: File) {
    if (!f || !cible) return;
    const photo = await fileToPhoto(f, 2000, 0.85);
    set(plans.map((p) => (p.id === cible ? { ...p, image: photo } : p)));
  }

  return (
    <div className="card p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-serif text-lg font-semibold text-foret">Plans de repérage</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={() => set([...plans, { id: uid(), titre: 'Schéma des zones (vue de dessus)', image: null, reperes: [], formes: [] }])}>Dessiner un schéma</button>
          <button type="button" className="btn-ghost" onClick={() => set([...plans, { id: uid(), titre: plans.length ? `Plan ${plans.length + 1}` : 'Plan du rez-de-chaussée', image: null, reperes: [] }])}>Importer un plan</button>
        </div>
      </div>
      <p className="mb-3 text-[13px] text-charbon/60">Dessinez un schéma vue de dessus avec un rectangle de couleur par zone, ou importez un plan (croquis, plan du client, plan cadastral) et cliquez dessus pour placer chaque zone.</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      <div className="space-y-5">
        {plans.map((pl) => {
          const code = actif[pl.id] ?? zones[0]?.code ?? '';
          return (
            <div key={pl.id} className="rounded-md border border-pierre-100 p-3">
              <div className="mb-2 flex flex-wrap items-end gap-2">
                <Field label="Titre du plan" className="min-w-[200px] flex-1"><Input value={pl.titre} onChange={(e) => set(plans.map((p) => (p.id === pl.id ? { ...p, titre: e.target.value } : p)))} /></Field>
                {!pl.formes && <button type="button" className="btn-ghost" onClick={() => { setCible(pl.id); fileRef.current?.click(); }}>{pl.image ? 'Changer l’image' : 'Importer le plan'}</button>}
                {!pl.formes && dossier.contexte.vues.length > 0 && (
                  <select value="" onChange={(e) => { const v = dossier.contexte.vues[Number(e.target.value)]; if (v) set(plans.map((p) => (p.id === pl.id ? { ...p, image: { ...v, id: uid() } } : p))); }} className="field w-auto py-2 text-[13px]">
                    <option value="">Utiliser une carte du contexte…</option>
                    {dossier.contexte.vues.map((v, i) => <option key={i} value={i}>{v.legende || `Vue ${i + 1}`}</option>)}
                  </select>
                )}
                <button type="button" className="btn-quiet text-terre" onClick={() => set(plans.filter((p) => p.id !== pl.id))}>Supprimer</button>
              </div>
              {pl.formes ? <SchemaZones plan={pl} zones={zones} onChange={(p) => set(plans.map((x) => (x.id === pl.id ? p : x)))} /> : pl.image ? (
                <>
                  <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                    <span className="text-charbon/60">Zone à placer :</span>
                    {zones.map((z) => (
                      <button key={z.code} type="button" onClick={() => setActif({ ...actif, [pl.id]: z.code })}
                        className={`rounded-full border px-2.5 py-0.5 ${code === z.code ? 'border-foret bg-foret text-ivoire' : pl.reperes.some((r) => r.code === z.code) ? 'border-sauge text-sauge' : 'border-pierre'}`}>{z.code}</button>
                    ))}
                    {!zones.length && <span className="text-terre">créez d’abord les zones</span>}
                  </div>
                  <div className="relative cursor-crosshair overflow-hidden rounded border border-pierre-100"
                    onClick={(e) => {
                      if (!code) return;
                      const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
                      const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
                      set(plans.map((p) => (p.id === pl.id ? { ...p, reperes: [...p.reperes.filter((q) => q.code !== code), { code, x, y }] } : p)));
                      const idx = zones.findIndex((z) => z.code === code);
                      if (zones[idx + 1]) setActif({ ...actif, [pl.id]: zones[idx + 1].code });
                    }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pl.image.src} alt={pl.titre} className="block w-full select-none" draggable={false} />
                    {pl.reperes.map((r) => (
                      <button key={r.code} type="button" title="Retirer ce repère"
                        onClick={(e) => { e.stopPropagation(); set(plans.map((p) => (p.id === pl.id ? { ...p, reperes: p.reperes.filter((q) => q.code !== r.code) } : p))); }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-ivoire bg-foret px-2 py-0.5 font-label text-[11px] font-bold text-ivoire shadow"
                        style={{ left: `${r.x}%`, top: `${r.y}%` }}>{r.code}</button>
                    ))}
                  </div>
                </>
              ) : <p className="rounded bg-pierre-50 p-6 text-center text-[13px] text-charbon/55">Aucune image pour l’instant.</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── Classeur du dossier ───────────── */
export function StepClasseur({ dossier, update }: StepProps) {
  const [onglet, setOnglet] = useState<'photos' | 'echanges' | 'documents'>('photos');
  const c = dossier.classeur ?? { echanges: [], documents: [] };
  const setC = (patch: Partial<typeof c>) => update({ ...dossier, classeur: { ...c, ...patch } });
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Tout le dossier au même endroit" title="Classeur" />
      <div className="flex flex-wrap gap-1">
        {([['photos', 'Photos par visite et par zone'], ['echanges', `Échanges (${c.echanges.length})`], ['documents', `Plans et documents (${c.documents.length + dossier.contexte.vues.length + (dossier.plansZones ?? []).filter((p) => p.image).length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setOnglet(k)} className={`min-h-[38px] rounded-full px-4 text-[13px] ${onglet === k ? 'bg-foret text-ivoire' : 'border border-pierre bg-white text-charbon/70'}`}>{l}</button>
        ))}
      </div>
      {onglet === 'photos' && <ClasseurPhotos dossier={dossier} />}
      {onglet === 'echanges' && <ClasseurEchanges echanges={c.echanges} set={(echanges) => setC({ echanges })} />}
      {onglet === 'documents' && <ClasseurDocuments dossier={dossier} documents={c.documents} set={(documents) => setC({ documents })} />}
    </div>
  );
}

function ClasseurPhotos({ dossier }: { dossier: Dossier }) {
  const visites = dossier.visites ?? [];
  type Item = { p: Photo; zone: string; label: string };
  const all: Item[] = [
    ...dossier.zones.flatMap((z) => (z.photos ?? []).map((p) => ({ p, zone: z.code, label: `${z.code} ${z.nom}` }))),
    ...dossier.desordres.flatMap((d) => [d.photoEnsemble, d.photoDetail, ...(d.autresPhotos ?? [])].filter(Boolean).map((p) => ({ p: p as Photo, zone: d.zoneCode, label: `${d.numero} ${d.type}` }))),
  ];
  const groupes = [...visites.map((v) => ({ id: v.id, titre: `${v.libelle} — ${fmtDate(v.date)}` })), { id: '', titre: 'Photos sans visite associée' }];
  const zoneNom = (code: string) => dossier.zones.find((z) => z.code === code)?.nom ?? '';
  if (!all.length) return <p className="card p-6 text-[14px] text-charbon/60">Aucune photo pour l’instant : importez les photos de visite dans l’étape Photos.</p>;
  return (
    <div className="space-y-6">
      {groupes.map((g) => {
        const items = all.filter((x) => (x.p.visiteId ?? '') === g.id || (!g.id && !visites.some((v) => v.id === x.p.visiteId)));
        if (!items.length) return null;
        const zones = Array.from(new Set(items.map((x) => x.zone)));
        return (
          <div key={g.id || 'sans'} className="card p-4">
            <p className="mb-3 font-serif text-lg font-semibold text-foret">{g.titre} <span className="text-[13px] font-normal text-charbon/50">{items.length} photo{items.length > 1 ? 's' : ''}</span></p>
            {zones.map((z) => (
              <div key={z || 'x'} className="mb-3">
                <p className="label-caps mb-1.5">{z ? `${z} ${zoneNom(z)}` : 'Zone non précisée'}</p>
                <div className="flex flex-wrap gap-2">
                  {items.filter((x) => x.zone === z).map((x, i) => (
                    <a key={(x.p.id ?? '') + i} href={x.p.src} download={`${z || 'photo'}-${i + 1}.jpg`} target="_blank" rel="noreferrer" title={`${x.label} — ouvrir ou télécharger`} className="block w-24">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={x.p.src} alt="" className="aspect-[4/3] w-full rounded object-cover" />
                      <span className="block truncate text-[10px] text-charbon/55">{x.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

const SENS: Record<Echange['sens'], string> = { envoye: 'Mail envoyé', recu: 'Mail reçu', appel: 'Appel', note: 'Note' };
function ClasseurEchanges({ echanges, set }: { echanges: Echange[]; set: (e: Echange[]) => void }) {
  const [edit, setEdit] = useState<Echange | null>(null);
  const list = [...echanges].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-3">
      <button type="button" className="btn-primary" onClick={() => setEdit({ id: uid(), date: today(), sens: 'recu', objet: '', texte: '' })}>Ajouter un échange</button>
      <p className="text-[12px] text-charbon/55">Collez ici les mails importants (reçus ou envoyés), notez les appels. Les mails préparés depuis « Relation client » peuvent y être enregistrés en un clic.</p>
      {list.length === 0 && <p className="card p-6 text-[14px] text-charbon/60">Aucun échange enregistré.</p>}
      {list.map((e) => (
        <button key={e.id} type="button" onClick={() => setEdit(e)} className="card block w-full p-3 text-left hover:border-sauge">
          <p className="text-[12px] text-charbon/55">{fmtDate(e.date)} · {SENS[e.sens]}</p>
          <p className="font-medium">{e.objet || 'Sans objet'}</p>
          <p className="line-clamp-2 whitespace-pre-line text-[13px] text-charbon/70">{e.texte}</p>
        </button>
      ))}
      {edit && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-charbon/30 p-4" onClick={() => setEdit(null)}>
          <div className="card w-full max-w-lg space-y-3 p-5" onClick={(x) => x.stopPropagation()}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><Input type="date" value={edit.date} onChange={(x) => setEdit({ ...edit, date: x.target.value })} /></Field>
              <Field label="Type">
                <select value={edit.sens} onChange={(x) => setEdit({ ...edit, sens: x.target.value as Echange['sens'] })} className="field">
                  {(Object.keys(SENS) as Echange['sens'][]).map((k) => <option key={k} value={k}>{SENS[k]}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Objet"><Input value={edit.objet} onChange={(x) => setEdit({ ...edit, objet: x.target.value })} /></Field>
            <Field label="Contenu"><TextArea rows={8} value={edit.texte} onChange={(v) => setEdit({ ...edit, texte: v })} /></Field>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" onClick={() => { set(echanges.some((x) => x.id === edit.id) ? echanges.map((x) => (x.id === edit.id ? edit : x)) : [...echanges, edit]); setEdit(null); }}>Enregistrer</button>
              {echanges.some((x) => x.id === edit.id) && <button type="button" className="btn-ghost text-terre" onClick={() => { set(echanges.filter((x) => x.id !== edit.id)); setEdit(null); }}>Supprimer</button>}
              <button type="button" className="btn-quiet ml-auto" onClick={() => setEdit(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORIES_DOC = ['Plan', 'Plan cadastral', 'Plan ancien', 'Photo ancienne', 'Acte, titre de propriété', 'Ancien diagnostic', 'Devis d’entreprise', 'Facture de travaux', 'Autre'];
function ClasseurDocuments({ dossier, documents, set }: { dossier: Dossier; documents: Photo[]; set: (d: Photo[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [cat, setCat] = useState(CATEGORIES_DOC[0]);
  const [err, setErr] = useState<string | null>(null);
  async function add(files: FileList | null) {
    if (!files) return;
    setErr(null);
    const out: Photo[] = [];
    for (const f of Array.from(files)) {
      if (f.type.startsWith('image/')) {
        const p = await fileToPhoto(f, 2400, 0.85);
        out.push({ ...p, nom: f.name, categorie: cat, date: today() });
      } else if (f.type === 'application/pdf') {
        if (f.size > 8 * 1024 * 1024) { setErr(`« ${f.name} » dépasse 8 Mo : compressez-le avant de l’ajouter.`); continue; }
        const src = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); });
        out.push({ id: uid(), src, nom: f.name, categorie: cat, mime: 'application/pdf', date: today() });
      } else setErr(`« ${f.name} » : seuls les images et les PDF sont acceptés.`);
    }
    set([...documents, ...out]);
  }
  const auto = [
    ...dossier.contexte.vues.map((v) => ({ p: v, cat: 'Carte du rapport' })),
    ...(dossier.plansZones ?? []).filter((p) => p.image).map((p) => ({ p: { ...p.image!, legende: p.titre }, cat: 'Plan de repérage' })),
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Catégorie"><select value={cat} onChange={(e) => setCat(e.target.value)} className="field w-auto">{CATEGORIES_DOC.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <button type="button" className="btn-primary" onClick={() => ref.current?.click()}>Ajouter des fichiers (images, PDF)</button>
        <input ref={ref} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {err && <p className="text-[13px] text-terre">{err}</p>}
      {CATEGORIES_DOC.map((k) => {
        const l = documents.filter((d) => (d.categorie ?? 'Autre') === k);
        if (!l.length) return null;
        return (
          <div key={k} className="card p-4">
            <p className="label-caps mb-2">{k}</p>
            <ul className="space-y-1.5">
              {l.map((d) => (
                <li key={d.id} className="flex items-center gap-3 text-[14px]">
                  {d.mime === 'application/pdf'
                    ? <span className="grid h-10 w-10 place-items-center rounded bg-terre-50 text-[10px] font-bold text-terre">PDF</span>
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={d.src} alt="" className="h-10 w-14 rounded object-cover" />}
                  <a href={d.src} target="_blank" rel="noreferrer" download={d.nom} className="flex-1 truncate text-foret underline decoration-pierre">{d.nom || d.legende || 'Document'}</a>
                  <span className="text-[12px] text-charbon/50">{d.date ? fmtDate(d.date) : ''}</span>
                  <button type="button" className="text-terre" onClick={() => set(documents.filter((x) => x.id !== d.id))} aria-label="Retirer">×</button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {auto.length > 0 && (
        <div className="card p-4">
          <p className="label-caps mb-2">Cartes et plans du rapport</p>
          <div className="flex flex-wrap gap-2">
            {auto.map((a, i) => (
              <a key={i} href={a.p.src} target="_blank" rel="noreferrer" className="block w-32" title={a.p.legende}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.p.src} alt="" className="aspect-[4/3] w-full rounded object-cover" />
                <span className="block truncate text-[10px] text-charbon/55">{a.p.legende || a.cat}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {!documents.length && !auto.length && <p className="card p-6 text-[14px] text-charbon/60">Rangez ici les plans, actes, anciens diagnostics, devis d’entreprises…</p>}
    </div>
  );
}

export { precoOf };

/* ───────────── Schéma des zones : rectangles de couleur, vue de dessus ───────────── */
const PALETTE = ['#D6C7AF', '#B97A5B', '#68725E', '#7FA3B5', '#C9A15A', '#9C6B8E', '#A9B7A0', '#E8DCC8'];
type Forme = NonNullable<PlanZones['formes']>[number];

export function SchemaZones({ plan, zones, onChange }: { plan: PlanZones; zones: { code: string; nom: string; categorie: ZoneCategory }[]; onChange: (p: PlanZones) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const action = useRef<{ id: string; mode: 'move' | 'resize'; x0: number; y0: number; f0: Forme } | null>(null);
  const formes = plan.formes ?? [];
  const setFormes = (f: Forme[]) => onChange({ ...plan, formes: f });
  const pt = (e: React.PointerEvent) => { const r = svg.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }; };
  const ajouter = (code: string, cat: ZoneCategory) => {
    const n = formes.length;
    const f: Forme = { id: uid(), code, x: 6 + (n % 4) * 22, y: 8 + Math.floor(n / 4) * 26 % 70, w: 20, h: 22, couleur: COULEUR_CATEGORIE[cat] };
    setFormes([...formes, f]); setSel(f.id);
  };
  const onMove = (e: React.PointerEvent) => {
    const a = action.current; if (!a) return;
    const p = pt(e); const dx = p.x - a.x0, dy = p.y - a.y0;
    setFormes(formes.map((f) => f.id !== a.id ? f : a.mode === 'move'
      ? { ...f, x: Math.max(0, Math.min(100 - f.w, a.f0.x + dx)), y: Math.max(0, Math.min(100 - f.h, a.f0.y + dy)) }
      : { ...f, w: Math.max(4, Math.min(100 - f.x, a.f0.w + dx)), h: Math.max(4, Math.min(100 - f.y, a.f0.h + dy)) }));
  };
  const s = formes.find((f) => f.id === sel);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[12px]">
        <span className="text-charbon/60">Ajouter une zone :</span>
        {zones.map((z) => <button key={z.code} type="button" onClick={() => ajouter(z.code, z.categorie)} className={`rounded-full border px-2.5 py-0.5 ${formes.some((f) => f.code === z.code) ? 'border-sauge text-sauge' : 'border-pierre'}`}>+ {z.code}</button>)}
        {!zones.length && <span className="text-terre">créez d’abord les zones</span>}
      </div>
      <svg ref={svg} viewBox="0 0 100 70" preserveAspectRatio="none" className="aspect-[10/7] w-full touch-none select-none rounded border border-pierre-100 bg-[#FBF9F5]"
        onPointerMove={onMove} onPointerUp={() => { action.current = null; }} onPointerLeave={() => { action.current = null; }} onPointerDown={(e) => { if (e.target === svg.current) setSel(null); }}>
        {Array.from({ length: 9 }).map((_, i) => <line key={'v' + i} x1={(i + 1) * 10} x2={(i + 1) * 10} y1={0} y2={70} stroke="#EFE7D8" strokeWidth={0.15} />)}
        {Array.from({ length: 6 }).map((_, i) => <line key={'h' + i} y1={(i + 1) * 10} y2={(i + 1) * 10} x1={0} x2={100} stroke="#EFE7D8" strokeWidth={0.15} />)}
        {formes.map((f) => {
          const y = (f.y / 100) * 70, h = (f.h / 100) * 70;
          const nom = zones.find((z) => z.code === f.code)?.nom ?? '';
          return (
            <g key={f.id}>
              <rect x={f.x} y={y} width={f.w} height={h} fill={f.couleur} fillOpacity={0.85} stroke={sel === f.id ? '#334B3D' : '#fff'} strokeWidth={sel === f.id ? 0.5 : 0.3} style={{ cursor: 'move' }}
                onPointerDown={(e) => { e.stopPropagation(); (e.target as Element).setPointerCapture?.(e.pointerId); setSel(f.id); const p = pt(e); action.current = { id: f.id, mode: 'move', x0: p.x, y0: p.y, f0: f }; }} />
              <text x={f.x + f.w / 2} y={y + h / 2} textAnchor="middle" fontSize={2.6} fontWeight={700} fill="#2D332F" style={{ pointerEvents: 'none', fontFamily: 'Montserrat, sans-serif' }}>{f.code}</text>
              {nom && f.w > 10 && <text x={f.x + f.w / 2} y={y + h / 2 + 3.2} textAnchor="middle" fontSize={2} fill="#2D332F" style={{ pointerEvents: 'none' }}>{nom.length > 22 ? nom.slice(0, 21) + '…' : nom}</text>}
              {sel === f.id && <rect x={f.x + f.w - 1.6} y={y + h - 1.6} width={2.4} height={2.4} fill="#334B3D" style={{ cursor: 'nwse-resize' }}
                onPointerDown={(e) => { e.stopPropagation(); (e.target as Element).setPointerCapture?.(e.pointerId); const p = pt(e); action.current = { id: f.id, mode: 'resize', x0: p.x, y0: p.y, f0: f }; }} />}
            </g>
          );
        })}
      </svg>
      {s ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="font-semibold">{s.code}</span>
          {PALETTE.map((c) => <button key={c} type="button" onClick={() => setFormes(formes.map((f) => (f.id === s.id ? { ...f, couleur: c } : f)))} className={`h-5 w-5 rounded-full border ${s.couleur === c ? 'border-foret ring-2 ring-foret/30' : 'border-white'}`} style={{ background: c }} aria-label="Couleur" />)}
          <button type="button" className="btn-quiet text-[12px]" onClick={() => { const c = { ...s, id: uid(), x: Math.min(80, s.x + 4), y: Math.min(70, s.y + 4) }; setFormes([...formes, c]); setSel(c.id); }}>Dupliquer</button>
          <button type="button" className="btn-quiet text-[12px] text-terre" onClick={() => { setFormes(formes.filter((f) => f.id !== s.id)); setSel(null); }}>Supprimer</button>
        </div>
      ) : <p className="mt-2 text-[12px] text-charbon/55">Glissez les rectangles pour les placer ; sélectionnez-en un pour l’agrandir (coin en bas à droite), changer sa couleur ou le supprimer.</p>}
    </div>
  );
}

/* ───────────── Questionnaire préalable → rédaction ───────────── */
export function QuestionnaireProjet({ dossier, update }: StepProps) {
  const { lib } = useLibrary();
  const q = dossier.commercial?.questionnaire;
  const [ouvert, setOuvert] = useState(false);
  const [brouillon, setBrouillon] = useState<Questionnaire | undefined>(q);
  const [msg, setMsg] = useState<string | null>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const appliquer = (qq: Questionnaire) => {
    const r = appliquerQuestionnaire(dossier, qq);
    update(r.d);
    setMsg(`Rédaction complétée : ${r.remplis.join(', ')}. Les champs déjà rédigés n’ont pas été remplacés.`);
    setOuvert(false);
  };
  async function importer(f?: File) {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const qq = { ...QUESTIONNAIRE_VIDE, ...(j.questionnaire ?? j) } as Questionnaire;
      setBrouillon(qq); setOuvert(true);
      setMsg('Questionnaire importé : vérifiez les réponses puis cliquez sur « Remplir la rédaction ».');
    } catch { setMsg('Ce fichier n’est pas un questionnaire lisible (fichier .json attendu).'); }
  }
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 font-serif text-lg font-semibold text-foret">Questionnaire préalable</p>
        {q && !ouvert && <button type="button" className="btn-primary" onClick={() => appliquer(q)}>Remplir la rédaction avec le questionnaire</button>}
        <button type="button" className="btn-ghost" onClick={() => { setBrouillon(q ?? brouillon); setOuvert(!ouvert); }}>{ouvert ? 'Fermer' : q ? 'Voir ou modifier' : 'Remplir le questionnaire'}</button>
        <button type="button" className="btn-quiet text-[13px]" onClick={() => fichier.current?.click()}>Importer un fichier</button>
        <input ref={fichier} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { importer(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <p className="mt-1 text-[12px] text-charbon/55">{q ? `Rempli${dossier.commercial?.devis.length ? ' lors du devis' : ''} : ${Q_LABELS.typeBatiment[q.typeBatiment].toLowerCase()}, ${Q_LABELS.etendue[q.etendue].toLowerCase()}${q.zonesConcernees ? ` (${q.zonesConcernees})` : ''}.` : 'Les réponses du client (type de bâtiment, étendue, accès, documents…) préremplissent le projet et le contexte.'}</p>
      {msg && <p className="mt-2 text-[13px] text-sauge">{msg}</p>}
      {ouvert && (
        <div className="mt-4 border-t border-pierre-100 pt-4">
          <QuestionnaireForm value={brouillon} onChange={setBrouillon} rayonKm={lib.entreprise.rayonKm} />
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn-primary" onClick={() => appliquer({ ...QUESTIONNAIRE_VIDE, ...(brouillon ?? {}) })}>Enregistrer et remplir la rédaction</button>
            <button type="button" className="btn-quiet" onClick={() => update({ ...dossier, commercial: { devis: [], factures: [], ...dossier.commercial, questionnaire: { ...QUESTIONNAIRE_VIDE, ...(brouillon ?? {}) } } })}>Enregistrer seulement</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Périmètre : tout le bâtiment, une partie ou une seule zone (cave, cheminée, façade…). */
export function PerimetreChoix({ dossier, update }: StepProps) {
  const p = dossier.meta.perimetre ?? { etendue: 'complet' as const, detail: '' };
  const set = (x: Partial<typeof p>) => update({ ...dossier, meta: { ...dossier.meta, perimetre: { ...p, ...x } } });
  return (
    <div>
      <p className="label-caps mb-1.5">Périmètre de la mission</p>
      <div className="flex flex-wrap gap-1.5">
        {([['complet', 'Tout le bâtiment'], ['partiel', 'Une partie du bâtiment'], ['zone', 'Une seule zone ou un seul ouvrage']] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => set({ etendue: k })} className={`rounded-full border px-3 py-1.5 text-[13px] ${p.etendue === k ? 'border-foret bg-foret text-ivoire' : 'border-pierre bg-white'}`}>{l}</button>
        ))}
      </div>
      {p.etendue !== 'complet' && (
        <div className="mt-2">
          <Input value={p.detail} onChange={(e) => set({ detail: e.target.value })} placeholder="Parties concernées : cave et sous-sol, cheminée, façade sur rue…" />
          <div className="mt-1.5 flex flex-wrap gap-1">{ZONES_PERIMETRE.map((z) => <button key={z} type="button" onClick={() => set({ detail: p.detail ? `${p.detail}, ${z.toLowerCase()}` : z })} className="rounded-full border border-pierre bg-white px-2 py-0.5 text-[11px]">+ {z}</button>)}</div>
        </div>
      )}
      <p className="mt-1.5 text-[12px] italic text-charbon/55">Dans le rapport : « {phrasePerimetre(p)} »</p>
    </div>
  );
}

/** Liens pour trouver une vue d'ensemble de l'édifice (Google Earth, Street View). */
export function LiensVueEnsemble({ dossier }: { dossier: Dossier }) {
  const b = dossier.meta.bien;
  const adresse = [b.adresse, b.codePostal, b.commune].filter(Boolean).join(' ');
  const pt = parseGps(b.gps ?? '');
  if (!adresse.trim() && !pt) return <p className="mt-1 text-[11px] text-charbon/50">Renseignez l’adresse pour obtenir les liens Google Earth et Street View.</p>;
  const q = encodeURIComponent(adresse);
  return (
    <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
      <span className="text-charbon/55">Vue d’ensemble :</span>
      <a className="text-foret underline" target="_blank" rel="noreferrer" href={pt ? `https://earth.google.com/web/@${pt.lat},${pt.lon},150a,300d,35y,0h,60t,0r` : `https://earth.google.com/web/search/${q}`}>Google Earth (3D) ↗</a>
      <a className="text-foret underline" target="_blank" rel="noreferrer" href={pt ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${pt.lat},${pt.lon}` : `https://www.google.com/maps/search/?api=1&query=${q}`}>Street View ↗</a>
      <span className="text-charbon/45">Faites une capture, puis collez-la sur la photo (Ctrl+V).</span>
    </p>
  );
}
