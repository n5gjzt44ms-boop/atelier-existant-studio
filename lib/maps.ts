/**
 * Plans et cartes à partir de l'adresse — services publics gratuits, sans clé :
 *  - Géoplateforme IGN (WMS) : plan cadastral, photographie aérienne actuelle,
 *    carte d'état-major (1820-1866), carte de Cassini (XVIIIe), photographies 1950-1965 ;
 *  - API Carto IGN : référence de la parcelle (section, numéro, contenance) ;
 *  - Géorisques : risques recensés sur la commune + liens vers le rapport officiel.
 * Si un service ne répond pas, les liens Géoportail / Géorisques permettent de
 * faire les captures d'écran à la main.
 */
import type { Photo } from './types';

export interface Point { lon: number; lat: number; label: string; citycode?: string }

async function getJson(url: string) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function geocodePoint(q: string): Promise<Point | null> {
  let reached = false;
  for (const u of [
    `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=1&index=address`,
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`,
  ]) {
    try {
      const j = await getJson(u);
      reached = true;
      const f = j?.features?.[0];
      const c = f?.geometry?.coordinates;
      if (c) return { lon: c[0], lat: c[1], label: f.properties?.label ?? q, citycode: f.properties?.citycode };
    } catch { /* service suivant */ }
  }
  if (!reached) throw new Error('Le service d’adresses de l’État ne répond pas (connexion internet ?).');
  return null;
}

export const parseGps = (s: string): { lon: number; lat: number } | null => {
  const m = s.match(/(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1].replace(',', '.'));
  const lon = Number(m[2].replace(',', '.'));
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
};
export const fmtGps = (p: { lon: number; lat: number }) => `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`;

/* ── Parcelle cadastrale ── */
export async function fetchParcelle(p: { lon: number; lat: number }): Promise<string | null> {
  const geom = encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [p.lon, p.lat] }));
  const j = await getJson(`https://apicarto.ign.fr/api/cadastre/parcelle?geom=${geom}`);
  const f = j?.features?.[0]?.properties;
  if (!f) return null;
  const section = String(f.section ?? '').replace(/^0+/, '');
  const numero = String(f.numero ?? '').replace(/^0+/, '');
  const prefixe = f.com_abs && f.com_abs !== '000' ? `préfixe ${f.com_abs}, ` : '';
  const cont = f.contenance ? ` (contenance ${Number(f.contenance).toLocaleString('fr-FR')} m²)` : '';
  return `${prefixe}section ${section} numéro ${numero}${cont}`.replace(/^./, (c) => c.toUpperCase());
}

/* ── Cartes (WMS Géoplateforme) ── */
const R = 6378137;
const merc = (p: { lon: number; lat: number }) => ({
  x: (p.lon * Math.PI * R) / 180,
  y: R * Math.log(Math.tan(Math.PI / 4 + (p.lat * Math.PI) / 360)),
});

export interface CarteDef {
  id: string; titre: string; legende: string; demiLargeur: number;
  /** Couches WMS raster (data.geopf.fr/wms-r), essayées dans l'ordre */
  wms?: string[];
  /** Couche WMTS (tuiles), utilisée en priorité quand elle existe : plus fiable */
  wmts?: { layer: string; style: string; format: string; zoom: number; fond?: { layer: string; style: string; format: string } };
}
export const CARTES: CarteDef[] = [
  { id: 'cadastre', titre: 'Plan cadastral', demiLargeur: 90, legende: 'Plan cadastral (parcellaire express, IGN) — le bâtiment est au centre',
    wmts: { layer: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS', style: 'PCI vecteur', format: 'image/png', zoom: 19 }, wms: ['CADASTRALPARCELS.PARCELS'] },
  { id: 'ortho', titre: 'Vue aérienne et cadastre', demiLargeur: 120, legende: 'Photographie aérienne actuelle et limites cadastrales (IGN)',
    wmts: { layer: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS', style: 'PCI vecteur', format: 'image/png', zoom: 19, fond: { layer: 'ORTHOIMAGERY.ORTHOPHOTOS', style: 'normal', format: 'image/jpeg' } }, wms: ['ORTHOIMAGERY.ORTHOPHOTOS'] },
  { id: 'aerien1950', titre: 'Vue aérienne 1950-1965', demiLargeur: 200, legende: 'Photographie aérienne historique 1950-1965 (IGN)', wms: ['ORTHOIMAGERY.ORTHOPHOTOS.1950-1965'] },
  { id: 'etatmajor', titre: 'Carte d’état-major', demiLargeur: 700, legende: 'Carte d’état-major, 1820-1866 (IGN)', wms: ['GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40'] },
  { id: 'cassini', titre: 'Carte de Cassini', demiLargeur: 1600, legende: 'Carte de Cassini, XVIIIe siècle (IGN et Bibliothèque nationale de France)', wms: ['BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI'] },
];

export function wmsUrl(layer: string, demiLargeur: number, p: { lon: number; lat: number }, w = 1200, h = 900): string {
  const m = merc(p);
  const dx = demiLargeur;
  const dy = (dx * h) / w;
  const qs = new URLSearchParams({
    SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetMap', CRS: 'EPSG:3857',
    BBOX: [m.x - dx, m.y - dy, m.x + dx, m.y + dy].map((v) => v.toFixed(1)).join(','),
    WIDTH: String(w), HEIGHT: String(h), LAYERS: layer, STYLES: '', FORMAT: 'image/png',
  });
  return `https://data.geopf.fr/wms-r?${qs.toString()}`;
}

/** Charge une image ; échoue si le service renvoie une erreur (XML) au lieu d'une image. */
function loadImage(src: string, cors = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    const t = setTimeout(() => reject(new Error('délai dépassé')), 15000);
    img.onload = () => { clearTimeout(t); img.naturalWidth > 1 ? resolve(img) : reject(new Error('image vide')); };
    img.onerror = () => { clearTimeout(t); reject(new Error('image indisponible')); };
    img.src = src;
  });
}

const tileUrl = (t: { layer: string; style: string; format: string }, z: number, x: number, y: number) =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${encodeURIComponent(t.layer)}&STYLE=${encodeURIComponent(t.style)}&TILEMATRIXSET=PM&TILEMATRIX=${z}&TILECOL=${x}&TILEROW=${y}&FORMAT=${encodeURIComponent(t.format)}`;

/** Assemble les tuiles WMTS autour du point dans un canevas (fond blanc ou photo aérienne). */
async function composeWmts(c: CarteDef, p: { lon: number; lat: number }, W = 1200, H = 900): Promise<string> {
  const t = c.wmts!;
  const z = t.zoom;
  const n = 2 ** z;
  const fx = ((p.lon + 180) / 360) * n;
  const latR = (p.lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  const x0 = Math.floor(fx - W / 512) - 1, x1 = Math.floor(fx + W / 512) + 1;
  const y0 = Math.floor(fy - H / 512) - 1, y1 = Math.floor(fy + H / 512) + 1;
  const draw = async (layer: { layer: string; style: string; format: string }, required: boolean) => {
    const jobs: Promise<void>[] = [];
    let ok = 0;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      jobs.push(loadImage(tileUrl(layer, z, x, y)).then((img) => {
        g.drawImage(img, Math.round(W / 2 + (x - fx) * 256), Math.round(H / 2 + (y - fy) * 256), 256, 256); ok++;
      }).catch(() => {}));
    }
    await Promise.all(jobs);
    if (required && ok === 0) throw new Error('tuiles indisponibles');
  };
  if (t.fond) await draw(t.fond, true);
  await draw(t, !t.fond);
  marker(g, W / 2, H / 2);
  return cv.toDataURL('image/jpeg', 0.88); // échoue si les tuiles ne sont pas autorisées (CORS)
}

function marker(g: CanvasRenderingContext2D, cx: number, cy: number) {
  g.lineWidth = 6; g.strokeStyle = '#FFFFFF';
  g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.strokeStyle = '#B97A5B';
  g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#B97A5B'; g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fill();
}

/** WMS : copie avec repère si possible, sinon lien direct vérifié. */
async function wmsPhoto(layer: string, c: CarteDef, p: { lon: number; lat: number }): Promise<string> {
  const url = wmsUrl(layer, c.demiLargeur, p);
  try {
    const img = await loadImage(url);
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, 0);
    marker(g, cv.width / 2, cv.height / 2);
    return cv.toDataURL('image/jpeg', 0.88);
  } catch {
    await loadImage(url, false); // sans CORS : on vérifie seulement que l'image existe
    return url;
  }
}

export interface ResultatCartes { photos: Photo[]; echecs: CarteDef[] }

/** Récupère les cartes demandées. Celles qui ne s'affichent pas sont signalées : un lien est proposé à la place. */
export async function fetchCartes(p: { lon: number; lat: number }, ids: string[]): Promise<ResultatCartes> {
  const photos: Photo[] = [];
  const echecs: CarteDef[] = [];
  await Promise.all(CARTES.filter((c) => ids.includes(c.id)).map(async (c) => {
    let src: string | null = null;
    if (c.wmts) { try { src = await composeWmts(c, p); } catch { /* repli WMS */ } }
    for (const layer of c.wms ?? []) {
      if (src) break;
      try { src = await wmsPhoto(layer, c, p); } catch { /* couche suivante */ }
    }
    if (src) photos.push({ id: `carte-${c.id}`, src, legende: c.legende });
    else echecs.push(c);
  }));
  photos.sort((a, b) => CARTES.findIndex((c) => `carte-${c.id}` === a.id) - CARTES.findIndex((c) => `carte-${c.id}` === b.id));
  return { photos, echecs };
}

/** Lien Géoportail centré sur le bâtiment pour une carte donnée (capture à la main). */
export function lienCarte(c: CarteDef, p: { lon: number; lat: number }): string {
  const layers: Record<string, string[]> = {
    cadastre: ['CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'],
    ortho: ['CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'ORTHOIMAGERY.ORTHOPHOTOS'],
    aerien1950: ['ORTHOIMAGERY.ORTHOPHOTOS.1950-1965'],
    etatmajor: ['GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40'],
    cassini: ['BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI'],
  };
  const z = c.demiLargeur < 150 ? 18 : c.demiLargeur < 500 ? 17 : c.demiLargeur < 1000 ? 15 : 14;
  return gp(p, z, layers[c.id] ?? []);
}

/* ── Urbanisme et protections (Géoportail de l'urbanisme, API Carto) ── */

const SUP: Record<string, string> = {
  ac1: 'Périmètre de protection d’un monument historique (avis de l’architecte des Bâtiments de France pour les travaux extérieurs)',
  ac2: 'Site inscrit ou classé',
  ac4: 'Site patrimonial remarquable (ancienne ZPPAUP ou AVAP)',
  pm1: 'Plan de prévention des risques naturels',
  pm3: 'Plan de prévention des risques technologiques',
};

export interface Urbanisme { zone?: string; document?: string; protections: string[]; rnu?: boolean }

export async function fetchUrbanisme(p: { lon: number; lat: number }, citycode?: string): Promise<Urbanisme> {
  const geom = encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [p.lon, p.lat] }));
  const out: Urbanisme = { protections: [] };
  let reached = false;
  try {
    const j = await getJson(`https://apicarto.ign.fr/api/gpu/zone-urba?geom=${geom}`);
    reached = true;
    const f = j?.features?.[0]?.properties;
    if (f) out.zone = [`Zone ${f.libelle ?? f.typezone ?? ''}`.trim(), f.libelong].filter(Boolean).join(' — ');
  } catch { /* facultatif */ }
  try {
    const j = await getJson(`https://apicarto.ign.fr/api/gpu/document?geom=${geom}`);
    reached = true;
    const f = j?.features?.[0]?.properties;
    if (f) out.document = String(f.du_type ?? f.typedoc ?? f.grid_title ?? '').trim() || undefined;
  } catch { /* facultatif */ }
  if (!out.zone && citycode) {
    try {
      const j = await getJson(`https://apicarto.ign.fr/api/gpu/municipality?insee=${citycode}`);
      reached = true;
      if (j?.features?.[0]?.properties?.is_rnu) out.rnu = true;
    } catch { /* facultatif */ }
  }
  for (const res of ['assiette-sup-s', 'assiette-sup-p', 'assiette-sup-l']) {
    try {
      const j = await getJson(`https://apicarto.ign.fr/api/gpu/${res}?geom=${geom}`);
      reached = true;
      for (const f of j?.features ?? []) {
        const t = String(f.properties?.suptype ?? f.properties?.typesup ?? '').toLowerCase();
        const lib = SUP[t];
        const nom = f.properties?.nomsuplitt ?? f.properties?.nomass ?? '';
        if (lib) out.protections.push(nom ? `${lib} : ${nom}` : lib);
      }
    } catch { /* facultatif */ }
  }
  out.protections = Array.from(new Set(out.protections));
  if (!reached) throw new Error('Le Géoportail de l’urbanisme ne répond pas.');
  return out;
}

export function texteUrbanisme(u: Urbanisme): string {
  const parts: string[] = [];
  if (u.zone) parts.push(`${u.zone}${u.document ? ` (${u.document})` : ''}`);
  else if (u.rnu) parts.push('Commune soumise au règlement national d’urbanisme');
  if (u.protections.length) parts.push(u.protections.join(' ; '));
  else if (u.zone || u.rnu) parts.push('Aucune servitude patrimoniale recensée au Géoportail de l’urbanisme (à vérifier en mairie)');
  return parts.join('. ');
}

export function liensUrbanisme(p: { lon: number; lat: number }) {
  return [
    { titre: 'Géoportail de l’urbanisme (zonage, servitudes)', url: `https://www.geoportail-urbanisme.gouv.fr/map/#tile=1&lon=${p.lon.toFixed(6)}&lat=${p.lat.toFixed(6)}&zoom=18` },
    { titre: 'Cadastre officiel (cadastre.gouv.fr)', url: 'https://www.cadastre.gouv.fr/scpc/rechercherPlan.do' },
    { titre: 'Atlas des patrimoines (monuments, sites)', url: 'http://atlas.patrimoines.culture.fr/atlas/trunk/' },
    { titre: 'cartes.gouv.fr — cadastre', url: gp(p, 18, ['CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2']) },
    { titre: 'Géorisques — rapport sur cette adresse (PDF)', url: `https://georisques.gouv.fr/api/v1/rapport_pdf?latlon=${p.lon.toFixed(6)},${p.lat.toFixed(6)}` },
  ];
}

/* ── Liens pour captures à la main ── */
/** Lien cartes.gouv.fr (successeur du Géoportail, fermé le 30 septembre 2026), centré sur le bâtiment. */
const gp = (p: { lon: number; lat: number }, z: number, layers: string[]) =>
  `https://cartes.gouv.fr/explorer-les-cartes?c=${p.lon.toFixed(6)},${p.lat.toFixed(6)}&z=${z}&l=${[...layers].reverse().map((l, i) => `${l}$GEOPORTAIL:OGC:WMTS(${i + 1};1;1;0)`).join(',')}&w=&permalink=yes`;

export function liensCartes(p: { lon: number; lat: number }) {
  const ll = `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`;
  return [
    { titre: 'cartes.gouv.fr — cadastre et vue aérienne', url: gp(p, 18, ['CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'ORTHOIMAGERY.ORTHOPHOTOS']) },
    { titre: 'cartes.gouv.fr — carte d’état-major', url: gp(p, 16, ['GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40']) },
    { titre: 'cartes.gouv.fr — carte de Cassini', url: gp(p, 14, ['BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI']) },
    { titre: 'Remonter le temps (IGN) — comparer les époques', url: `https://remonterletemps.ign.fr/comparer?lon=${p.lon.toFixed(6)}&lat=${p.lat.toFixed(6)}&z=17` },
    { titre: 'Géorisques — rapport officiel en PDF', url: `https://georisques.gouv.fr/api/v1/rapport_pdf?latlon=${ll}` },
    { titre: 'Géorisques — risques près de chez moi', url: 'https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi' },
  ];
}

/* ── Géorisques : risques recensés (base GASPAR) ── */
export async function fetchRisques(p: { lon: number; lat: number }): Promise<string | null> {
  const ll = `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`;
  const parts: string[] = [];
  try {
    const j = await getJson(`https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${ll}`);
    const det = (j?.data?.[0]?.risques_detail ?? []) as { libelle_risque_long?: string }[];
    const libs = Array.from(new Set(det.map((d) => d.libelle_risque_long).filter(Boolean))) as string[];
    if (libs.length) parts.push(`Risques recensés sur la commune : ${libs.map((l) => l.toLowerCase()).join(', ')}.`);
  } catch { /* facultatif */ }
  try {
    const j = await getJson(`https://georisques.gouv.fr/api/v1/rga?latlon=${ll}`);
    const expo = j?.exposition ?? j?.data?.[0]?.exposition;
    if (expo) parts.push(`Exposition au retrait-gonflement des argiles : ${String(expo).toLowerCase()}.`);
  } catch { /* facultatif */ }
  return parts.length ? `${parts.join(' ')} (Source : Géorisques, à compléter avec le rapport officiel.)` : null;
}
