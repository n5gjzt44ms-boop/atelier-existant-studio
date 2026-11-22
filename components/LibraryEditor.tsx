'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import type { PreconisationType } from '@/lib/preconisations';
import { GuideIllustration, type Guide } from './guides';
import { PRIORITY } from '@/lib/constants';
import { estimatePrix, type PrixItem } from '@/lib/business';
import { fmtEUR } from '@/lib/calc';
import { lotsDe, uid } from '@/lib/factory';
import { DEFAULT_PHRASES, PHRASE_LABELS, defaultLibrary, type PhraseKey } from '@/lib/library';
import { FAMILLES, type DesordreTemplate } from '@/lib/templates';
import { CATEGORIES_DESORDRE, CATEGORIES_PRECO, categorieDesordre, categoriePreco, correspond, doublonsProbables, fusionnerDesordres, fusionnerPrecos, motsDesordre, motsPreco } from '@/lib/catalogue';
import type { Priority } from '@/lib/types';
import { nouveauType, useLibrary } from './LibraryProvider';
import { suggererRangements, type Rangement } from '@/lib/classement';
import { Field, Input, LotsChips, Select, TextArea } from './ui';

type Section = 'desordres' | 'prix' | 'preconisations' | 'guides' | PhraseKey;
type Sort = 'manuel' | 'alpha' | 'usage';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const matches = (text: string, q: string) => norm(q).split(/\s+/).filter(Boolean).every((w) => norm(text).includes(w));
const fam = (f: string) => f.replace(' & ', ' et ');

/** Grands points de la bibliothèque, dans l'ordre des étapes du diagnostic. */
export const GROUPES_BIBLIO: { id: string; titre: string; sections: Section[] }[] = [
  { id: 'projet', titre: 'Projet et visite', sections: ['objetMission', 'personnesPresentes', 'conditionsAcces', 'meteo', 'limitesVisite'] },
  { id: 'contexte', titre: 'Contexte du bâti', sections: ['datation', 'typologie', 'systemeConstructif', 'materiaux', 'abords', 'geotechnique'] },
  { id: 'zones', titre: 'Zones', sections: ['zoneNoms', 'zoneObservations'] },
  { id: 'desordres', titre: 'Désordres', sections: ['desordres', 'elements', 'constat', 'analyse', 'investigations'] },
  { id: 'preconisations', titre: 'Préconisations', sections: ['preconisations', 'preconisation', 'lots'] },
  { id: 'vigilance', titre: 'Vigilance, études et mesures', sections: ['vigilance', 'etudes', 'mesure', 'avisTiers'] },
  { id: 'synthese', titre: 'Synthèse et souhaits', sections: ['bilan', 'conclusion', 'souhaits'] },
  { id: 'chiffrage', titre: 'Chiffrage des interventions', sections: ['prix'] },
  { id: 'guides', titre: 'Guides de bonnes pratiques', sections: ['guides'] },
];
const SECTION_LABEL = (k: Section) => ({ desordres: 'Désordres types', prix: 'Prix des interventions', preconisations: 'Préconisations types', guides: 'Guides illustrés' } as Record<string, string>)[k] ?? PHRASE_LABELS[k as PhraseKey];

