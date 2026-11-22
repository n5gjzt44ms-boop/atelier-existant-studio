/**
 * Rangement et recherche de la bibliothèque : catégories par ouvrage (désordres) et par nature
 * d'intervention (préconisations), recherche tolérante (accents, pluriels, plusieurs mots, synonymes),
 * corps d'état limités aux métiers, et repérage / fusion des doublons.
 */
import type { DesordreTemplate } from './templates';
import type { PreconisationType } from './preconisations';

/* ───────────── Recherche ───────────── */
export const sansAccent = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
const racine = (w: string) => (w.length > 4 ? w.replace(/(ements|ement|ations|ation|ees|ee|es|s|x|e)$/, '') : w);

/** Synonymes de terrain : taper l'un trouve l'autre. */
const SYNONYMES: string[][] = [
  ['fissure', 'lezarde', 'faience', 'fente', 'crevasse'],
  ['humidite', 'humide', 'eau', 'infiltration', 'capillaire', 'salpetre', 'condensation', 'moisissure'],
  ['ciment', 'cimentaire', 'beton'],
  ['bois', 'poutre', 'solive', 'charpente', 'panne', 'chevron', 'xylophage', 'merule', 'termite', 'pourriture'],
  ['pierre', 'moellon', 'maconnerie', 'parement', 'elevation'],
  ['enduit', 'crepi', 'ravalement'],
  ['joint', 'rejointoiement', 'jointoiement'],
  ['toiture', 'couverture', 'tuile', 'ardoise', 'toit'],
  ['gouttiere', 'descente', 'zinguerie', 'zinc', 'eaux pluviales', 'chenau'],
  ['etaiement', 'etai', 'etaye', 'securisation', 'conservatoire', 'urgence'],
  ['metal', 'metallique', 'acier', 'fer', 'rouille', 'oxydation', 'corrosion', 'tirant'],
  ['cave', 'sous sol', 'soupirail'],
  ['vegetaux', 'vegetation', 'mousse', 'lichen', 'lierre', 'racine'],
  ['oiseau', 'volatile', 'pigeon', 'fiente'],
];
const synonymesDe = (w: string): string[] => {
  const r = racine(w);
  const g = SYNONYMES.find((l) => l.some((s) => racine(s) === r || (r.length > 3 && racine(s).startsWith(r))));
  return g ? g.map(racine) : [r];
};

/** Chaque mot tapé (ou l'un de ses synonymes) doit se retrouver dans le texte. */
export function correspond(texte: string, q: string): boolean {
  const mots = sansAccent(q).split(/[^a-z0-9]+/).filter(Boolean);
  if (!mots.length) return true;
  const t = sansAccent(texte);
  return mots.every((m) => t.includes(m) || synonymesDe(m).some((s) => t.includes(s)));
}

/* ───────────── Catégories ───────────── */
export const CATEGORIES_DESORDRE = [
  'Murs et maçonneries', 'Façades, enduits et pierre de parement', 'Ouvertures, linteaux et menuiseries', 'Planchers, voûtes et escaliers',
  'Charpente et couverture', 'Caves et sous-sols', 'Fondations, sols et abords', 'Réseaux, conduits et équipements', 'Intérieurs et doublages', 'Sécurité et constats généraux',
] as const;

