'use client';
import { CONFIDENCE_LABEL, DEFAULT_PHASE, PHASES } from '@/lib/constants';
import type { Confidence, DeliverableType, Desordre, LigneChiffrage, Phase, Priority, Solution, Zone } from '@/lib/types';
import type { PreconisationType } from '@/lib/preconisations';
import { estimatePrix } from '@/lib/business';
import { fmtEUR } from '@/lib/calc';
import { uid } from '@/lib/factory';
import { Combo, Field, LotsChips, Input, PhotoDrop, PriorityBadge, PriorityPicker, Select, TextArea, money, parseNum } from './ui';
import { useState } from 'react';
import { FAMILLES } from '@/lib/templates';
import { useLibrary } from './LibraryProvider';
import PhraseField from './PhraseField';
import { applyTemplate, avecLots, lotsDe } from '@/lib/factory';
import { alpha, devinerFamille } from '@/lib/classement';
import { adapterTexte } from '@/lib/pressePapier';
import { CATEGORIES_DESORDRE, CATEGORIES_PRECO, categorieDesordre, motsDesordre } from '@/lib/catalogue';
import { PRECISIONS_VERIF, ficheApprenable, ficheVersModele, modeleDe, sansMentionVerif, suggestions as suggestionsDe } from '@/lib/fiches';
import Catalogue, { itemsDesordres, itemsPrecos } from './Catalogue';

interface Props {
  desordre: Desordre;
  zones: Zone[];
  onChange: (d: Desordre) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  /** Copier la fiche pour la coller dans une autre zone ou un autre dossier */
  onCopy?: () => void;
  onClose?: () => void;
  mode?: DeliverableType;
  photosDispo?: { photo: import('@/lib/types').Photo; label: string }[];
  /** Autres fiches du même désordre, synchronisées avec celle-ci */
  jumelles?: { numero: string; zoneCode: string }[];
}

/**
 * Éditeur d'une fiche désordre (module répétable D-XXX, référentiel §7.2).
 * Ordre de saisie = ordre de lecture du rapport : CONST → HYP → investigations → ACT → chiffrage.
 */
