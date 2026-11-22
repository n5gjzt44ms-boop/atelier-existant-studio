import { racines } from './classement';
import { lotsDe } from './factory';
import type { PreconisationType } from './preconisations';
import type { Desordre, Priority, Zone } from './types';

/** Préconisation regroupée : une même intervention, et les zones / désordres où elle est nécessaire. */
export interface GroupePreco {
  n: number; // numéro d'ordre dans le rapport
  titre: string;
  texte: string; // texte de la préconisation (premier désordre du groupe)
  solutions?: Desordre['solutions']; // diagnostic structurel : solutions du premier désordre
  lot: string;
  lots: string[]; // tous les corps d'état concernés
  priorite: Priority; // la plus urgente du groupe
  desordres: Desordre[];
  zones: string[]; // codes, dans l'ordre du bâtiment
  bas: number | null;
  haut: number | null;
}

const ORDRE_P: Priority[] = ['P1', 'P2', 'P3'];
const texteDe = (d: Desordre) => (d.solutions?.length ? d.solutions.map((s) => `${s.titre} ${s.texte}`).join(' ') : d.preconisation).trim();

/** Mots significatifs du texte, sans les noms et codes de zones (une préconisation copiée d'une zone à l'autre reste « la même »). */
function empreinte(t: string, zones: Zone[]) {
  let s = t;
  for (const z of zones) {
    if (z.nom.trim()) s = s.replace(new RegExp(z.nom.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
    s = s.replace(new RegExp(`\\b${z.code}\\b`, 'g'), ' ');
  }
  return racines(s);
}
function similarite(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  a.forEach((x) => { if (b.has(x)) n++; });
  return n / Math.min(a.size, b.size) * 0.5 + n / new Set([...a, ...b]).size * 0.5;
}
const premierePhrase = (t: string) => {
  let p = t.split(/(?<=[.;:!?])\s|\n/)[0].replace(/[.;:]$/, '').trim();
  if (p.length > 45 && p.indexOf(',') > 15) p = p.slice(0, p.indexOf(',')); // titre court : jusqu’à la première virgule
  return p.length > 70 ? `${p.slice(0, 67).replace(/\s+\S*$/, '')}…` : p;
};

/**
 * Regroupe les préconisations semblables (même texte, ou très proche une fois les noms de zones retirés),
 * puis les classe de la plus urgente à la moins urgente.
 */
export function grouperPreconisations(desordres: Desordre[], zones: Zone[], types: PreconisationType[] = []): GroupePreco[] {
  const ordreZone = (c: string) => { const i = zones.findIndex((z) => z.code === c); return i < 0 ? 999 : i; };
  const groupes: { e: Set<string>; list: Desordre[] }[] = [];
  for (const d of desordres) {
    const t = texteDe(d);
    if (!t) continue;
    const e = empreinte(t, zones);
    let best: { g: (typeof groupes)[number]; s: number } | null = null;
    for (const g of groupes) {
      const s = similarite(e, g.e);
      if (s >= 0.72 && (!best || s > best.s)) best = { g, s };
    }
    if (best) best.g.list.push(d); else groupes.push({ e, list: [d] });
  }
  return groupes
    .map(({ e, list }) => {
      const ref = list[0];
      const texte = ref.solutions?.length ? '' : ref.preconisation.trim();
      const type = types.find((p) => similarite(empreinte(p.texte, zones), e) >= 0.8);
      const reco = ref.solutions?.find((s) => s.recommandee) ?? ref.solutions?.[0];
      const sum = (k: 'bas' | 'haut') => (list.some((d) => d.chiffrage[k] != null) ? list.reduce((a, d) => a + (d.chiffrage[k] ?? 0), 0) : null);
      return {
        n: 0,
        titre: type?.titre ?? (reco ? reco.titre : premierePhrase(texte) || ref.type),
        texte,
        solutions: ref.solutions?.length ? ref.solutions : undefined,
        lot: list.map((d) => d.lot).find(Boolean) ?? type?.lot ?? '',
        lots: Array.from(new Set([...list.flatMap((d) => lotsDe(d)), ...(list.some((d) => lotsDe(d).length) ? [] : lotsDe(type ?? { lot: '' }))])),
        priorite: ORDRE_P.find((p) => list.some((d) => d.priorite === p)) ?? 'P3',
        desordres: [...list].sort((a, b) => ordreZone(a.zoneCode) - ordreZone(b.zoneCode) || a.numero.localeCompare(b.numero)),
        zones: Array.from(new Set(list.map((d) => d.zoneCode))).sort((a, b) => ordreZone(a) - ordreZone(b)),
        bas: sum('bas'), haut: sum('haut'),
      } as GroupePreco;
    })
    .sort((a, b) => ORDRE_P.indexOf(a.priorite) - ORDRE_P.indexOf(b.priorite) || Math.min(...a.desordres.map((d) => d.phase)) - Math.min(...b.desordres.map((d) => d.phase)))
    .map((g, i) => ({ ...g, n: i + 1 }));
}