const PAR_ELEMENT: Record<string, string> = {
  'Mur': 'Murs et maçonneries', 'Pierre': 'Façades, enduits et pierre de parement', 'Joint': 'Façades, enduits et pierre de parement', 'Enduit': 'Façades, enduits et pierre de parement',
  'Soubassement': 'Murs et maçonneries', 'Pignon': 'Murs et maçonneries', 'Trumeau': 'Murs et maçonneries', 'Chaîne d’angle': 'Murs et maçonneries', 'Tirant': 'Murs et maçonneries',
  'Pan de bois': 'Murs et maçonneries', 'Mur de soutènement / clôture': 'Murs et maçonneries', 'Corniche / bandeau': 'Façades, enduits et pierre de parement',
  'Linteau': 'Ouvertures, linteaux et menuiseries', 'Appui / seuil': 'Ouvertures, linteaux et menuiseries', 'Menuiserie': 'Ouvertures, linteaux et menuiseries',
  'Balcon / garde-corps': 'Ouvertures, linteaux et menuiseries', 'Ferronnerie': 'Ouvertures, linteaux et menuiseries', 'Lucarne': 'Charpente et couverture',
  'Plancher': 'Planchers, voûtes et escaliers', 'Poutre': 'Planchers, voûtes et escaliers', 'Voûte': 'Planchers, voûtes et escaliers', 'Voûte / voûtains': 'Planchers, voûtes et escaliers', 'Escalier': 'Planchers, voûtes et escaliers',
  'Charpente': 'Charpente et couverture', 'Couverture': 'Charpente et couverture', 'Gouttière / descente': 'Charpente et couverture', 'Faîtage / rive': 'Charpente et couverture',
  'Noue / solin': 'Charpente et couverture', 'Souche de cheminée': 'Charpente et couverture',
  'Cave': 'Caves et sous-sols', 'Fondation': 'Fondations, sols et abords', 'Abords': 'Fondations, sols et abords',
  'Réseaux': 'Réseaux, conduits et équipements', 'Conduit': 'Réseaux, conduits et équipements',
  'Doublage': 'Intérieurs et doublages', 'Dallage / sol intérieur': 'Intérieurs et doublages',
};
const DESORDRE_MOTS: [RegExp, string][] = [
  [/mesures conservatoires|encombrement|dissimul|mouvement global|^autre$/i, 'Sécurité et constats généraux'],
  [/cave|sous-sol|soupira|cuvelage/i, 'Caves et sous-sols'],
  [/linteau|menuiserie|appui|garde-corps|fen[eê]tre|clés d’arc/i, 'Ouvertures, linteaux et menuiseries'],
  [/plancher|escalier en|voûte|poutre/i, 'Planchers, voûtes et escaliers'],
  [/charpente|couverture|tuile|ardoise|faîtage|solin|noue|souche|sous-toiture|volatile/i, 'Charpente et couverture'],
  [/fondation|argile|sol extérieur|dallage extérieur|eaux pluviales rejetées/i, 'Fondations, sols et abords'],
  [/électri|conduit|réseau/i, 'Réseaux, conduits et équipements'],
  [/enduit|joint|pierre|parement|desquam|alvéol|exfol|croûte|salissure|graffiti|peinture|corniche|bandeau/i, 'Façades, enduits et pierre de parement'],
  [/doublage|moisissure|isolation|dallage béton intérieur|condensation/i, 'Intérieurs et doublages'],
];
export function categorieDesordre(t: Pick<DesordreTemplate, 'type' | 'element'> & { categorie?: string }): string {
  if (t.categorie) return t.categorie;
  const parMot = DESORDRE_MOTS.find(([r]) => r.test(t.type))?.[1];
  // Les mots du titre priment pour les désordres « généraux » et les ouvrages précis
  if (parMot && ['Sécurité et constats généraux', 'Caves et sous-sols', 'Ouvertures, linteaux et menuiseries', 'Planchers, voûtes et escaliers', 'Charpente et couverture', 'Fondations, sols et abords', 'Intérieurs et doublages'].includes(parMot)) return parMot;
  return PAR_ELEMENT[t.element] ?? parMot ?? 'Murs et maçonneries';
}

