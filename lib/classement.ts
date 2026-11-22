import type { Library, PhraseKey } from './library';
import { PHRASE_LABELS } from './library';
import type { DesordreTemplate } from './templates';

/** Rangements possibles d’un nouvel élément de bibliothèque. */
export type Rangement =
  | { kind: 'desordre'; famille: DesordreTemplate['famille']; label: string; score: number }
  | { kind: 'preconisation'; famille: DesordreTemplate['famille']; label: string; score: number }
  | { kind: 'phrase'; key: PhraseKey; label: string; score: number };

/** Tri alphabétique français (accents et majuscules ignorés). */
export const alpha = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' });

const VIDES = new Set('le la les un une des de du d l et ou en au aux a à par pour sur sous dans avec sans est sont ce cet cette ses son sa leur leurs qui que'.split(' '));
export const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ');
/** Racines des mots significatifs (5 premières lettres) : « fissures » et « fissuration » se rejoignent. */
export const racines = (t: string) => new Set(norm(t).split(/\s+/).filter((w) => w.length > 2 && !VIDES.has(w)).map((w) => w.slice(0, 5)));

const FAMILLE_MOTS: [DesordreTemplate['famille'], string[]][] = [
  ['Eau & humidité', ['eau', 'humid', 'infil', 'remon', 'capil', 'conde', 'moisi', 'salpe', 'goutt', 'ruiss', 'inond', 'pluvi', 'fuite', 'mouil', 'efflo', 'drain', 'venti']],
  ['Fissures & structure', ['fissu', 'lezar', 'tasse', 'fleche', 'flech', 'defor', 'devers', 'bomb', 'chain', 'fonda', 'struc', 'effon', 'dislo', 'linte', 'voute', 'appui']],
  ['Pierre & enduits', ['pierr', 'endui', 'joint', 'chaux', 'cimen', 'mortie', 'desqu', 'erosi', 'alveo', 'faien', 'parem', 'macon', 'brique', 'pisé', 'pise', 'torch', 'badig']],
  ['Bois', ['bois', 'charp', 'poutr', 'solive', 'xylo', 'insec', 'capri', 'termi', 'champ', 'meru', 'pourr', 'menui', 'pan', 'colom', 'plancher']],
];

function score(mots: Set<string>, textes: string[]) {
  let best = 0;
  for (const t of textes) {
    const r = racines(t);
    let n = 0;
    mots.forEach((m) => { if (r.has(m)) n++; });
    if (n > best) best = n;
  }
  return best;
}

/** Devine la famille d’un désordre ou d’une préconisation d’après son titre. */
export function devinerFamille(lib: Library, texte: string): DesordreTemplate['famille'] {
  return famillesProbables(lib, texte)[0] ?? 'À catégoriser';
}

/** Familles plausibles, de la plus probable à la moins probable (score > 0). */
export function famillesProbables(lib: Library, texte: string): DesordreTemplate['famille'][] {
  const mots = racines(texte);
  const res: { f: DesordreTemplate['famille']; s: number }[] = [];
  for (const [f, cles] of FAMILLE_MOTS) {
    let s = 0;
    mots.forEach((m) => { if (cles.some((c) => m.startsWith(c) || (m.length >= 4 && c.startsWith(m)))) s += 2; });
    s += score(mots, lib.desordres.filter((x) => x.famille === f).map((x) => x.type)) * 1.5;
    s += score(mots, lib.preconisations.filter((x) => x.famille === f).map((x) => x.titre));
    if (s > 0) res.push({ f, s });
  }
  return res.sort((a, b) => b.s - a.s).map((x) => x.f);
}

/**
 * Propose les rubriques de la bibliothèque où ranger un élément, à partir de son titre :
 * mots en commun avec les éléments déjà rangés, et mots-clés métier.
 */
export function suggererRangements(lib: Library, texte: string): Rangement[] {
  const mots = racines(texte);
  if (!mots.size) return [];
  const famille = devinerFamille(lib, texte);
  const fam = famille.replace(' & ', ' et ');
  const out: Rangement[] = [];
  const action = /^(reprise|purge|rejoint|remplac|pose|depose|traite|nettoy|reprendre|refaire|creer|realis|install|renfor|consol|supprim|mise|mettre|drain|ventil|assain|restaur|revis|surveil)/.test(norm(texte).trim());
  const sDes = score(mots, lib.desordres.map((x) => x.type)) + (famille !== 'À catégoriser' ? 1 : 0) + (action ? -1 : 0.5);
  const sPre = score(mots, lib.preconisations.map((x) => `${x.titre} ${x.lot}`)) + (action ? 2 : 0);
  out.push({ kind: 'desordre', famille, label: `Désordres types › ${fam}`, score: sDes });
  out.push({ kind: 'preconisation', famille, label: `Préconisations types › ${fam}`, score: sPre });
  const autre = famillesProbables(lib, texte)[1];
  if (autre) {
    out.push({ kind: 'desordre', famille: autre, label: `Désordres types › ${autre.replace(' & ', ' et ')}`, score: sDes - 0.5 });
    out.push({ kind: 'preconisation', famille: autre, label: `Préconisations types › ${autre.replace(' & ', ' et ')}`, score: sPre - 0.5 });
  }
  (Object.keys(PHRASE_LABELS) as PhraseKey[]).forEach((k) => {
    const s = score(mots, lib.phrases[k] ?? []);
    if (s > 0) out.push({ kind: 'phrase', key: k, label: PHRASE_LABELS[k], score: s + (k === 'elements' && texte.trim().split(/\s+/).length <= 3 ? 1 : 0) });
  });
  if (texte.trim().split(/\s+/).length <= 3 && !out.some((r) => r.kind === 'phrase' && r.key === 'elements')) out.push({ kind: 'phrase', key: 'elements', label: PHRASE_LABELS.elements, score: 0.5 });
  return out.sort((a, b) => b.score - a.score).slice(0, 8);
}
