import { TEMPLATES, type DesordreTemplate } from './templates';
import { PRECONISATIONS, type PreconisationType } from './preconisations';
import { GUIDES, type Guide } from '@/components/guides';
import { ELEMENTS_PLUS, GUIDES_PLUS, LOTS_PLUS, LOT_BIBLIO, PRECOS_PLUS, TEMPLATES_PLUS } from './biblio2026';
import { ELEMENTS_PLUS_B, GUIDES_PLUS_B, LOTS_PLUS_B, LOT_BIBLIO_B, PRECOS_PLUS_B, TEMPLATES_PLUS_B } from './biblio2026b';
import { FUSIONS_DESORDRES, FUSIONS_PRECOS, METIERS, estAncienLot, fusionnerDesordres, fusionnerPrecos, metiersDe } from './catalogue';
import { ELEMENTS_PLUS_C, LOTS_PLUS_C, LOT_BIBLIO_C, PRECOS_PLUS_C, TEMPLATES_PLUS_C } from './biblio2026c';

/** Lots d'enrichissement livrés une seule fois dans les bibliothèques existantes. */
const LOTS_ENRICHISSEMENT = [
  { id: LOT_BIBLIO, templates: TEMPLATES_PLUS, elements: ELEMENTS_PLUS, lots: LOTS_PLUS },
  { id: LOT_BIBLIO_B, templates: TEMPLATES_PLUS_B, elements: ELEMENTS_PLUS_B, lots: LOTS_PLUS_B },
  { id: LOT_BIBLIO_C, templates: TEMPLATES_PLUS_C, elements: ELEMENTS_PLUS_C, lots: LOTS_PLUS_C },
];
import {
  DEFAULT_MAILS, DEV_VIDE, type Contact, type Developpement, type ModeleMail, type Piste, type Realisation, type Tache,
  DEFAULT_EMPLOYES, DEFAULT_ENTREPRISE, DEFAULT_OPTIONS, DEFAULT_PRESTATIONS, DEFAULT_PRIX,
  type Employe, type EntrepriseInfo, type Evenement, type OptionCommerciale, type Prestation, type PrixItem,
} from './business';

/**
 * Bibliothèque personnelle : listes déroulantes de textes types et désordres types.
 * Livrée avec des textes par défaut (référentiel de L'Atelier de l'Existant),
 * puis modifiable par l'utilisateur (écran « Ma bibliothèque », ou bouton
 * « Ajouter à ma liste » sous chaque champ). Enregistrée dans le navigateur
 * ou dans Supabase (table bibliotheques).
 */

export type PhraseKey =
  | 'objetMission' | 'personnesPresentes' | 'conditionsAcces' | 'meteo' | 'limitesVisite'
  | 'datation' | 'typologie' | 'systemeConstructif' | 'materiaux' | 'abords' | 'geotechnique'
  | 'zoneNoms' | 'zoneObservations'
  | 'constat' | 'analyse' | 'investigations' | 'preconisation'
  | 'mesure' | 'avisTiers' | 'bilan' | 'conclusion'
  | 'elements' | 'lots' | 'souhaits' | 'vigilance' | 'etudes';

/**
 * Espace de travail de l'entreprise, enregistré d'un bloc (navigateur ou table
 * Supabase « bibliotheques ») : textes types, désordres types, prix, offre,
 * entreprise, équipe, agenda, favoris et fréquences d'usage.
 */
export interface Library {
  version: 1;
  phrases: Record<PhraseKey, string[]>;
  desordres: DesordreTemplate[];
  prix: PrixItem[];
  prestations: Prestation[];
  options: OptionCommerciale[];
  entreprise: EntrepriseInfo;
  employes: Employe[];
  agenda: Evenement[];
  preconisations: PreconisationType[];
  guides: Guide[];
  contacts: Contact[];
  mails: ModeleMail[];
  taches: Tache[];
  rappelsFaits: string[];
  pistes: Piste[];
  developpement: Developpement;
  realisations: Realisation[];
  favoris: string[]; // clés « liste::texte »
  usage: Record<string, number>;
  /** Lots d'enrichissement de la bibliothèque déjà livrés (pour ne les ajouter qu'une fois) */
  lotsLivres?: string[];
}