export const CATEGORIES_PRECO = [
  'Mise en sécurité et étaiement', 'Études, sondages et suivi', 'Fissures et renforcements structurels', 'Maçonneries, pierre et joints',
  'Enduits et façades', 'Nettoyage et traitements de surface', 'Eau, humidité et ventilation', 'Couverture, zinguerie et eaux pluviales',
  'Bois et charpente', 'Ouvertures, menuiseries et métallerie', 'Réseaux, conduits et équipements', 'Isolation et confort', 'Entretien et évacuation',
] as const;
const PRECO_MOTS: [RegExp, string][] = [
  [/étai|sécuris|étrésillon|mise en sécurité/i, 'Mise en sécurité et étaiement'],
  [/étude|diagnostic|sondage|investigation|témoins|suivi|G5|géotechn|essais/i, 'Études, sondages et suivi'],
  [/isolation|sarking|perspirant|chanvre/i, 'Isolation et confort'],
  [/couverture|zinc|gouttière|faîtage|solin|noue|démoussage|sous-toiture|souche|eaux pluviales|remaniement|saillant/i, 'Couverture, zinguerie et eaux pluviales'],
  [/bois|charpente|poutre|termite|mérule|pan de bois|torchis|poteau|essentage|plancher technique/i, 'Bois et charpente'],
  [/fissure|lézarde|agrafe|tirant|harpage|sommier|coulis|épinglage|poussée|fondation|argiles|percement|dévers|remontage|renforc|entrait/i, 'Fissures et renforcements structurels'],
  [/menuiserie|linteau|ouverture|appui|garde-corps|métalli|scellement|ferronn|aciers/i, 'Ouvertures, menuiseries et métallerie'],
  [/nettoy|hydrogom|biocide|végéta|graffiti|pigeon|décapage|hydrofuge|badigeon|cataplasme|laser|nébulis|suie|volatiles|mousses/i, 'Nettoyage et traitements de surface'],
  [/réseau|conduit|tubage|électri/i, 'Réseaux, conduits et équipements'],
  [/cave|ventilation|drain|humid|dessalement|moisissure|barbacane|abords|sol |sol$|dallage|doublage|terre|façade exposée|étanchéité adaptée|cheminement|goutte/i, 'Eau, humidité et ventilation'],
  [/enduit|ravalement|plâtre|ragréage|piquage/i, 'Enduits et façades'],
  [/pierre|maçonnerie|joint|relancis|incrustation|corniche|bandeau|soubassement|escalier|tête|consolidation|reprises/i, 'Maçonneries, pierre et joints'],
  [/entretien|évacuation|stockage/i, 'Entretien et évacuation'],
];
export function categoriePreco(p: Pick<PreconisationType, 'titre'> & { categorie?: string }): string {
  if (p.categorie) return p.categorie;
  return PRECO_MOTS.find(([r]) => r.test(p.titre))?.[1] ?? 'Maçonneries, pierre et joints';
}

/** Texte cherché pour un désordre type : titre, anciens noms, élément, catégorie, famille, corps d'état et textes. */
export const motsDesordre = (t: DesordreTemplate) =>
  [t.type, ...(t.alias ?? []), t.element, categorieDesordre(t), t.famille, ...(t.lots ?? [t.lot]), t.constat, t.analyse].join(' ');
export const motsPreco = (p: PreconisationType) =>
  [p.titre, ...(p.alias ?? []), categoriePreco(p), p.famille, ...(p.lots ?? [p.lot]), ...(p.pour ?? []), p.texte].join(' ');

