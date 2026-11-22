import { ZONE_CATEGORIES } from './constants';
import type { Dossier, Zone, ZoneCategory } from './types';

const ORDRE = Object.keys(ZONE_CATEGORIES) as ZoneCategory[];

/**
 * Applique un nouvel ordre des zones : les codes sont renumérotés dans chaque catégorie
 * (FAC-01, FAC-02…) et reportés partout (fiches, plans, points de vigilance).
 * Les photos restent attachées à leur zone et suivent donc le déplacement.
 */
export function reordonnerZones(d: Dossier, zones: Zone[]): Dossier {
  const triees = ORDRE.flatMap((cat) => zones.filter((z) => z.categorie === cat));
  const map = new Map<string, string>();
  const out = triees.map((z) => {
    const n = triees.filter((x) => x.categorie === z.categorie).indexOf(z) + 1;
    const code = `${z.categorie}-${String(n).padStart(2, '0')}`;
    map.set(z.code, code);
    return { ...z, code };
  });
  const m = (c: string) => map.get(c) ?? c;
  return {
    ...d,
    zones: out,
    desordres: d.desordres.map((x) => ({ ...x, zoneCode: m(x.zoneCode) })),
    plansZones: d.plansZones?.map((p) => ({ ...p, reperes: p.reperes.map((r) => ({ ...r, code: m(r.code) })), formes: p.formes?.map((f) => ({ ...f, code: m(f.code) })) })),
    vigilance: d.vigilance?.map((v) => {
      const code = v.localisation.split(' ')[0];
      return map.has(code) ? { ...v, localisation: v.localisation.replace(code, m(code)) } : v;
    }),
  };
}

/** Couleur par catégorie pour les schémas de zones. */
export const COULEUR_CATEGORIE: Record<ZoneCategory, string> = {
  EXT: '#A9B7A0', FAC: '#D6C7AF', PC: '#C9A15A', RDC: '#B97A5B', ETG: '#7FA3B5', COM: '#9C6B8E', CAV: '#68725E',
};
