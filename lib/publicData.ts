/**
 * Données publiques sur le bâtiment, à partir de l'adresse (gratuit, sans clé) :
 *  - Base Adresse Nationale (Géoplateforme IGN) : géocodage de l'adresse ;
 *  - BDNB (CSTB, open data) : année de construction, usage, matériaux, niveaux,
 *    proximité d'un monument historique, aléa argiles.
 * Les valeurs sont des PROPOSITIONS : l'année des fichiers fonciers est souvent
 * approximative pour le bâti ancien. L'expert valide toujours.
 */

export interface PublicData {
  adresse: string;
  annee?: number;
  datation?: string;
  typologie?: string;
  materiaux?: string;
  patrimoine?: string;
  argiles?: string;
  champs: number; // nombre d'informations trouvées
}

const BDNB = 'https://api.bdnb.io/v1/bdnb/donnees';

async function getJson(url: string) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function geocode(q: string): Promise<{ id: string; label: string } | null> {
  let reached = false;
  const urls = [
    `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=1&index=address`,
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`,
  ];
  for (const u of urls) {
    try {
      const j = await getJson(u);
      reached = true;
      const f = j?.features?.[0];
      if (f?.properties?.id) return { id: f.properties.id, label: f.properties.label };
    } catch { /* service suivant */ }
  }
  if (!reached) throw new Error('Le service d’adresses de l’État ne répond pas (connexion internet ?). Utilisez les listes déroulantes.');
  return null;
}

const ROMAN = ['', 'Ier', 'IIe', 'IIIe', 'IVe', 'Ve', 'VIe', 'VIIe', 'VIIIe', 'IXe', 'Xe', 'XIe', 'XIIe', 'XIIIe', 'XIVe', 'XVe', 'XVIe', 'XVIIe', 'XVIIIe', 'XIXe', 'XXe', 'XXIe'];

export function yearToDatation(y: number): string {
  if (y >= 1919 && y <= 1939) return `Entre-deux-guerres (données publiques : ${y})`;
  const c = Math.floor((y - 1) / 100) + 1;
  const pos = y % 100;
  const moment = pos <= 33 ? 'début du ' : pos >= 67 ? 'fin du ' : '';
  return `${moment ? moment.charAt(0).toUpperCase() + moment.slice(1) : ''}${ROMAN[c] ?? ''} siècle (données publiques : ${y}, à confirmer sur place)`.replace(/^ /, '');
}

const cap = (s: string) => s.toLowerCase().replace(/^./, (c) => c.toUpperCase());

/** Cherche la première colonne dont le nom correspond et qui a une valeur. */
function pick(row: Record<string, unknown>, re: RegExp): unknown {
  for (const [k, v] of Object.entries(row)) if (re.test(k) && v !== null && v !== '' && v !== undefined) return v;
  return undefined;
}

export async function fetchPublicData(adresse: string): Promise<PublicData> {
  const geo = await geocode(adresse);
  if (!geo) throw new Error('Adresse introuvable dans la Base Adresse Nationale : vérifiez l’adresse et le code postal.');

  let row: Record<string, unknown> | null = null;
  try {
    const rel = await getJson(`${BDNB}/rel_batiment_groupe_adresse?cle_interop_adr=eq.${encodeURIComponent(geo.id)}&select=batiment_groupe_id&limit=1`);
    const bg = rel?.[0]?.batiment_groupe_id;
    if (bg) {
      const rows = await getJson(`${BDNB}/batiment_groupe_complet?batiment_groupe_id=eq.${encodeURIComponent(bg)}&limit=1`);
      row = rows?.[0] ?? null;
    }
  } catch {
    throw new Error('La base nationale des bâtiments ne répond pas pour le moment (ou bloque l’accès depuis ce navigateur). Utilisez les listes déroulantes.');
  }
  if (!row) throw new Error(`Adresse trouvée (${geo.label}), mais aucun bâtiment associé dans la base nationale des bâtiments.`);

  const out: PublicData = { adresse: geo.label, champs: 0 };

  const annee = Number(pick(row, /^annee_construction/));
  if (annee > 1000 && annee <= new Date().getFullYear()) { out.annee = annee; out.datation = yearToDatation(annee); out.champs++; }

  const usage = String(pick(row, /usage_niveau_1_txt|usage_principal/) ?? '');
  const niveaux = Number(pick(row, /^nb_niveau/));
  if (usage || niveaux) {
    const base = /collectif/i.test(usage) ? 'Immeuble collectif' : /individuel/i.test(usage) ? 'Maison individuelle' : usage ? cap(usage) : 'Bâtiment';
    out.typologie = niveaux > 0 ? `${base} sur ${niveaux} niveau${niveaux > 1 ? 'x' : ''}` : base;
    out.champs++;
  }

  const mur = pick(row, /mat_mur_txt/);
  const toit = pick(row, /mat_toit_txt/);
  if (mur || toit) {
    out.materiaux = [mur && `Murs : ${String(mur).toLowerCase()}`, toit && `toiture : ${String(toit).toLowerCase()}`].filter(Boolean).join(' ; ');
    out.champs++;
  }

  const mh = pick(row, /bat_historique|monument_historique|perimetre_.*historique/);
  if (mh === true || (typeof mh === 'number' && mh <= 500)) {
    out.patrimoine = 'Situé dans le périmètre de protection d’un monument historique : avis de l’architecte des Bâtiments de France à prévoir pour les travaux extérieurs.';
    out.champs++;
  }

  const arg = pick(row, /alea_argiles/);
  if (arg) { out.argiles = `Aléa retrait-gonflement des argiles : ${String(arg).toLowerCase()} (données publiques).`; out.champs++; }

  return out;
}