/* ───────────── Corps d'état = métiers ───────────── */
export const METIERS = [
  'Maçon – tailleur de pierre', 'Façadier', 'Charpentier', 'Couvreur-zingueur', 'Menuisier', 'Serrurier-métallier', 'Plâtrier-plaquiste', 'Peintre',
  'Plombier', 'Chauffagiste – ventilation', 'Électricien', 'Fumiste', 'Terrassier', 'Agent de nettoyage', 'Ingénieur structure (BET)', 'Géotechnicien', 'Diagnostiqueur',
];
/** Anciens « lots » (ouvrages ou spécialités) → métier. Le texte aide à départager quand un ancien lot couvrait plusieurs métiers. */
export function versMetier(lot: string, texte = ''): string {
  const l = lot.trim();
  if (!l || METIERS.includes(l)) return l;
  switch (l) {
    case 'Maçonnerie – pierre de taille': case 'Étaiement – sécurisation': return 'Maçon – tailleur de pierre';
    case 'Enduits et rejointoiement à la chaux': return /enduit|ravalement|badigeon/i.test(texte) || !texte ? 'Façadier' : 'Maçon – tailleur de pierre';
    case 'Charpente – menuiserie bois': return /menuiserie|fenêtre|volet|porte/i.test(texte) ? 'Menuisier' : 'Charpentier';
    case 'Traitement des bois': case 'Charpente et traitement des bois': return 'Charpentier';
    case 'Couverture – zinguerie': case 'Entretien': return 'Couvreur-zingueur';
    case 'Voirie et réseaux – drainage': return 'Terrassier';
    case 'Ventilation': return 'Chauffagiste – ventilation';
    case 'Isolation biosourcée': return /toiture|sarking|rampant/i.test(texte) ? 'Couvreur-zingueur' : 'Plâtrier-plaquiste';
    case 'Finitions intérieures': return 'Peintre';
    case 'Menuiseries extérieures': return 'Menuisier';
    case 'Électricité': return 'Électricien';
    case 'Ferronnerie – serrurerie': return 'Serrurier-métallier';
    case 'Fumisterie – conduits': return 'Fumiste';
    case 'Plâtrerie': return 'Plâtrier-plaquiste';
    case 'Réseaux – plomberie': return 'Plombier';
    case 'Nettoyage – évacuation': return 'Agent de nettoyage';
    case 'Bureau d’études structure': return 'Ingénieur structure (BET)';
    case 'Diagnostiqueur agréé (xylophages / fongiques)': return 'Diagnostiqueur';
    case 'Études et investigations': return /G5|géotechn|sol/i.test(texte) ? 'Géotechnicien' : /xylophage|termite|mérule|fongique|amiante|plomb/i.test(texte) ? 'Diagnostiqueur' : 'Ingénieur structure (BET)';
    default: return l;
  }
}
const ANCIENS_LOTS = ['Maçonnerie – pierre de taille', 'Étaiement – sécurisation', 'Enduits et rejointoiement à la chaux', 'Charpente – menuiserie bois', 'Traitement des bois', 'Charpente et traitement des bois',
  'Couverture – zinguerie', 'Entretien', 'Voirie et réseaux – drainage', 'Ventilation', 'Isolation biosourcée', 'Finitions intérieures', 'Menuiseries extérieures', 'Électricité',
  'Ferronnerie – serrurerie', 'Fumisterie – conduits', 'Plâtrerie', 'Réseaux – plomberie', 'Nettoyage – évacuation', 'Bureau d’études structure', 'Diagnostiqueur agréé (xylophages / fongiques)', 'Études et investigations'];
export const estAncienLot = (l: string) => ANCIENS_LOTS.includes(l);
/** Convertit lot + lots d'un objet en métiers, sans doublon (le premier reste le lot principal). */
export function metiersDe<T extends { lot: string; lots?: string[] }>(x: T, texte = ''): T {
  const src = (x.lots?.length ? x.lots : [x.lot]).filter((v) => v && v.trim());
  const lots = Array.from(new Set(src.map((l) => versMetier(l, texte))));
  return { ...x, lots, lot: lots[0] ?? '' };
}

/* ───────────── Doublons ───────────── */
const VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'ou', 'en', 'au', 'aux', 'un', 'une', 'par', 'sur', 'sous', 'dans', 'avec', 'non', 'pour', 'mauvais', 'etat', 'degrade', 'degradee', 'degrades', 'degradees']);
const jetons = (s: string) => new Set(sansAccent(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !VIDES.has(w)).map(racine));
/** Ressemblance de deux titres (0 à 1) : part des mots significatifs en commun. */
export function ressemblance(a: string, b: string): number {
  const A = jetons(a), B = jetons(b);
  if (!A.size || !B.size) return 0;
  const communs = [...A].filter((x) => B.has(x)).length;
  return communs / Math.min(A.size, B.size);
}
export function doublonsProbables<T>(items: T[], titre: (x: T) => string, seuil = 0.99): [T, T, number][] {
  const out: [T, T, number][] = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const s = ressemblance(titre(items[i]), titre(items[j]));
    if (s >= seuil) out.push([items[i], items[j], s]);
  }
  return out.sort((a, b) => b[2] - a[2]);
}