export default function FicheDesordreEditor({ desordre: d, zones, onChange, onDelete, onDuplicate, onCopy, onClose, jumelles = [], mode = 'conseil', photosDispo }: Props) {
  const simple = mode === 'avis';
  const avecSolutions = mode === 'diagnostic';
  const avecChiffrage = mode === 'conseil' || mode === 'accompagnement';
  const set = <K extends keyof Desordre>(k: K, v: Desordre[K]) => onChange({ ...d, [k]: v });
  const setChiffrage = (k: keyof Desordre['chiffrage'], v: number | string | null) => onChange({ ...d, chiffrage: { ...d.chiffrage, [k]: v } });

  const setPriority = (p: Priority) =>
    // La phase suit la priorité tant qu'elle n'a pas été ajustée à la main
    onChange({ ...d, priorite: p, phase: d.phase === DEFAULT_PHASE[d.priorite] ? DEFAULT_PHASE[p] : d.phase });

  // La mention est rendue en italique dans le livrable : plus de phrase ajoutée au texte
  const toggleAVerifier = (on: boolean) => onChange({ ...d, aVerifier: on, analyse: sansMentionVerif(d.analyse) });

  const { lib, phrases, noteUse, addPhrase, addDesordreType, apprendre } = useLibrary();
  const zoneFiche = zones.find((z) => z.code === d.zoneCode);
  const modele = modeleDe(lib, d.type);
  const [appris, setAppris] = useState<string | null>(null);
  const enrichir = (f: Desordre) => {
    if (!f.type.trim() || f.type === 'À qualifier' || !f.constat.trim()) return false;
    apprendre([ficheVersModele(f, zoneFiche, modele?.exact ? modele.t : undefined)]);
    setAppris(modele?.exact ? `Le désordre type « ${modele.t.type} » de votre bibliothèque reprend maintenant cette fiche.` : `« ${f.type} » est ajouté à votre bibliothèque.`);
    setTimeout(() => setAppris(null), 5000);
    return true;
  };
  const [voirSugg, setVoirSugg] = useState(false);
  const sugg = suggestionsDe(d, lib, mode);
  const templates = lib.desordres;
  const [pendingTpl, setPendingTpl] = useState<string | null>(null);
  const [copiee, setCopiee] = useState(false);
  const hasText = Boolean(d.constat.trim() || d.analyse.trim() || d.preconisation.trim());
  const pickTemplate = (type: string) => {
    const t = templates.find((x) => x.type === type);
    if (!t) return;
    if (hasText && pendingTpl !== type) { setPendingTpl(type); return; }
    setPendingTpl(null);
    noteUse('desordre', t.type);
    let applied = applyTemplate(d, t);
    if (avecSolutions && !(d.solutions ?? []).length) {
      const sugg = lib.preconisations.filter((x) => x.pour?.includes(t.type)).slice(0, 3);
      applied = { ...applied, solutions: sugg.length ? sugg.map(solutionFrom) : [{ id: uid(), titre: 'Solution proposée', texte: t.preconisation }] };
    }
    const nl = avecChiffrage && t.prixId && !lignes.length ? ligneFor(t.prixId, d.chiffrage.quantite || 1) : null;
    onChange(nl ? withLignes(applied, [nl]) : applied);
  };
  const blanks = (d.constat + d.analyse + d.investigations + d.preconisation).split('…').length - 1;

  /* ─── Lignes de chiffrage reliées à la bibliothèque de prix ─── */
  const lignes = d.chiffrage.lignes ?? [];
  const lots = [...new Set(lib.prix.map((p) => p.lot))].sort((a, b) => a.localeCompare(b, 'fr'));
  const withLignes = (base: Desordre, ls: LigneChiffrage[]): Desordre => ({
    ...base,
    chiffrage: {
      ...base.chiffrage,
      lignes: ls,
      bas: ls.length ? Math.round(ls.reduce((a, l) => a + l.puBas * l.quantite, 0)) : base.chiffrage.bas,
      haut: ls.length ? Math.round(ls.reduce((a, l) => a + l.puHaut * l.quantite, 0)) : base.chiffrage.haut,
      quantite: ls[0]?.quantite ?? base.chiffrage.quantite,
      unite: ls[0]?.unite ?? base.chiffrage.unite,
    },
  });
  const setLignes = (ls: LigneChiffrage[]) => onChange(withLignes(d, ls));
  const setLigne = (id: string, patch: Partial<LigneChiffrage>) => setLignes(lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const ligneFor = (prixId: string, quantite: number): LigneChiffrage | null => {
    const p = lib.prix.find((x) => x.id === prixId);
    if (!p) return null;
    const e = estimatePrix(p);
    return { id: uid(), prixId, libelle: p.libelle, quantite, unite: p.unite, puBas: e.bas, puHaut: e.haut };
  };
  const setLigneOuvrage = (id: string, prixId: string) => {
    const old = lignes.find((l) => l.id === id);
    const nl = prixId ? ligneFor(prixId, old?.quantite || 1) : null;
    if (nl) setLignes(lignes.map((l) => (l.id === id ? { ...nl, id } : l)));
  };
  const addLigne = () => {
    const first = templates.find((t) => t.type === d.type)?.prixId;
    const nl = first ? ligneFor(first, d.chiffrage.quantite || 1) : { id: uid(), libelle: '', quantite: 1, unite: 'forfait', puBas: 0, puHaut: 0 };
    if (nl) setLignes([...lignes, nl]);
  };
  const refreshPrix = () => setLignes(lignes.map((l) => {
    const p = l.prixId ? lib.prix.find((x) => x.id === l.prixId) : null;
    if (!p) return l;
    const e = estimatePrix(p);
    return { ...l, puBas: e.bas, puHaut: e.haut };
  }));

  /* ─── Préconisations types et solutions ─── */
  const solutionFrom = (p: PreconisationType): Solution => ({ id: uid(), titre: p.titre, texte: p.texte });
  const suggerees = lib.preconisations.filter((x) => x.pour?.includes(d.type));
  const familles = [...new Set(lib.preconisations.map((x) => x.famille))];
  const pickPreco = (id: string) => {
    const p = lib.preconisations.find((x) => x.id === id);
    if (!p) return;
    noteUse('preconisation', p.id);
    if (avecSolutions) onChange({ ...d, solutions: [...(d.solutions ?? []), solutionFrom(p)] });
    else onChange({ ...d, preconisation: d.preconisation.trim() ? `${d.preconisation.trim()}\n${p.texte}` : p.texte, lot: d.lot || p.lot, lots: Array.from(new Set([...lotsDe(d), ...lotsDe(p)])) });
  };
  const solutions = d.solutions ?? [];
  const setSolutions = (l: Solution[]) => onChange({ ...d, solutions: l });
  const PrecoSelect = ({ label }: { label: string }) => (
    <Catalogue label={label} items={itemsPrecos(lib.preconisations, d.type)} ordre={CATEGORIES_PRECO} onPick={pickPreco} titrePropose={`Proposées pour « ${d.type} »`} cleRangement="atelier-rangement-precos" className="min-w-[260px]" />
  );

  const rangeError = d.chiffrage.bas != null && d.chiffrage.haut != null && d.chiffrage.haut < d.chiffrage.bas;

  return (
    <article className="card">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-t-lg border-b border-pierre-100 bg-ivoire/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="font-serif text-2xl font-semibold text-foret">{d.numero}</span>
          <PriorityBadge p={d.priorite} />
          <span className="text-sm text-charbon/60">{d.type}</span>
        </div>
        <div className="flex items-center gap-1">
          {onCopy && <button type="button" onClick={() => { onCopy(); setCopiee(true); setTimeout(() => setCopiee(false), 2500); }} className="btn-quiet text-[13px]" title="Copier pour coller dans une autre zone (étape Photos) ou un autre dossier">{copiee ? 'Copiée ✓ — collez-la depuis Photos' : '⧉ Copier'}</button>}
          {d.type.trim() && d.type !== 'À qualifier' && d.constat.trim() && <button type="button" onClick={() => enrichir(d)} className="btn-quiet text-[13px]" title="Enregistrer cette fiche comme désordre type de votre bibliothèque (les noms de zone sont remplacés par « … »)">↥ Modèle</button>}
          <button type="button" onClick={onDuplicate} className="btn-quiet text-[13px]">Dupliquer</button>
          <button type="button" onClick={onDelete} className="btn-quiet text-[13px] text-terre hover:text-p1">Supprimer</button>
          {onClose && <button type="button" onClick={onClose} className="btn-ghost ml-1 min-h-[36px] text-[13px]">Fermer</button>}
        </div>
      </header>

      <div className="space-y-7 p-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
          {jumelles.length > 0 && !d.independante && (
            <p className="min-w-0 flex-1 rounded-md bg-sauge-50 px-3 py-2 text-foret">
              ⇄ Même désordre que {jumelles.map((j) => `${j.numero} (${j.zoneCode})`).join(', ')} : ce que vous rédigez ici se reporte sur ces fiches, sauf sur les textes que vous y avez personnalisés.
            </p>
          )}
          <label className="flex items-center gap-1.5 text-charbon/70"><input type="checkbox" checked={!!d.general} onChange={(e) => onChange({ ...d, general: e.target.checked })} /> Désordre général (tout le bâtiment, sans photo)</label>
          {(jumelles.length > 0 || d.independante) && (
            <label className="flex items-center gap-1.5 text-charbon/70"><input type="checkbox" checked={!!d.independante} onChange={(e) => onChange({ ...d, independante: e.target.checked })} /> Ne pas synchroniser cette fiche</label>
          )}
        </div>
        {d.aRelire && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-terre/40 bg-terre-50 px-4 py-3">
            <p className="text-[13px] text-charbon/80">
              Texte pré-rédigé à partir du désordre type : à adapter à ce que vous avez observé.
              {blanks > 0 && <> Il reste <b>{blanks} « … »</b> à compléter.</>}
            </p>
            <button type="button" className="btn-ghost min-h-[36px] text-[13px]" title="La fiche relue enrichit aussi votre bibliothèque (désordre type du même nom)"
              onClick={() => { const f = { ...d, aRelire: false }; onChange(f); if (ficheApprenable(f)) enrichir(f); }}>Marquer comme relu</button>
          </div>
        )}

        {appris && <p className="rounded-md bg-sauge-50 px-3 py-2 text-[13px] text-foret">✓ {appris}</p>}
        {sugg.length > 0 && (
          <div className="rounded-md border border-pierre-100 bg-ivoire/60">
            <button type="button" className="flex w-full items-center justify-between px-4 py-2 text-left text-[13px] text-foret" onClick={() => setVoirSugg(!voirSugg)} aria-expanded={voirSugg}>
              <span>💡 {sugg.length} proposition{sugg.length > 1 ? 's' : ''} d’amélioration</span><span aria-hidden>{voirSugg ? '▴' : '▾'}</span>
            </button>
            {voirSugg && (
              <ul className="space-y-1.5 border-t border-pierre-100 px-4 py-3">
                {sugg.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-start justify-between gap-2 text-[13px] text-charbon/80">
                    <span className="min-w-0 flex-1">{x.texte}</span>
                    {x.appliquer && <button type="button" className="btn-ghost min-h-[30px] px-2 text-[12px]" onClick={() => onChange(x.appliquer!(d))}>Appliquer</button>}
                    {x.biblio && <button type="button" className="btn-ghost min-h-[30px] px-2 text-[12px]" onClick={() => enrichir(d)}>Ajouter à ma bibliothèque</button>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <Field label="Pré-remplir avec un désordre type" className="min-w-[240px] flex-1">
            <Catalogue label="Choisir un modèle dans toute ma bibliothèque…" items={itemsDesordres(templates)} ordre={CATEGORIES_DESORDRE} onPick={pickTemplate} cleRangement="atelier-rangement-desordres" />
          </Field>
          {pendingTpl && (
            <div className="flex items-center gap-2 pb-1 text-[13px]">
              <span className="text-terre">Remplacer les textes actuels ?</span>
              <button type="button" className="btn-primary min-h-[36px]" onClick={() => pickTemplate(pendingTpl)}>Remplacer</button>
              <button type="button" className="btn-quiet min-h-[36px]" onClick={() => setPendingTpl(null)}>Annuler</button>
            </div>
          )}
        </div>

        {/* Identification */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Field label="Localisation">
            <Select value={d.zoneCode} onChange={(v) => {
              const a = zones.find((z) => z.code === d.zoneCode), n = zones.find((z) => z.code === v);
              const ad = (t: string) => adapterTexte(t, a, n);
              onChange({ ...d, zoneCode: v, constat: ad(d.constat), analyse: ad(d.analyse), investigations: ad(d.investigations), preconisation: ad(d.preconisation), solutions: d.solutions?.map((x) => ({ ...x, titre: ad(x.titre), texte: ad(x.texte) })) });
            }}
              options={[{ value: '', label: '— Choisir une zone —' }, ...zones.map((z) => ({ value: z.code, label: `${z.code} · ${z.nom}` }))]} />
          </Field>
          <Field label="Élément">
            <Combo value={d.element} onChange={(v) => set('element', v)} options={phrases('elements')} placeholder="Choisir ou écrire…"
              onCreate={(v) => { addPhrase('elements', v); set('element', v); }} createLabel="Ajouter à mes éléments" />
          </Field>
          <Field label="Type de désordre">
            <Combo value={d.type} onChange={(v) => set('type', v)} options={templates.map((x) => x.type)} placeholder="Choisir ou écrire…"
              groupe={(o) => { const t = templates.find((x) => x.type === o); return t ? categorieDesordre(t) : undefined; }} ordreGroupes={CATEGORIES_DESORDRE}
              mots={(o) => { const t = templates.find((x) => x.type === o); return t ? motsDesordre(t) : ''; }}
              onCreate={(v) => { const t = addDesordreType(v, { element: d.element || 'Mur', priorite: d.priorite, lot: d.lot }); onChange({ ...d, type: t.type, famille: t.famille }); }} createLabel="Nouveau désordre type (rangé dans « À catégoriser »)" />
          </Field>
        </section>

        <Field label="Priorité">
          <PriorityPicker value={d.priorite} onChange={setPriority} />
        </Field>

        {/* Duo photo */}
        <section className="grid gap-4 sm:grid-cols-2">
          <PhotoDrop title="Photo 1 — Vue d’ensemble" hint="Situer le désordre dans l’espace" photo={d.photoEnsemble} onChange={(p) => set('photoEnsemble', p)} choix={photosDispo} />
          <PhotoDrop title="Photo 2 — Zoom / détail" hint="Montrer le mécanisme de dégradation" photo={d.photoDetail} onChange={(p) => set('photoDetail', p)} choix={photosDispo} />
        </section>

        {(
          <div>
            <p className="label-caps mb-2">Photos complémentaires</p>
            <div className="flex flex-wrap items-start gap-2">
              {(d.autresPhotos ?? []).map((p, i) => (
                <figure key={p.id ?? i} className="w-28">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="" className="aspect-[4/3] w-full rounded object-cover" />
                  <button type="button" className="mt-1 text-[11px] text-terre hover:underline" onClick={() => set('autresPhotos', (d.autresPhotos ?? []).filter((_, j) => j !== i))}>Retirer</button>
                </figure>
              ))}
              <div className="w-40"><PhotoDrop title="Ajouter" hint="Autre photo" photo={null} onChange={(p) => p && set('autresPhotos', [...(d.autresPhotos ?? []), p])} choix={photosDispo} /></div>
            </div>
          </div>
        )}

        {/* Lecture en niveaux */}
        <section className="space-y-5">
          <div data-champ="constat"><PhraseField phraseKey="constat" label={simple ? 'Observation (courte)' : '1 · Constat factuel'} hint={simple ? 'une ou deux phrases suffisent pour l’avis' : 'ce qui est visible'} rows={simple ? 2 : 3} value={d.constat} onChange={(v) => set('constat', v)} placeholder="Ex. Fissure verticale traversante, ouverture 1 à 2 mm, à l’angle nord-est, de l’appui de fenêtre jusqu’à l’égout…" /></div>

          {!simple && <div data-champ="analyse">
            <PhraseField phraseKey="analyse" label="2 · Analyse et hypothèses" hint="causes probables" value={d.analyse} onChange={(v) => set('analyse', v)} placeholder="Ex. Défaut de chaînage d’angle ou tassement différentiel…" />
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <span className="label-caps">Confiance</span>
                <div className="flex overflow-hidden rounded-md border border-pierre">
                  {(Object.keys(CONFIDENCE_LABEL) as Confidence[]).map((c) => (
                    <button key={c} type="button" onClick={() => set('confiance', c)}
                      className={`min-h-[36px] px-3 text-[13px] ${d.confiance === c ? 'bg-sauge text-white' : 'bg-white text-charbon/70 hover:bg-sauge-50'}`}>
                      {CONFIDENCE_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-[13px] text-charbon/80">
                <input type="checkbox" checked={d.aVerifier} onChange={(e) => toggleAVerifier(e.target.checked)} className="h-4 w-4 accent-terre" />
                Hypothèse à vérifier (en italique dans le livrable)
              </label>
            </div>
            {d.aVerifier && (
              <div className="mt-2">
                <Field label="Ce qui reste à vérifier" hint="facultatif : sinon « par investigation spécifique »">
                  <Combo value={d.aVerifierPrecision ?? ''} onChange={(v) => set('aVerifierPrecision', v)} options={PRECISIONS_VERIF} placeholder="Ex. la présence de ciment reste à confirmer par une analyse de mortier" />
                </Field>
                <p className="mt-1 text-[11px] text-charbon/50">Astuce : entourez un mot d’astérisques (*enduit ciment*) pour le mettre en italique dans le livrable, par exemple quand la nature d’un matériau n’est pas certaine.</p>
              </div>
            )}
          </div>}

          {!simple && <div data-champ="investigations"><PhraseField phraseKey="investigations" label="3 · Investigations complémentaires" hint="facultatif" rows={2} value={d.investigations} onChange={(v) => set('investigations', v)} placeholder="Ex. Analyse de mortier, sondage local, diagnostic des bois…" /></div>}

          {!simple && !avecSolutions && (
            <div data-champ="preconisation">
              <PhraseField phraseKey="preconisation" label="4 · Préconisation et solution durable" hint="compatible bâti ancien" value={d.preconisation} onChange={(v) => set('preconisation', v)} placeholder="Ex. Purge des joints ciment et rejointoiement à la chaux, sable de rivière lavé…" />
              <div className="mt-2 flex flex-wrap items-start gap-2"><PrecoSelect label="+ Insérer une préconisation type…" /><EnregistrerPreco texte={d.preconisation} desordre={d} /></div>
            </div>
          )}

          {avecSolutions && (
            <div>
              <p className="label-caps mb-2">4 · Préconisations — solutions proposées</p>
              <div className="space-y-3">
                {solutions.map((so, i) => (
                  <div key={so.id} className={`rounded-md border p-3 ${so.recommandee ? 'border-sauge bg-sauge-50' : 'border-pierre-100'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-lg font-semibold text-terre">{String.fromCharCode(65 + i)}</span>
                      <input value={so.titre} onChange={(e) => setSolutions(solutions.map((x) => (x.id === so.id ? { ...x, titre: e.target.value } : x)))} className="field min-w-[200px] flex-1 py-1.5 text-[14px] font-medium" aria-label="Titre de la solution" />
                      <label className="flex items-center gap-1.5 text-[12px]"><input type="radio" checked={!!so.recommandee} onChange={() => setSolutions(solutions.map((x) => ({ ...x, recommandee: x.id === so.id })))} /> Recommandée</label>
                      <button type="button" className="px-1 text-charbon/50" disabled={i === 0} onClick={() => { const l = [...solutions]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; setSolutions(l); }} aria-label="Monter">↑</button>
                      <button type="button" className="px-1 text-terre" onClick={() => setSolutions(solutions.filter((x) => x.id !== so.id))} aria-label="Retirer">×</button>
                    </div>
                    <TextArea rows={2} value={so.texte} onChange={(v) => setSolutions(solutions.map((x) => (x.id === so.id ? { ...x, texte: v } : x)))} className="mt-2" />
                    <div className="mt-1"><EnregistrerPreco texte={so.texte} titre={so.titre} desordre={d} /></div>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <PrecoSelect label="+ Ajouter une préconisation type…" />
                  <button type="button" className="btn-ghost min-h-[36px] text-[13px]" onClick={() => setSolutions([...solutions, { id: uid(), titre: '', texte: '' }])}>+ Solution libre</button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Chiffrage */}
        {!avecChiffrage ? (!simple && (
          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Corps d’état (un ou plusieurs)" hint="le premier sert au chiffrage"><LotsChips value={lotsDe(d)} onChange={(l) => onChange(avecLots(d, l))} options={phrases('lots')} onCreate={(v) => addPhrase('lots', v)} /></Field>
          </section>
        )) : (
        <section>
          <p className="label-caps mb-3">5 · Estimation financière et intervention</p>
          <div className="space-y-2">
            {lignes.map((l) => (
              <div key={l.id} className="grid items-end gap-2 rounded-md border border-pierre-100 p-2 sm:grid-cols-[1fr_90px_auto]">
                <Field label="Ouvrage">
                  <select value={l.prixId ?? ''} onChange={(e) => setLigneOuvrage(l.id, e.target.value)} className="field py-2 text-[14px]">
                    <option value="">{l.prixId ? '—' : l.libelle || 'Choisir un ouvrage…'}</option>
                    {lots.map((lot) => (
                      <optgroup key={lot} label={lot}>
                        {lib.prix.filter((p) => p.lot === lot).sort((a, b) => alpha(a.libelle, b.libelle)).map((p) => <option key={p.id} value={p.id}>{p.libelle} ({p.unite})</option>)}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field label={`Quantité (${l.unite})`}><Input inputMode="decimal" value={String(l.quantite)} onChange={(e) => setLigne(l.id, { quantite: parseNum(e.target.value) ?? 0 })} /></Field>
                <div className="flex items-center gap-2 pb-2 text-[13px]">
                  <span className="whitespace-nowrap tabular-nums">{fmtEUR(l.puBas * l.quantite)} – {fmtEUR(l.puHaut * l.quantite)}</span>
                  <button type="button" className="px-1 text-terre" aria-label="Retirer la ligne" onClick={() => setLignes(lignes.filter((x) => x.id !== l.id))}>×</button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-ghost min-h-[36px] text-[13px]" onClick={() => addLigne()}>+ Ligne de chiffrage</button>
              {lignes.some((l) => l.prixId) && <button type="button" className="btn-quiet text-[12px]" onClick={refreshPrix}>Actualiser avec mes derniers prix</button>}
              {lignes.length > 0 && <span className="ml-auto text-[14px] font-medium tabular-nums">Total : {fmtEUR(d.chiffrage.bas ?? 0)} – {fmtEUR(d.chiffrage.haut ?? 0)} hors taxes</span>}
            </div>
          </div>
          {lignes.length === 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Quantité"><Input inputMode="decimal" value={money(d.chiffrage.quantite)} onChange={(e) => setChiffrage('quantite', parseNum(e.target.value))} /></Field>
              <Field label="Unité"><Combo value={d.chiffrage.unite} onChange={(v) => setChiffrage('unite', v)} options={['forfait', 'm²', 'mètre linéaire', 'unité', 'm³', 'jour']} /></Field>
              <Field label="Montant bas hors taxes"><Input inputMode="numeric" value={money(d.chiffrage.bas)} onChange={(e) => setChiffrage('bas', parseNum(e.target.value))} placeholder="€" /></Field>
              <Field label="Montant haut hors taxes"><Input inputMode="numeric" value={money(d.chiffrage.haut)} onChange={(e) => setChiffrage('haut', parseNum(e.target.value))} placeholder="€" className={rangeError ? '!border-p1' : ''} /></Field>
            </div>
          )}
          {rangeError && <p className="mt-2 text-[12px] text-p1">Le montant haut est inférieur au montant bas.</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Corps d’état (un ou plusieurs)" hint="le premier sert au chiffrage"><LotsChips value={lotsDe(d)} onChange={(l) => onChange(avecLots(d, l))} options={phrases('lots')} onCreate={(v) => addPhrase('lots', v)} /></Field>
            <Field label="Étape de la feuille de route">
              <Select value={String(d.phase)} onChange={(v) => set('phase', Number(v) as Phase)}
                options={(Object.keys(PHASES) as unknown as Phase[]).map((p) => ({ value: String(p), label: `${p}. ${PHASES[p].titre}` }))} />
            </Field>
          </div>
        </section>
        )}
      </div>
    </article>
  );
}

/** Enregistre une préconisation rédigée dans la fiche comme préconisation type de la bibliothèque. */
function EnregistrerPreco({ texte, titre, desordre }: { texte: string; titre?: string; desordre: Desordre }) {
  const { lib, addPreconisation } = useLibrary();
  const [form, setForm] = useState<{ titre: string; famille: PreconisationType['famille']; lot: string } | null>(null);
  const [ok, setOk] = useState(false);
  const t = texte.trim();
  const deja = lib.preconisations.some((p) => p.texte.trim() === t);
  if (!t || deja) return ok ? <span className="text-[12px] text-sauge">Rangée dans la bibliothèque ✓</span> : null;
  const ouvrir = () => {
    const tpl = lib.desordres.find((x) => x.type === desordre.type);
    const titreAuto = (titre?.trim() || t.split(/[.,;:\n]/)[0]).split(/\s+/).slice(0, 8).join(' ');
    setForm({ titre: titreAuto, famille: ((tpl && tpl.famille !== 'À catégoriser' ? tpl.famille : null) ?? devinerFamille(lib, `${desordre.type} ${t}`)) as PreconisationType['famille'], lot: desordre.lot });
  };
  if (!form) return <button type="button" className="text-[12px] text-sauge hover:text-foret" onClick={ouvrir}>+ Ranger cette préconisation dans ma bibliothèque</button>;
  return (
    <div className="flex w-full flex-wrap items-end gap-2 rounded-md border border-sauge/50 bg-sauge-50 p-2">
      <Field label="Titre" className="min-w-[200px] flex-1"><input className="field py-1.5 text-[13px]" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></Field>
      <Field label="Famille"><select className="field py-1.5 text-[13px]" value={form.famille} onChange={(e) => setForm({ ...form, famille: e.target.value as PreconisationType['famille'] })}>{FAMILLES.map((f) => <option key={f} value={f}>{f.replace(' & ', ' et ')}</option>)}</select></Field>
      <button type="button" className="btn-primary min-h-[36px] text-[13px]" disabled={!form.titre.trim()} onClick={() => {
        addPreconisation({ id: uid(), titre: form.titre.trim(), famille: form.famille, lot: form.lot, lots: lotsDe(desordre), texte: t, pour: desordre.type ? [desordre.type] : undefined });
        setForm(null); setOk(true);
      }}>Enregistrer</button>
      <button type="button" className="btn-quiet text-[13px]" onClick={() => setForm(null)}>Annuler</button>
      <p className="w-full text-[11px] text-charbon/55">Elle sera proposée pour « {desordre.type} » dans « + Insérer une préconisation type ».</p>
    </div>
  );
}