export const PHRASE_LABELS: Record<PhraseKey, string> = {
  objetMission: 'Objet de la mission',
  personnesPresentes: 'Personnes présentes',
  conditionsAcces: 'Conditions d’accès',
  meteo: 'Météo',
  limitesVisite: 'Limites de la visite',
  datation: 'Datation',
  typologie: 'Typologie',
  systemeConstructif: 'Système constructif',
  materiaux: 'Matériaux dominants',
  abords: 'Abords et eaux pluviales',
  geotechnique: 'Contexte géotechnique',
  zoneNoms: 'Noms de zones',
  zoneObservations: 'Observations de zone',
  constat: 'Constats (phrases)',
  analyse: 'Analyses (phrases)',
  investigations: 'Investigations',
  preconisation: 'Préconisations (phrases)',
  mesure: 'Mesures conservatoires',
  avisTiers: 'Avis aux tiers',
  bilan: 'Bilan / avis',
  conclusion: 'Conclusion et orientation',
  elements: 'Éléments d’ouvrage',
  lots: 'Lots / corps d’état',
  souhaits: 'Souhaits des propriétaires',
  vigilance: 'Points de vigilance',
  etudes: 'Études complémentaires',
};

export const DEFAULT_PHRASES: Record<PhraseKey, string[]> = {
  vigilance: [
    'Surveiller l’évolution des fissures : poser des témoins et noter toute ouverture nouvelle.',
    'Ne pas engager de travaux de finition (enduits, peintures, isolation) avant d’avoir traité les causes d’humidité.',
    'Faire vérifier la charpente avant tout aménagement des combles.',
    'Contrôler l’état des gouttières et des descentes avant l’hiver.',
    'Ne pas surcharger les planchers anciens (bibliothèque, baignoire, chape) sans vérification.',
    'Avant achat : prévoir dans le budget la reprise de la couverture.',
  ],
  etudes: [
    'Diagnostic structurel détaillé du bâtiment',
    'Étude géotechnique de diagnostic (mission G5)',
    'Diagnostic des bois par un expert (insectes, champignons)',
    'Recherche de fuite sur les réseaux enterrés',
    'Mesures d’humidité des maçonneries sur plusieurs saisons',
    'Sondages destructifs ciblés (têtes de poutres, linteaux, planchers)',
    'Diagnostics réglementaires (amiante, plomb, termites) avant travaux',
  ],
  objetMission: [
    'Comprendre l’origine des désordres d’humidité signalés par les propriétaires avant d’engager des travaux.',
    'Évaluer l’état sanitaire et structurel du bâtiment dans le cadre d’un projet d’acquisition.',
    'Hiérarchiser les travaux de restauration et en estimer le coût.',
    'Donner un avis sur l’évolution de fissures apparues récemment.',
  ],
  personnesPresentes: ['Le propriétaire', 'Les propriétaires', 'Le locataire', 'L’architecte du projet', 'Le notaire', 'L’agent immobilier'],
  conditionsAcces: [
    'Toutes les pièces étaient accessibles.',
    'Combles visités depuis la trappe d’accès, sans circulation sur les entraits.',
    'Couverture observée depuis le sol et depuis les fenêtres de toit uniquement.',
    'Certaines pièces étaient encombrées, limitant l’observation des murs.',
    'Cave accessible, éclairage limité.',
  ],
  meteo: [
    'Temps sec et ensoleillé.',
    'Temps couvert et sec.',
    'Pluie pendant la visite, permettant d’observer le fonctionnement des évacuations d’eau.',
    'Temps sec après plusieurs jours de pluie.',
    'Temps sec après une longue période sèche.',
    'Gel matinal.',
    'Temps humide et brumeux.',
  ],
  limitesVisite: [
    'Fondations non visibles.',
    'Têtes de poutres encastrées dans la maçonnerie non visibles.',
    'Murs doublés intérieurement : structure non observable.',
    'Couverture non accessible : observation à distance.',
    'Réseaux enterrés non inspectés.',
  ],
  datation: [
    'Antérieur au XVIIe siècle (estimation)',
    'XVIIe siècle (estimation)',
    'XVIIIe siècle (estimation)',
    'Fin du XVIIIe – début du XIXe siècle (estimation)',
    'XIXe siècle (estimation)',
    'Fin du XIXe – début du XXe siècle (estimation)',
    'Entre-deux-guerres, 1919 – 1939 (estimation)',
    'Plusieurs époques : corps principal ancien, extensions plus récentes',
  ],
  typologie: [
    'Maison de bourg mitoyenne',
    'Maison rurale isolée',
    'Corps de ferme',
    'Maison de maître',
    'Maison de vigneron',
    'Immeuble de ville',
    'Grange ou bâtiment agricole',
    'Moulin',
    'Manoir ou château',
    'Édifice religieux',
  ],
  systemeConstructif: [
    'Murs porteurs en moellons hourdés à la chaux',
    'Murs porteurs en pierre de taille',
    'Murs en pisé (terre crue)',
    'Pans de bois avec remplissage',
    'Murs en brique pleine',
    'Planchers bois sur solives',
    'Planchers sur voûtains de brique et poutrelles métalliques',
    'Charpente traditionnelle chevillée',
    'Cave voûtée en pierre',
  ],
  materiaux: [
    'Calcaire local, mortier de chaux',
    'Granite, mortier de chaux',
    'Grès, mortier de chaux',
    'Terre crue (pisé)',
    'Couverture en tuile canal',
    'Couverture en tuile plate',
    'Couverture en ardoise',
    'Couverture en lauze',
    'Enduit ciment en soubassement (réparation récente)',
  ],
  abords: [
    'Terrain en pente vers la façade.',
    'Terrain plat, sans pente marquée.',
    'Trottoir en béton contre la façade.',
    'Revêtement en enrobé contre la façade.',
    'Terre végétale au contact du mur.',
    'Descentes d’eau pluviale raccordées à des regards.',
    'Descentes d’eau pluviale rejetant au pied des murs.',
    'Arbres de grand développement à proximité.',
  ],
  geotechnique: [
    'Aucune étude de sol disponible.',
    'Secteur exposé au retrait-gonflement des argiles (aléa à vérifier).',
    'Contexte géologique calcaire, sans indice de mouvement de terrain marqué.',
    'Présence de sources ou de nappe proche signalée par les propriétaires.',
  ],
  zoneNoms: [
    'Abords et gestion des eaux', 'Façade nord', 'Façade sud', 'Façade est', 'Façade ouest', 'Façade sur rue', 'Façade sur cour',
    'Pignon nord', 'Pignon sud', 'Pignon est', 'Pignon ouest', 'Cour',
    'Entrée', 'Séjour', 'Cuisine', 'Salle d’eau', 'Chambre 1', 'Chambre 2', 'Couloir', 'Escalier',
    'Combles et charpente', 'Couverture', 'Cave voûtée', 'Grange', 'Annexe',
  ],
  zoneObservations: [
    'Aucun désordre notable observé.',
    'Traces d’humidité en pied de mur.',
    'Enduit ciment récent.',
    'Bon état général apparent.',
    'Zone partiellement encombrée.',
  ],
  constat: [
    'Les lèvres de la fissure ne présentent pas de désaffleurement.',
    'Aucune trace d’évolution récente n’a été observée.',
    'Le désordre est visible sur toute la hauteur du mur.',
    'Le phénomène est plus marqué côté rue.',
  ],
  analyse: [
    'Hypothèse à vérifier par investigation spécifique.',
    'Le désordre paraît ancien et stabilisé.',
    'Le désordre est probablement aggravé par les apports d’eau observés à proximité.',
    'Plusieurs causes peuvent se combiner.',
  ],
  investigations: [
    'Pose de témoins (jauges type Saugnac) et relevés sur 6 à 12 mois.',
    'Étude géotechnique de type G5.',
    'Mesures d’humidité dans l’épaisseur du mur à plusieurs hauteurs.',
    'Analyse de mortier.',
    'Diagnostic parasitaire des bois par un professionnel certifié.',
    'Sondage local de l’enduit.',
  ],
  preconisation: [
    'Utiliser exclusivement des mortiers de chaux, plus tendres et plus perméables que la pierre.',
    'Laisser sécher la maçonnerie avant toute reprise d’enduit.',
    'Faire réaliser les travaux par une entreprise qualifiée en restauration du bâti ancien.',
  ],
  mesure: [
    'Pose d’étais métalliques sous les poutrelles du plancher, sur bastaings.',
    'Mise en place d’un périmètre de sécurité de 2 mètres avec barrières de chantier.',
    'Purge des pierres instables en tête de mur.',
    'Bâchage provisoire de la couverture.',
    'Pose de fissuromètres et relevés hebdomadaires.',
    'Cerclage de la souche de cheminée par cerces en acier inoxydable.',
  ],
  avisTiers: [
    'Les propriétaires des immeubles mitoyens doivent être informés du risque partagé.',
    'Le périmètre de sécurité empiète sur la voie publique : la mairie doit être prévenue.',
  ],
  bilan: [
    'Le bâtiment ne présente pas de désordre structurel majeur.',
    'L’essentiel des désordres provient de l’eau.',
    'Les désordres observés ne remettent pas en cause la stabilité générale de l’ouvrage.',
    'Certains désordres nécessitent une intervention rapide.',
  ],
  conclusion: [
    'Stopper les apports d’eau, puis rendre aux murs leur capacité à sécher, avant tout aménagement intérieur.',
    'Une période de séchage de plusieurs mois est à prévoir avant les enduits intérieurs.',
    'Une étude complémentaire est nécessaire avant toute décision sur les reprises structurelles.',
  ],
  elements: [
    'Mur', 'Pierre', 'Joint', 'Enduit', 'Soubassement', 'Linteau', 'Appui / seuil', 'Plancher', 'Poutre',
    'Charpente', 'Couverture', 'Souche de cheminée', 'Gouttière / descente', 'Voûte', 'Escalier', 'Abords',
  ],
  lots: [
    'Couverture – zinguerie', 'Maçonnerie – pierre de taille', 'Enduits et rejointoiement à la chaux',
    'Charpente – menuiserie bois', 'Traitement des bois', 'Voirie et réseaux – drainage', 'Étaiement – sécurisation',
    'Ventilation', 'Isolation biosourcée', 'Finitions intérieures', 'Études et investigations',
  ],
  souhaits: [
    'Supprimer l’humidité au rez-de-chaussée',
    'Améliorer le confort thermique',
    'Aménager les combles',
    'Aménager la cave',
    'Conserver le caractère patrimonial',
    'Réaliser les travaux par étapes',
  ],
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const FUSION_ID = 'fusion-doublons-2026-11';
/**
 * Rangement commun : corps d'état convertis en métiers (désordres, préconisations, prix, liste des lots)
 * et, une seule fois, fusion des doublons de la bibliothèque livrée.
 */
function ranger(l: Library, fusion: boolean): Library {
  let r: Library = {
    ...l,
    desordres: l.desordres.map((t) => metiersDe(t, `${t.type} ${t.preconisation}`)),
    preconisations: l.preconisations.map((p) => metiersDe(p, `${p.titre} ${p.texte}`)),
    prix: l.prix.map((p) => ({ ...p, lot: metiersDe({ lot: p.lot }, p.libelle).lot })),
    phrases: { ...l.phrases, lots: Array.from(new Set([...METIERS, ...(l.phrases.lots ?? []).filter((x) => !estAncienLot(x))])) },
  };
  if (fusion) {
    for (const [g, a] of FUSIONS_DESORDRES) r = fusionnerDesordres(r, g, a);
    for (const [g, a] of FUSIONS_PRECOS) r = fusionnerPrecos(r, g, a);
  }
  return r;
}

export function defaultLibrary(): Library {
  return ranger({
    version: 1,
    phrases: clone({ ...DEFAULT_PHRASES, elements: [...DEFAULT_PHRASES.elements, ...ELEMENTS_PLUS, ...ELEMENTS_PLUS_B, ...ELEMENTS_PLUS_C], lots: [...DEFAULT_PHRASES.lots, ...LOTS_PLUS, ...LOTS_PLUS_B, ...LOTS_PLUS_C] }),
    desordres: clone([...TEMPLATES, ...TEMPLATES_PLUS, ...TEMPLATES_PLUS_B, ...TEMPLATES_PLUS_C]),
    prix: clone(DEFAULT_PRIX),
    prestations: clone(DEFAULT_PRESTATIONS),
    options: clone(DEFAULT_OPTIONS),
    entreprise: clone(DEFAULT_ENTREPRISE),
    employes: clone(DEFAULT_EMPLOYES),
    agenda: [],
    preconisations: clone([...PRECONISATIONS, ...PRECOS_PLUS, ...PRECOS_PLUS_B, ...PRECOS_PLUS_C]),
    guides: clone([...GUIDES, ...GUIDES_PLUS, ...GUIDES_PLUS_B]),
    contacts: [],
    mails: clone(DEFAULT_MAILS),
    taches: [],
    rappelsFaits: [],
    pistes: [],
    developpement: clone(DEV_VIDE),
    realisations: [],
    favoris: [],
    usage: {},
    lotsLivres: [...LOTS_ENRICHISSEMENT.map((l) => l.id), FUSION_ID],
  }, true);
}

/** Complète une bibliothèque enregistrée avec les listes ajoutées depuis. */
export function normalizeLibrary(raw: Partial<Library> | null | undefined): Library {
  const base = defaultLibrary();
  if (!raw) return base;
  /** Ajoute les éléments livrés depuis (par identifiant) sans toucher à ceux de l'utilisateur. */
  const merge = <T extends { id: string }>(mine: T[] | undefined, defaults: T[]): T[] => {
    if (!mine?.length) return defaults;
    const ids = new Set(mine.map((x) => x.id));
    return [...mine, ...defaults.filter((x) => !ids.has(x.id))];
  };
  const prestations = merge(raw.prestations?.map((p) => {
    const def = base.prestations.find((x) => x.id === p.id);
    const fixed = { ...p, type: p.type ?? def?.type ?? 'conseil' } as typeof p;
    // Ancien libellé par défaut de l'accompagnement : remplacé par la nouvelle offre
    return p.id === 'accompagnement' && p.libelle === 'Accompagnement' && def ? { ...fixed, libelle: def.libelle, detail: def.detail } : fixed;
  }), base.prestations);
  // Enrichissements livrés une seule fois : nouveaux désordres types et éléments, sans toucher aux existants
  const livres = raw.lotsLivres ?? [];
  const aLivrer = LOTS_ENRICHISSEMENT.filter((l) => !livres.includes(l.id));
  let desordres = raw.desordres?.length ? raw.desordres : base.desordres;
  const phrases = { ...base.phrases, ...(raw.phrases ?? {}) };
  if (raw.desordres?.length) {
    for (const l of aLivrer) desordres = [...desordres, ...l.templates.filter((t) => !desordres.some((x) => [x.type, ...(x.alias ?? [])].some((n) => n.toLowerCase() === t.type.toLowerCase()))).map(clone)];
  }
  if (raw.phrases) {
    for (const l of aLivrer) {
      phrases.elements = [...phrases.elements, ...l.elements.filter((e) => !phrases.elements.includes(e))];
      phrases.lots = [...phrases.lots, ...l.lots.filter((e) => !phrases.lots.includes(e))];
    }
  }
  const fusion = !livres.includes(FUSION_ID);
  return ranger({
    version: 1,
    lotsLivres: [...livres, ...aLivrer.map((l) => l.id), ...(fusion ? [FUSION_ID] : [])],
    phrases,
    desordres,
    prix: raw.prix?.length ? raw.prix : base.prix,
    prestations,
    options: merge(raw.options, base.options),
    entreprise: { ...base.entreprise, ...(raw.entreprise ?? {}) },
    employes: raw.employes?.length ? raw.employes : base.employes,
    agenda: raw.agenda ?? [],
    preconisations: merge(raw.preconisations, base.preconisations),
    guides: merge(raw.guides, base.guides),
    contacts: raw.contacts ?? [],
    mails: merge(raw.mails, base.mails),
    taches: raw.taches ?? [],
    rappelsFaits: raw.rappelsFaits ?? [],
    pistes: raw.pistes ?? [],
    developpement: { ...base.developpement, ...(raw.developpement ?? {}) },
    realisations: raw.realisations ?? [],
    favoris: raw.favoris ?? [],
    usage: raw.usage ?? {},
  }, fusion);
}