/** Fusionne le désordre type `ancien` dans `garde` : l'ancien nom devient un alias, les préconisations qui le visaient visent `garde`. */
export function fusionnerDesordres<L extends { desordres: DesordreTemplate[]; preconisations: PreconisationType[] }>(lib: L, garde: string, ancien: string): L {
  const g = lib.desordres.find((x) => x.type === garde), a = lib.desordres.find((x) => x.type === ancien);
  if (!g || !a || g === a) return lib;
  const lots = Array.from(new Set([...(g.lots?.length ? g.lots : [g.lot]), ...(a.lots?.length ? a.lots : [a.lot])].filter(Boolean)));
  const fusion: DesordreTemplate = {
    ...g, lots, lot: lots[0] ?? g.lot,
    alias: Array.from(new Set([...(g.alias ?? []), a.type, ...(a.alias ?? [])])),
    investigations: g.investigations.trim() && g.investigations.trim() !== '—' ? g.investigations : a.investigations,
    prixId: g.prixId ?? a.prixId,
  };
  return {
    ...lib,
    desordres: lib.desordres.filter((x) => x !== a).map((x) => (x === g ? fusion : x)),
    preconisations: lib.preconisations.map((p) => (p.pour?.includes(ancien) ? { ...p, pour: Array.from(new Set(p.pour.map((t) => (t === ancien ? garde : t)))) } : p)),
  };
}
export function fusionnerPrecos<L extends { preconisations: PreconisationType[] }>(lib: L, garde: string, ancien: string): L {
  const g = lib.preconisations.find((x) => x.id === garde), a = lib.preconisations.find((x) => x.id === ancien);
  if (!g || !a || g === a) return lib;
  const lots = Array.from(new Set([...(g.lots?.length ? g.lots : [g.lot]), ...(a.lots?.length ? a.lots : [a.lot])].filter(Boolean)));
  const fusion: PreconisationType = {
    ...g, lots, lot: lots[0] ?? g.lot, prixId: g.prixId ?? a.prixId,
    pour: Array.from(new Set([...(g.pour ?? []), ...(a.pour ?? [])])),
    alias: Array.from(new Set([...(g.alias ?? []), a.titre, ...(a.alias ?? [])])),
  };
  return { ...lib, preconisations: lib.preconisations.filter((x) => x !== a).map((x) => (x === g ? fusion : x)) };
}

/** Doublons de la bibliothèque livrée, fusionnés une fois (on garde la rédaction de Lorine Gratadour). */
export const FUSIONS_DESORDRES: [garde: string, ancien: string][] = [
  ['Bandeaux et corniches dégradés', 'Corniche ou bandeau dégradé'],
  ['Présence de volatiles', 'Fientes et salissures d’oiseaux'],
  ['Linteau dégradé ou non conforme', 'Affaissement de linteau'],
];
export const FUSIONS_PRECOS: [garde: string, ancien: string][] = [
  ['lg-piquage-ciment', 'piquage-enduit-ciment'], ['lg-fissures', 'regarnissage'], ['lg-corniches', 'corniche-restauration'],
  ['lg-vegetaux', 'biocide'], ['lg-vegetaux', 'devegetalisation'], ['lg-securisation', 'securisation'], ['lg-diag-complet', 'bet'],
  ['lg-g5', 'etude-g5'], ['lg-sommiers', 'sommier'], ['lg-cave', 'cave-ventilation'], ['lg-menuiseries', 'menuiseries'],
  ['lg-zinc', 'zinguerie'], ['lg-zinc', 'protection-saillies'], ['lg-couverture', 'couverture-revision'], ['lg-linteaux', 'linteau-remplacement'],
];