/** « Ma bibliothèque » rangée en grands points, avec accès direct à chaque liste par menu déroulant. */
export default function LibraryEditor({ onClose, initial, groupe, embedded }: { onClose?: () => void; initial?: Section; groupe?: string; embedded?: boolean }) {
  const { lib, setLib, isFavori, toggleFavori, usageOf } = useLibrary();
  const firstOf = (g?: string) => GROUPES_BIBLIO.find((x) => x.id === g)?.sections[0];
  const [section, setSection] = useState<Section>(initial ?? firstOf(groupe) ?? 'desordres');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('manuel');
  const keys = Object.keys(PHRASE_LABELS) as PhraseKey[];
  useEffect(() => { const f = firstOf(groupe); if (f) setSection(f); }, [groupe]);

  const count = (k: Section) => k === 'desordres' ? lib.desordres.length : k === 'prix' ? lib.prix.length : k === 'preconisations' ? lib.preconisations.length : k === 'guides' ? lib.guides.length : lib.phrases[k]?.length ?? 0;
  const hits = useMemo(() => {
    if (!q.trim()) return null;
    const r: Partial<Record<Section, number>> = {
      desordres: lib.desordres.filter((t) => correspond(`${motsDesordre(t)} ${t.preconisation}`, q)).length,
      prix: lib.prix.filter((p) => matches(`${p.libelle} ${p.lot}`, q)).length,
      preconisations: lib.preconisations.filter((p) => correspond(motsPreco(p), q)).length,
      guides: lib.guides.filter((g) => matches(`${g.titre} ${g.principe}`, q)).length,
    };
    keys.forEach((k) => { r[k] = (lib.phrases[k] ?? []).filter((t) => matches(t, q)).length; });
    return r;
  }, [q, lib, keys]);
  const groupeActif = GROUPES_BIBLIO.find((g) => g.sections.includes(section));
  const [famille0, setFamille0] = useState<{ v?: string; n: number }>({ n: 0 });
  const aCat = { d: lib.desordres.filter((x) => x.famille === 'À catégoriser').length, p: lib.preconisations.filter((x) => x.famille === 'À catégoriser').length };
  const voirACat = (sec: Section) => { setSection(sec); setFamille0((f) => ({ v: 'À catégoriser', n: f.n + 1 })); };

  return (
    <div role={embedded ? undefined : 'dialog'} aria-modal={embedded ? undefined : true} className={embedded ? 'flex min-h-0 flex-1 flex-col bg-ivoire' : 'fixed inset-0 z-50 flex flex-col bg-ivoire'}>
      <header className="flex flex-wrap items-center gap-3 border-b border-pierre-100 bg-white px-4 py-3 sm:px-6">
        <div className="min-w-[200px] flex-1">
          <p className="font-serif text-xl font-semibold text-foret">Ma bibliothèque{groupeActif ? <span className="text-charbon/50"> · {groupeActif.titre}</span> : null}</p>
          <p className="text-[12px] text-charbon/55">Rangée comme les étapes du diagnostic. Enregistrement automatique.</p>
        </div>
        <select value={section} onChange={(e) => setSection(e.target.value as Section)} className="field w-auto max-w-[320px] py-2 text-[13px]" aria-label="Aller à une liste">
          {GROUPES_BIBLIO.map((g) => (
            <optgroup key={g.id} label={g.titre}>
              {g.sections.map((k) => <option key={k} value={k}>{SECTION_LABEL(k)} ({count(k)})</option>)}
            </optgroup>
          ))}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans toute la bibliothèque…" className="field w-full max-w-sm py-2 sm:w-72" />
        {onClose && <button type="button" className="btn-primary" onClick={onClose}>Terminé</button>}
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-pierre-100 bg-white p-2 md:w-64 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
          {GROUPES_BIBLIO.map((g) => {
            const visibles = g.sections.filter((k) => !hits || (hits[k] ?? 0) > 0);
            if (!visibles.length) return null;
            return (
              <div key={g.id} className="md:mb-2">
                <p className="label-caps hidden px-3 pb-1 pt-2 md:block">{g.titre}</p>
                {visibles.map((k) => (
                  <button key={k} type="button" onClick={() => setSection(k)} className={`flex w-full items-center justify-between whitespace-nowrap rounded-md px-3 py-1.5 text-left text-[13px] ${section === k ? 'bg-foret text-ivoire' : 'text-charbon/75 hover:bg-ivoire'}`}>
                    <span>{SECTION_LABEL(k)}</span><span className="ml-2 text-[12px] opacity-60">{hits ? hits[k] : count(k)}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <AjoutRapide onVoir={(sec, f) => { setSection(sec); setFamille0((x) => ({ v: f, n: x.n + 1 })); }} />
          {(aCat.d > 0 || aCat.p > 0) && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-terre/40 bg-terre-50 px-3 py-2 text-[13px]">
              <span className="text-terre">À catégoriser :</span>
              {aCat.d > 0 && <button type="button" className="underline" onClick={() => voirACat('desordres')}>{aCat.d} désordre{aCat.d > 1 ? 's' : ''} type{aCat.d > 1 ? 's' : ''}</button>}
              {aCat.p > 0 && <button type="button" className="underline" onClick={() => voirACat('preconisations')}>{aCat.p} préconisation{aCat.p > 1 ? 's' : ''}</button>}
              <span className="text-charbon/55">— ajoutés pendant la rédaction ; ouvrez-les pour choisir leur famille.</span>
            </div>
          )}
          {section === 'desordres' && <DesordresSection key={`d${famille0.n}`} q={q} famille0={famille0.v} />}
          {section === 'prix' && <PrixSection q={q} />}
          {section === 'preconisations' && <PreconisationsSection key={`p${famille0.n}`} q={q} famille0={famille0.v} />}
          {section === 'guides' && <GuidesSection q={q} />}
          {!['desordres', 'prix', 'preconisations', 'guides'].includes(section) && (
            <PhrasesSection k={section as PhraseKey} q={q} sort={sort} setSort={setSort}
              list={lib.phrases[section as PhraseKey] ?? []}
              setList={(l) => setLib({ ...lib, phrases: { ...lib.phrases, [section]: l } })}
              isFavori={(t) => isFavori(section, t)} toggleFavori={(t) => toggleFavori(section, t)} usageOf={(t) => usageOf(section, t)} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ───────────── Préconisations types ───────────── */
function PreconisationsSection({ q, famille0 }: { q: string; famille0?: string }) {
  const { lib, setLib, usageOf, phrases } = useLibrary();
  const [famille, setFamille] = useState(famille0 ?? 'toutes');
  const [open, setOpen] = useState<string | null>(null);
  const [fusion, setFusion] = useState('');
  const list = lib.preconisations;
  const familles = FAMILLES;
  const rows = list.filter((p) => (famille === 'toutes' || p.famille === famille || categoriePreco(p) === famille) && (!q.trim() || correspond(motsPreco(p), q)))
    .sort((a, b) => CATEGORIES_PRECO.indexOf(categoriePreco(a) as typeof CATEGORIES_PRECO[number]) - CATEGORIES_PRECO.indexOf(categoriePreco(b) as typeof CATEGORIES_PRECO[number]) || a.titre.localeCompare(b.titre, 'fr', { sensitivity: 'base' }));
  const doublons = doublonsProbables(list, (p) => p.titre, 0.75).slice(0, 8);
  const set = (id: string, patch: Partial<PreconisationType>) => setLib({ ...lib, preconisations: list.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-serif text-2xl text-foret">Préconisations types</p>
      <p className="mb-4 text-[13px] text-charbon/60">Comme les désordres types : chaque préconisation s’insère dans une fiche, ou devient une solution proposée (Diagnostic structurel). Les désordres liés font apparaître la préconisation en premier.</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {['toutes', ...CATEGORIES_PRECO].filter((f) => f === 'toutes' || list.some((p) => categoriePreco(p) === f)).map((f) => (
          <button key={f} type="button" onClick={() => setFamille(f)} className={`rounded-full border px-3 py-1 text-[12px] ${famille === f ? 'border-foret bg-foret text-ivoire' : 'border-pierre bg-white'}`}>
            {f === 'toutes' ? `Toutes (${list.length})` : `${f} (${list.filter((p) => categoriePreco(p) === f).length})`}
          </button>
        ))}
      </div>
      <Doublons paires={doublons.map(([a, b]) => ({ a: { id: a.id, titre: a.titre }, b: { id: b.id, titre: b.titre } }))} onFusion={(garde, ancien) => setLib(fusionnerPrecos(lib, garde, ancien))} cle="precos" />
      <ul className="space-y-2">
        {rows.map((p, k) => (<Fragment key={p.id}>
          {(k === 0 || categoriePreco(rows[k - 1]) !== categoriePreco(p)) && <li className="label-caps pt-3">{categoriePreco(p)}</li>}
          <li className="card">
            <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} className="flex w-full items-center gap-3 p-3 text-left">
              <span className="flex-1"><b>{p.titre}</b><span className="block text-[12px] text-charbon/55">{fam(p.famille)} · {lotsDe(p).join(', ')}{p.pour?.length ? ` · pour ${p.pour.join(', ')}` : ''}</span></span>
              <span className="text-[11px] text-charbon/40">{usageOf('preconisation', p.id) ? `${usageOf('preconisation', p.id)}×` : ''}</span>
              <span className="text-sauge">{open === p.id ? '▴' : '▾'}</span>
            </button>
            {open === p.id && (
              <div className="space-y-3 border-t border-pierre-100 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Titre"><Input value={p.titre} onChange={(e) => set(p.id, { titre: e.target.value })} /></Field>
                  <Field label="Famille"><Select value={p.famille} onChange={(v) => set(p.id, { famille: v as PreconisationType['famille'] })} options={familles.map((f) => ({ value: f, label: fam(f) }))} /></Field>
                  <Field label="Catégorie" hint="rangement dans les listes"><Select value={categoriePreco(p)} onChange={(v) => set(p.id, { categorie: v })} options={CATEGORIES_PRECO.map((c) => ({ value: c, label: c }))} /></Field>
                  {p.alias?.length ? <p className="self-end text-[12px] text-charbon/55">Anciens titres fusionnés : {p.alias.join(' ; ')}</p> : null}
                </div>
                <Field label="Texte de la préconisation"><TextArea value={p.texte} onChange={(v) => set(p.id, { texte: v })} /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Corps d’état (un ou plusieurs)"><LotsChips value={lotsDe(p)} onChange={(l) => set(p.id, { lots: l, lot: l[0] ?? '' })} options={phrases('lots')} /></Field>
                  <Field label="Ouvrage de la bibliothèque de prix"><select value={p.prixId ?? ''} onChange={(e) => set(p.id, { prixId: e.target.value || undefined })} className="field"><option value="">Aucun</option>{lib.prix.map((x) => <option key={x.id} value={x.id}>{x.libelle}</option>)}</select></Field>
                </div>
                <div>
                  <p className="label-caps mb-1.5">Proposée pour les désordres</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lib.desordres.map((d) => {
                      const on = p.pour?.includes(d.type);
                      return <button key={d.type} type="button" onClick={() => set(p.id, { pour: on ? p.pour!.filter((x) => x !== d.type) : [...(p.pour ?? []), d.type] })} className={`rounded-full border px-2.5 py-0.5 text-[12px] ${on ? 'border-sauge bg-sauge text-white' : 'border-pierre bg-white'}`}>{d.type}</button>;
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-quiet text-[13px]" onClick={() => setLib({ ...lib, preconisations: [...list, { ...p, id: uid(), titre: `${p.titre} (copie)` }] })}>Dupliquer</button>
                  <button type="button" className="btn-quiet text-[13px] text-terre" onClick={() => setLib({ ...lib, preconisations: list.filter((x) => x.id !== p.id) })}>Supprimer</button>
                  <span className="ml-auto flex items-center gap-1 text-[12px]">
                    <select value={fusion} onChange={(e) => setFusion(e.target.value)} className="field w-auto max-w-[260px] py-1 text-[12px]" aria-label="Fusionner avec">
                      <option value="">Fusionner dans…</option>
                      {[...list].filter((x) => x.id !== p.id).sort((a, b) => a.titre.localeCompare(b.titre, 'fr')).map((x) => <option key={x.id} value={x.id}>{x.titre}</option>)}
                    </select>
                    {fusion && <button type="button" className="btn-ghost min-h-[30px] px-2 text-[12px]" title="Cette préconisation disparaît ; son titre devient un ancien nom de l’autre et ses désordres liés sont repris" onClick={() => { setLib(fusionnerPrecos(lib, fusion, p.id)); setFusion(''); setOpen(fusion); }}>Fusionner</button>}
                  </span>
                </div>
              </div>
            )}
          </li>
        </Fragment>))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={() => { const id = uid(); setLib({ ...lib, preconisations: [...list, { id, titre: 'Nouvelle préconisation', famille: famille === 'toutes' ? 'Autres' : famille as PreconisationType['famille'], lot: '', texte: '' }] }); setOpen(id); }}>Ajouter une préconisation type</button>
        <button type="button" className="btn-quiet text-[13px] text-terre" onClick={() => setLib({ ...lib, preconisations: defaultLibrary().preconisations })}>Rétablir les préconisations d’origine</button>
      </div>
    </div>
  );
}

/* ───────────── Guides illustrés ───────────── */
function GuidesSection({ q }: { q: string }) {
  const { lib, setLib } = useLibrary();
  const [open, setOpen] = useState<string | null>(lib.guides[0]?.id ?? null);
  const set = (id: string, patch: Partial<Guide>) => setLib({ ...lib, guides: lib.guides.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const lines = (l: string[]) => l.join('\n');
  const parse = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);
  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-serif text-2xl text-foret">Guides de bonnes pratiques</p>
      <p className="mb-4 text-[13px] text-charbon/60">Fiches illustrées jointes au rapport (option commerciale). Modifiez les textes ; le schéma reste associé au guide.</p>
      <div className="space-y-2">
        {lib.guides.filter((g) => !q.trim() || matches(`${g.titre} ${g.principe}`, q)).map((g) => (
          <div key={g.id} className="card">
            <button type="button" onClick={() => setOpen(open === g.id ? null : g.id)} className="flex w-full items-center p-3 text-left"><b className="flex-1">{g.titre}</b><span className="text-sauge">{open === g.id ? '▴' : '▾'}</span></button>
            {open === g.id && (
              <div className="grid gap-4 border-t border-pierre-100 p-3 lg:grid-cols-[1fr_300px]">
                <div className="space-y-3">
                  <Field label="Titre"><Input value={g.titre} onChange={(e) => set(g.id, { titre: e.target.value })} /></Field>
                  <Field label="Phrase d’accroche"><Input value={g.accroche} onChange={(e) => set(g.id, { accroche: e.target.value })} /></Field>
                  <Field label="Comment ça marche"><TextArea value={g.principe} onChange={(v) => set(g.id, { principe: v })} /></Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="À faire" hint="une ligne par conseil"><TextArea value={lines(g.faire)} onChange={(v) => set(g.id, { faire: parse(v) })} /></Field>
                    <Field label="À éviter" hint="une ligne par conseil"><TextArea value={lines(g.eviter)} onChange={(v) => set(g.id, { eviter: parse(v) })} /></Field>
                  </div>
                  <Field label="Entretien" hint="une ligne par geste"><TextArea value={lines(g.entretien)} onChange={(v) => set(g.id, { entretien: parse(v) })} /></Field>
                  <Field label="Mots-clés pour le proposer automatiquement" hint="séparés par |"><Input value={g.motsCles} onChange={(e) => set(g.id, { motsCles: e.target.value })} /></Field>
                </div>
                <div><p className="label-caps mb-2">Schéma</p><GuideIllustration id={g.id} /></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="btn-quiet mt-4 text-[13px] text-terre" onClick={() => setLib({ ...lib, guides: defaultLibrary().guides })}>Rétablir les textes d’origine</button>
    </div>
  );
}

/* ───────────── Listes de textes ───────────── */
function PhrasesSection({ k, q, sort, setSort, list, setList, isFavori, toggleFavori, usageOf }: {
  k: PhraseKey; q: string; sort: Sort; setSort: (s: Sort) => void; list: string[]; setList: (l: string[]) => void;
  isFavori: (t: string) => boolean; toggleFavori: (t: string) => void; usageOf: (t: string) => number;
}) {
  const rows = list.map((t, i) => ({ t, i })).filter((r) => !q.trim() || matches(r.t, q));
  if (sort === 'alpha') rows.sort((a, b) => a.t.localeCompare(b.t, 'fr'));
  if (sort === 'usage') rows.sort((a, b) => Number(isFavori(b.t)) - Number(isFavori(a.t)) || usageOf(b.t) - usageOf(a.t));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const l = [...list];
    [l[i], l[j]] = [l[j], l[i]];
    setList(l);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-serif text-2xl text-foret">{PHRASE_LABELS[k]}</p>
          <p className="text-[13px] text-charbon/60">Chaque ligne est un choix de la liste. ★ = favori, toujours en tête dans les dossiers.</p>
        </div>
        <div className="flex overflow-hidden rounded-md border border-pierre text-[13px]">
          {([['manuel', 'Mon ordre'], ['alpha', 'A → Z'], ['usage', 'Plus utilisés']] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setSort(v)} className={`px-3 py-1.5 ${sort === v ? 'bg-sauge text-white' : 'bg-white text-charbon/70'}`}>{l}</button>
          ))}
        </div>
      </div>
      <ol className="space-y-2">
        {rows.map(({ t, i }) => (
          <li key={i} className="flex items-start gap-1">
            <button type="button" onClick={() => toggleFavori(t)} title="Favori" className={`px-1.5 pt-2 text-[16px] ${isFavori(t) ? 'text-terre' : 'text-pierre hover:text-sauge'}`}>{isFavori(t) ? '★' : '☆'}</button>
            <div className="flex-1"><TextArea rows={1} value={t} onChange={(v) => setList(list.map((x, j) => (j === i ? v : x)))} /></div>
            <span className="w-10 pt-2.5 text-right text-[11px] text-charbon/40">{usageOf(t) ? `${usageOf(t)}×` : ''}</span>
            {sort === 'manuel' && !q && (
              <div className="flex shrink-0 flex-col">
                <button type="button" aria-label="Monter" className="px-2 text-sauge disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button type="button" aria-label="Descendre" className="px-2 text-sauge disabled:opacity-30" disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</button>
              </div>
            )}
            <button type="button" aria-label="Supprimer" className="px-2 pt-2 text-terre" onClick={() => setList(list.filter((_, j) => j !== i))}>×</button>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={() => setList([...list, ''])}>Ajouter une ligne</button>
        <button type="button" className="btn-quiet text-[13px]" onClick={() => setList([...list].sort((a, b) => a.localeCompare(b, 'fr')))}>Ranger définitivement de A à Z</button>
        <button type="button" className="btn-quiet text-[13px] text-terre" onClick={() => setList([...DEFAULT_PHRASES[k]])}>Rétablir la liste d’origine</button>
      </div>
    </div>
  );
}

/* ───────────── Désordres types ───────────── */
function DesordresSection({ q, famille0 }: { q: string; famille0?: string }) {
  const { lib, setLib, usageOf, phrases } = useLibrary();
  const [famille, setFamille] = useState<string>(famille0 ?? 'toutes');
  const [open, setOpen] = useState<number | null>(null);
  const [fusion, setFusion] = useState('');
  const tpls = lib.desordres;
  const rangCat = (t: DesordreTemplate) => CATEGORIES_DESORDRE.indexOf(categorieDesordre(t) as typeof CATEGORIES_DESORDRE[number]);
  const rows = tpls.map((t, i) => ({ t, i }))
    .filter((r) => famille === 'toutes' || r.t.famille === famille || categorieDesordre(r.t) === famille)
    .filter((r) => !q.trim() || correspond(`${motsDesordre(r.t)} ${r.t.preconisation}`, q))
    .sort((a, b) => (a.t.famille === 'À catégoriser' ? -1 : 0) - (b.t.famille === 'À catégoriser' ? -1 : 0) || rangCat(a.t) - rangCat(b.t) || a.t.type.localeCompare(b.t.type, 'fr', { sensitivity: 'base' }));
  const doublons = doublonsProbables(tpls, (t) => t.type, 0.75).slice(0, 8);
  const setTpl = (i: number, patch: Partial<DesordreTemplate>) => setLib({ ...lib, desordres: tpls.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const add = (base?: DesordreTemplate) => {
    const n: DesordreTemplate = base ? { ...base, type: `${base.type} (copie)` } : { type: 'Nouveau désordre type', famille: famille !== 'toutes' ? (famille as DesordreTemplate['famille']) : 'Autres', element: 'Mur', priorite: 'P2', lot: '', unite: 'forfait', constat: '', analyse: '', investigations: '', preconisation: '' };
    setLib({ ...lib, desordres: [...tpls, n] });
    setOpen(tpls.length);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {['toutes', ...CATEGORIES_DESORDRE, ...(tpls.some((t) => t.famille === 'À catégoriser') ? ['À catégoriser'] : [])].filter((f) => f === 'toutes' || f === 'À catégoriser' || tpls.some((t) => categorieDesordre(t) === f)).map((f) => (
          <button key={f} type="button" onClick={() => setFamille(f)} className={`min-h-[34px] rounded-full border px-3 text-[13px] ${famille === f ? 'border-foret bg-foret text-ivoire' : 'border-pierre bg-white text-charbon/70'}`}>
            {f === 'toutes' ? `Tous (${tpls.length})` : `${f} (${tpls.filter((t) => (f === 'À catégoriser' ? t.famille === f : categorieDesordre(t) === f)).length})`}
          </button>
        ))}
        <button type="button" className="btn-ghost ml-auto" onClick={() => add()}>Nouveau désordre type</button>
      </div>
      <Doublons paires={doublons.map(([a, b]) => ({ a: { id: a.type, titre: a.type }, b: { id: b.type, titre: b.type } }))} onFusion={(garde, ancien) => { setLib(fusionnerDesordres(lib, garde, ancien)); setOpen(null); }} cle="desordres" />
      {rows.map(({ t, i }, k) => (<Fragment key={i}>
        {(k === 0 || categorieDesordre(rows[k - 1].t) !== categorieDesordre(t)) && <p className="label-caps pt-3">{categorieDesordre(t)}</p>}
        <div className="card">
          <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PRIORITY[t.priorite].color }} />
            <span className="flex-1 font-medium text-foret">{t.type}</span>
            <span className="text-[12px] text-charbon/50">{t.element} · {fam(t.famille)}</span>
            <span className="text-sauge">{open === i ? '▴' : '▾'}</span>
          </button>
          {open === i && (
            <div className="space-y-4 border-t border-pierre-100 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nom du désordre type"><Input value={t.type} onChange={(e) => setTpl(i, { type: e.target.value })} /></Field>
                <Field label="Famille" hint="nature du désordre"><Select value={t.famille} onChange={(v) => setTpl(i, { famille: v })} options={FAMILLES.map((f) => ({ value: f, label: fam(f) }))} /></Field>
                <Field label="Catégorie" hint="ouvrage, rangement dans les listes"><Select value={categorieDesordre(t)} onChange={(v) => setTpl(i, { categorie: v })} options={CATEGORIES_DESORDRE.map((c) => ({ value: c, label: c }))} /></Field>
                <Field label="Élément"><Input value={t.element} onChange={(e) => setTpl(i, { element: e.target.value })} /></Field>
                <Field label="Priorité par défaut"><Select value={t.priorite} onChange={(v) => setTpl(i, { priorite: v as Priority })} options={(Object.keys(PRIORITY) as Priority[]).map((p) => ({ value: p, label: PRIORITY[p].label }))} /></Field>
                <Field label="Corps d’état"><LotsChips value={lotsDe(t)} onChange={(l) => setTpl(i, { lots: l, lot: l[0] ?? '' })} options={phrases('lots')} /></Field>
                <Field label="Ouvrage de prix associé" hint="pour le chiffrage automatique">
                  <select value={t.prixId ?? ''} onChange={(e) => setTpl(i, { prixId: e.target.value || undefined })} className="field">
                    <option value="">— Aucun —</option>
                    {lib.prix.map((p) => <option key={p.id} value={p.id}>{p.libelle} ({p.unite})</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Constat type" hint="« … » = à compléter sur place"><TextArea value={t.constat} onChange={(v) => setTpl(i, { constat: v })} /></Field>
              <Field label="Analyse type"><TextArea value={t.analyse} onChange={(v) => setTpl(i, { analyse: v })} /></Field>
              <Field label="Investigations"><TextArea rows={2} value={t.investigations} onChange={(v) => setTpl(i, { investigations: v })} /></Field>
              <Field label="Préconisation type"><TextArea value={t.preconisation} onChange={(v) => setTpl(i, { preconisation: v })} /></Field>
              {t.alias?.length ? <p className="text-[12px] text-charbon/55">Anciens noms fusionnés (la recherche les retrouve) : {t.alias.join(' ; ')}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn-ghost" onClick={() => add(t)}>Dupliquer</button>
                {tpls.length > 1 && <button type="button" className="btn-quiet text-terre" onClick={() => { setLib({ ...lib, desordres: tpls.filter((_, j) => j !== i) }); setOpen(null); }}>Supprimer</button>}
                <span className="ml-auto flex items-center gap-1 text-[12px]">
                  <select value={fusion} onChange={(e) => setFusion(e.target.value)} className="field w-auto max-w-[260px] py-1 text-[12px]" aria-label="Fusionner avec">
                    <option value="">Fusionner dans…</option>
                    {[...tpls].filter((x) => x.type !== t.type).sort((a, b) => a.type.localeCompare(b.type, 'fr')).map((x) => <option key={x.type} value={x.type}>{x.type}</option>)}
                  </select>
                  {fusion && <button type="button" className="btn-ghost min-h-[30px] px-2 text-[12px]" title="Ce désordre type disparaît ; son nom devient un ancien nom de l’autre (la recherche le retrouve) et ses préconisations liées sont reprises" onClick={() => { setLib(fusionnerDesordres(lib, fusion, t.type)); setFusion(''); setOpen(null); }}>Fusionner</button>}
                </span>
              </div>
            </div>
          )}
        </div>
      </Fragment>))}
      <button type="button" className="btn-quiet text-[13px] text-terre" onClick={() => setLib({ ...lib, desordres: defaultLibrary().desordres })}>Rétablir les désordres types d’origine</button>
    </div>
  );
}

/* ───────────── Prix des interventions ───────────── */
function PrixSection({ q }: { q: string }) {
  const { lib, setLib } = useLibrary();
  const [lot, setLot] = useState('tous');
  const [open, setOpen] = useState<string | null>(null);
  const lots = [...new Set(lib.prix.map((p) => p.lot))].sort((a, b) => a.localeCompare(b, 'fr'));
  const rows = lib.prix.filter((p) => (lot === 'tous' || p.lot === lot) && (!q.trim() || matches(`${p.libelle} ${p.lot}`, q)))
    .sort((a, b) => a.lot.localeCompare(b.lot, 'fr') || a.libelle.localeCompare(b.libelle, 'fr'));
  const setItem = (id: string, patch: Partial<PrixItem>) => setLib({ ...lib, prix: lib.prix.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <p className="text-[14px] text-charbon/70">
        Prix unitaires hors taxes, fourniture et pose. Les valeurs de départ sont indicatives : chaque prix constaté (devis ou facture d’entreprise) que vous enregistrez affine automatiquement la fourchette utilisée dans les chiffrages.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={lot} onChange={(e) => setLot(e.target.value)} className="field w-auto py-1.5 text-[14px]">
          <option value="tous">Tous les lots</option>
          {lots.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <button type="button" className="btn-ghost ml-auto" onClick={() => {
          const id = uid();
          setLib({ ...lib, prix: [...lib.prix, { id, libelle: 'Nouvel ouvrage', lot: lot !== 'tous' ? lot : '', unite: 'forfait', bas: 0, haut: 0, observations: [] }] });
          setOpen(id);
        }}>Nouvel ouvrage</button>
      </div>
      <div className="card divide-y divide-pierre-100">
        {rows.map((p) => {
          const est = estimatePrix(p);
          return (
            <div key={p.id}>
              <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left sm:grid-cols-[1fr_170px_150px_auto]">
                <span><span className="font-medium text-foret">{p.libelle}</span><span className="block text-[12px] text-charbon/50">{p.lot}</span></span>
                <span className="hidden whitespace-nowrap text-right text-[14px] tabular-nums sm:block">{fmtEUR(est.bas)} – {fmtEUR(est.haut)}<span className="block text-[11px] text-charbon/50">par {p.unite}</span></span>
                <span className={`hidden text-[12px] sm:block ${est.n ? 'text-sauge' : 'text-charbon/45'}`}>{est.fiabilite}</span>
                <span className="text-sauge">{open === p.id ? '▴' : '▾'}</span>
              </button>
              {open === p.id && (
                <div className="space-y-4 bg-ivoire/60 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_200px_140px]">
                    <Field label="Ouvrage"><Input value={p.libelle} onChange={(e) => setItem(p.id, { libelle: e.target.value })} /></Field>
                    <Field label="Lot"><Input value={p.lot} onChange={(e) => setItem(p.id, { lot: e.target.value })} /></Field>
                    <Field label="Unité"><Input value={p.unite} onChange={(e) => setItem(p.id, { unite: e.target.value })} /></Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Valeur de départ basse (€ hors taxes)"><Input inputMode="decimal" value={String(p.bas)} onChange={(e) => setItem(p.id, { bas: Number(e.target.value.replace(',', '.')) || 0 })} /></Field>
                    <Field label="Valeur de départ haute (€ hors taxes)"><Input inputMode="decimal" value={String(p.haut)} onChange={(e) => setItem(p.id, { haut: Number(e.target.value.replace(',', '.')) || 0 })} /></Field>
                  </div>
                  <div>
                    <p className="label-caps mb-2">Prix constatés ({p.observations.length})</p>
                    {p.observations.length > 0 && (
                      <table className="mb-3 w-full text-[13px]">
                        <thead><tr className="text-left text-charbon/55"><th className="py-1 font-normal">Date</th><th className="font-normal">Source</th><th className="font-normal">Entreprise</th><th className="text-right font-normal">Prix unitaire</th><th /></tr></thead>
                        <tbody>{[...p.observations].sort((a, b) => b.date.localeCompare(a.date)).map((o) => (
                          <tr key={o.id} className="border-t border-pierre-100">
                            <td className="py-1">{o.date}</td><td>{o.source}</td><td>{o.entreprise}</td>
                            <td className="text-right tabular-nums">{fmtEUR(o.prixUnitaire)}</td>
                            <td className="text-right"><button type="button" className="px-2 text-terre" onClick={() => setItem(p.id, { observations: p.observations.filter((x) => x.id !== o.id) })}>×</button></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    )}
                    <AddObservation onAdd={(o) => setItem(p.id, { observations: [...p.observations, o] })} unite={p.unite} />
                  </div>
                  <button type="button" className="btn-quiet text-[13px] text-terre" onClick={() => setLib({ ...lib, prix: lib.prix.filter((x) => x.id !== p.id) })}>Supprimer cet ouvrage</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddObservation({ onAdd, unite }: { onAdd: (o: PrixItem['observations'][number]) => void; unite: string }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [prix, setPrix] = useState('');
  const [source, setSource] = useState<'devis' | 'facture' | 'estimation'>('devis');
  const [entreprise, setEntreprise] = useState('');
  const v = Number(prix.replace(/\s/g, '').replace(',', '.'));
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-pierre p-2">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field w-auto py-1.5 text-[13px]" aria-label="Date" />
      <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} className="field w-auto py-1.5 text-[13px]" aria-label="Source">
        <option value="devis">Devis</option><option value="facture">Facture</option><option value="estimation">Estimation</option>
      </select>
      <input value={entreprise} onChange={(e) => setEntreprise(e.target.value)} placeholder="Entreprise" className="field w-40 py-1.5 text-[13px]" />
      <input value={prix} onChange={(e) => setPrix(e.target.value)} inputMode="decimal" placeholder={`€ par ${unite}`} className="field w-32 py-1.5 text-[13px]" />
      <button type="button" className="btn-ghost min-h-[34px] text-[13px]" disabled={!(v > 0)} onClick={() => { onAdd({ id: uid(), date, prixUnitaire: v, source, entreprise }); setPrix(''); setEntreprise(''); }}>Ajouter le prix constaté</button>
    </div>
  );
}

/** Ajout rapide : on écrit le titre, la bibliothèque propose la ou les rubriques où le ranger. */
function AjoutRapide({ onVoir }: { onVoir: (s: Section, famille?: string) => void }) {
  const { lib, setLib } = useLibrary();
  const [t, setT] = useState('');
  const [faits, setFaits] = useState<string[]>([]);
  const props = useMemo(() => (t.trim().length >= 3 ? suggererRangements(lib, t) : []), [t, lib]);
  const existe = (r: Rangement) => r.kind === 'desordre' ? lib.desordres.some((x) => norm(x.type) === norm(t.trim()))
    : r.kind === 'preconisation' ? lib.preconisations.some((x) => norm(x.titre) === norm(t.trim()))
    : (lib.phrases[r.key] ?? []).some((x) => norm(x) === norm(t.trim()));
  function ranger(r: Rangement, famille?: DesordreTemplate['famille']) {
    const v = t.trim();
    if (r.kind === 'desordre') setLib({ ...lib, desordres: [...lib.desordres, nouveauType(v, { famille: famille ?? r.famille })] });
    else if (r.kind === 'preconisation') setLib({ ...lib, preconisations: [...lib.preconisations, { id: uid(), titre: v, famille: famille ?? r.famille, lot: '', texte: '' }] });
    else setLib({ ...lib, phrases: { ...lib.phrases, [r.key]: [...(lib.phrases[r.key] ?? []), v] } });
    setFaits((f) => [...f, r.label]);
  }
  return (
    <div className="card mb-4 p-3">
      <p className="label-caps mb-1.5">Ajouter un élément</p>
      <input value={t} onChange={(e) => { setT(e.target.value); setFaits([]); }} placeholder="Écrivez le titre (ex. « Fissure en escalier », « Linteau bois », « Reprise des joints à la chaux »)…" className="field" />
      {props.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-[12px] text-charbon/55">Rubriques proposées (cliquez-en une ou plusieurs) :</p>
          <div className="flex flex-wrap gap-1.5">
            {props.map((r) => {
              const fait = faits.includes(r.label) || existe(r);
              const sec: Section = r.kind === 'desordre' ? 'desordres' : r.kind === 'preconisation' ? 'preconisations' : r.key;
              return fait
                ? <button key={r.label} type="button" className="rounded-full border border-sauge bg-sauge-50 px-3 py-1 text-[12px] text-sauge" onClick={() => onVoir(sec, r.kind !== 'phrase' ? r.famille : undefined)}>✓ {r.label} · voir</button>
                : <button key={r.label} type="button" className="rounded-full border border-pierre bg-white px-3 py-1 text-[12px] hover:border-sauge" onClick={() => ranger(r)}>+ {r.label}</button>;
            })}
            {!faits.length && <button type="button" className="rounded-full border border-dashed border-terre/60 px-3 py-1 text-[12px] text-terre" onClick={() => ranger({ kind: 'desordre', famille: 'À catégoriser', label: 'Désordres types › À catégoriser', score: 0 }, 'À catégoriser')}>Je rangerai plus tard (À catégoriser)</button>}
          </div>
          {faits.length > 0 && <p className="mt-1.5 text-[12px] text-sauge">Ajouté. Complétez le détail depuis la rubrique (bouton « voir »).</p>}
        </div>
      )}
    </div>
  );
}

/** Doublons probables (titres très proches) : fusion en un clic, ou « ce ne sont pas des doublons ». */
function Doublons({ paires, onFusion, cle }: { paires: { a: { id: string; titre: string }; b: { id: string; titre: string } }[]; onFusion: (garde: string, ancien: string) => void; cle: string }) {
  const k = `atelier-doublons-ignores-${cle}`;
  const [ignores, setIgnores] = useState<string[]>([]);
  useEffect(() => { try { setIgnores(JSON.parse(localStorage.getItem(k) ?? '[]')); } catch { /* rien */ } }, [k]);
  const id = (p: (typeof paires)[number]) => `${p.a.id}|${p.b.id}`;
  const liste = paires.filter((p) => !ignores.includes(id(p)));
  if (!liste.length) return null;
  const ignorer = (p: (typeof paires)[number]) => { const n = [...ignores, id(p)]; setIgnores(n); try { localStorage.setItem(k, JSON.stringify(n)); } catch { /* rien */ } };
  return (
    <div className="mb-3 rounded-md border border-terre/30 bg-terre-50 p-3 text-[13px]">
      <p className="mb-2 font-medium text-terre">Doublons probables : combinez-les pour ne garder qu’une entrée (l’autre nom reste trouvable par la recherche).</p>
      <ul className="space-y-1.5">
        {liste.map((p) => (
          <li key={id(p)} className="flex flex-wrap items-center gap-1.5">
            <span className="min-w-0 flex-1">« {p.a.titre} » et « {p.b.titre} »</span>
            <button type="button" className="btn-ghost min-h-[30px] px-2 text-[12px]" onClick={() => onFusion(p.a.id, p.b.id)}>Garder le 1er</button>
            <button type="button" className="btn-ghost min-h-[30px] px-2 text-[12px]" onClick={() => onFusion(p.b.id, p.a.id)}>Garder le 2e</button>
            <button type="button" className="btn-quiet min-h-[30px] px-2 text-[12px]" onClick={() => ignorer(p)}>Pas des doublons</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
