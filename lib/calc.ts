import { PHASES } from './constants';
import type { Desordre, Dossier, Phase, Priority } from './types';

/** Moteur d'auto-agrégation : synthèse des désordres et scénarios budgétaires. */

export interface Range { bas: number; haut: number }

const add = (a: Range, d: Desordre): Range => ({
  bas: a.bas + (d.chiffrage.bas ?? 0),
  haut: a.haut + (d.chiffrage.haut ?? d.chiffrage.bas ?? 0),
});
const zero = (): Range => ({ bas: 0, haut: 0 });

export function totalsByPriority(desordres: Desordre[]): Record<Priority, Range> {
  const r = { P1: zero(), P2: zero(), P3: zero() };
  for (const d of desordres) r[d.priorite] = add(r[d.priorite], d);
  return r;
}

export function countByPriority(desordres: Desordre[]): Record<Priority, number> {
  const r = { P1: 0, P2: 0, P3: 0 };
  for (const d of desordres) r[d.priorite]++;
  return r;
}

export function totalsByLot(desordres: Desordre[]): { lot: string; range: Range; count: number }[] {
  const map = new Map<string, { range: Range; count: number }>();
  for (const d of desordres) {
    const k = d.lot || 'Non affecté';
    const cur = map.get(k) ?? { range: zero(), count: 0 };
    map.set(k, { range: add(cur.range, d), count: cur.count + 1 });
  }
  return [...map.entries()]
    .map(([lot, v]) => ({ lot, ...v }))
    .sort((a, b) => b.range.haut - a.range.haut);
}

export interface Scenario {
  code: 'A' | 'B' | 'C';
  titre: string;
  perimetre: string;
  priorites: Priority[];
  ht: Range;
  aleas: Range;
  totalHT: Range;
  tva: Range;
  ttc: Range;
}

const SCENARIOS: { code: Scenario['code']; titre: string; perimetre: string; priorites: Priority[] }[] = [
  { code: 'A', titre: 'Urgences et mise en sécurité', perimetre: 'Travaux urgents', priorites: ['P1'] },
  { code: 'B', titre: 'Conservation durable', perimetre: 'Urgents et à programmer', priorites: ['P1', 'P2'] },
  { code: 'C', titre: 'Restauration globale', perimetre: 'Ensemble des travaux', priorites: ['P1', 'P2', 'P3'] },
];

const mul = (r: Range, k: number): Range => ({ bas: r.bas * k, haut: r.haut * k });
const sum = (a: Range, b: Range): Range => ({ bas: a.bas + b.bas, haut: a.haut + b.haut });

export function computeScenarios(dossier: Dossier): Scenario[] {
  const byP = totalsByPriority(dossier.desordres);
  const { aleasPct, tvaPct } = dossier.finances;
  return SCENARIOS.map((s) => {
    const ht = s.priorites.reduce((acc, p) => sum(acc, byP[p]), zero());
    const aleas = mul(ht, aleasPct / 100);
    const totalHT = sum(ht, aleas);
    const tva = mul(totalHT, tvaPct / 100);
    return { ...s, ht, aleas, totalHT, tva, ttc: sum(totalHT, tva) };
  });
}

/** Feuille de route : désordres regroupés par phase chronologique (§6.2). */
export function roadmap(desordres: Desordre[]) {
  return (Object.keys(PHASES).map(Number) as Phase[]).map((phase) => ({
    phase,
    ...PHASES[phase],
    items: desordres.filter((d) => d.phase === phase),
  }));
}

/** Tri canonique : par numéro (la numérotation suit les zones, puis va du moins urgent au plus urgent — voir renumeroter). */
export function sortDesordres(list: Desordre[]): Desordre[] {
  const n = (x: Desordre) => parseInt(x.numero.replace(/\D/g, ''), 10) || 0;
  return [...list].sort((a, b) => n(a) - n(b));
}

export const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    Math.round(n / 10) * 10,
  );

export const fmtRange = (r: Range) => (r.haut <= 0 ? '—' : r.bas === r.haut ? fmtEUR(r.bas) : `${fmtEUR(r.bas)} – ${fmtEUR(r.haut)}`);

export const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(+d) ? iso : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};
