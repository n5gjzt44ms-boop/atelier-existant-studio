import { DEFAULT_EMPLOYES } from './business';
import { DEFAULT_MISSION, DEFAULT_PHASE } from './constants';
import type { DeliverableType, Desordre, Dossier, PhasePlanning, Priority } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Numéro de dossier DIA-AAAA-### : incrément annuel sur les dossiers existants. */
export function nextNumero(existing: Dossier[], date = new Date()): string {
  const year = date.getFullYear();
  const prefix = `DIA-${year}-`;
  const max = existing
    .map((d) => d.numero)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(max + 1).padStart(3, '0');
}

export function nextDesordreNumero(list: Desordre[]): string {
  const max = list.map((d) => parseInt(d.numero.replace(/\D/g, ''), 10) || 0).reduce((a, b) => Math.max(a, b), 0);
  return 'D-' + String(max + 1).padStart(3, '0');
}

export const DEFAULT_PLANNING: PhasePlanning[] = [
  { phase: 1, debut: 1, duree: 3 },
  { phase: 2, debut: 3, duree: 4 },
  { phase: 3, debut: 7, duree: 12 },
  { phase: 4, debut: 19, duree: 6 },
  { phase: 5, debut: 25, duree: 5 },
  { phase: 6, debut: 30, duree: 8 },
];


export function newDesordre(list: Desordre[], zoneCode = '', priorite: Priority = 'P2'): Desordre {
  return {
    id: uid(),
    numero: nextDesordreNumero(list),
    zoneCode,
    element: 'Mur',
    type: 'Fissure verticale',
    priorite,
    phase: DEFAULT_PHASE[priorite],
    photoEnsemble: null,
    photoDetail: null,
    constat: '',
    analyse: '',
    confiance: 'moyen',
    aVerifier: false,
    investigations: '',
    preconisation: '',
    lot: '',
    chiffrage: { quantite: null, unite: 'forfait', bas: null, haut: null },
  };
}

export function newDossier(type: DeliverableType, existing: Dossier[]): Dossier {
  const now = new Date().toISOString();
  return {
    id: uid(),
    numero: nextNumero(existing),
    type,
    status: 'brouillon',
    version: '0',
    createdAt: now,
    updatedAt: now,
    meta: {
      titreMission: DEFAULT_MISSION[type].titre,
      client: { nom: '', qualite: 'Propriétaire', adresse: '', email: '', telephone: '' },
      bien: { adresse: '', codePostal: '', commune: '', cadastre: '', plu: '', gps: '' },
      dateVisite: '', // renseignée par la date réelle des photos ou à la main
      dateRapport: now.slice(0, 10),
      intervenant: DEFAULT_EMPLOYES[0]?.nom ?? '',
      personnesPresentes: '',
      conditionsAcces: '',
      meteo: '',
      limitesVisite: '',
      objetMission: DEFAULT_MISSION[type].objet,
      photoCouverture: null,
    },
    contexte: {
      datation: '', typologie: '', systemeConstructif: '', materiaux: '',
      historique: '', abords: '', geotechnique: '', vues: [],
    },
    souhaits: [],
    zones: [], // définies par l'expert pour chaque projet (étape Zones)
    visites: [],
    desordres: [],
    mesures: [],
    avisTiers: '',
    conclusion: { bilan: '', conclusion: '' },
    planning: DEFAULT_PLANNING.map((p) => ({ ...p })),
    annuaire: [],
    finances: { aleasPct: 10, tvaPct: 10 },
    commercial: { devis: [], factures: [] },
    consultation: { lots: [], offres: [], analyse: '' },
  };
}

/* ───────────── Dossier d'exemple (fictif) pour la démonstration ───────────── */

function d(
  n: number, zoneCode: string, element: string, type: string, priorite: Priority,
  constat: string, analyse: string, preconisation: string, lot: string,
  q: number | null, unite: string, bas: number, haut: number,
  extra: Partial<Desordre> = {},
): Desordre {
  return {
    id: uid(), numero: 'D-' + String(n).padStart(3, '0'), zoneCode, element, type, priorite,
    phase: DEFAULT_PHASE[priorite], photoEnsemble: null, photoDetail: null,
    constat, analyse, confiance: 'moyen', aVerifier: false, investigations: '', preconisation, lot,
    chiffrage: { quantite: q, unite, bas, haut }, ...extra,
  };
}

export function sampleDossier(): Dossier {
  const base = newDossier('conseil', []);
  return {
    ...base,
    numero: 'DIA-2026-014',
    status: 'revision',
    version: '1',
    meta: {
      ...base.meta,
      titreMission: 'Diagnostic et conseil',
      client: { nom: 'M. et Mme Delmas', qualite: 'Propriétaires', adresse: '', email: '', telephone: '' },
      bien: {
        adresse: '14 rue des Tanneurs', codePostal: '82140', commune: 'Saint-Antonin-Noble-Val',
        cadastre: 'Section AB n° 212', plu: 'Zone UA — périmètre AVAP', gps: '',
      },
      dateVisite: '2026-10-22',
      dateRapport: '2026-11-05',
      intervenant: 'Atelier de l’Existant — diagnostiqueur bâti ancien',
      personnesPresentes: 'Mme Delmas',
      conditionsAcces: 'Toutes pièces accessibles. Combles visités depuis la trappe, sans circulation sur les entraits.',
      meteo: 'Temps sec, 14 °C, après une semaine pluvieuse',
      limitesVisite: 'Couverture observée depuis la rue et la lucarne uniquement. Fondations non visibles.',
      objetMission:
        'Comprendre l’origine des désordres d’humidité et des fissures signalés par les propriétaires avant un projet de rénovation, et hiérarchiser les travaux.',
    },
    contexte: {
      ...base.contexte,
      datation: 'Fin XVIIIe – début XIXe siècle (estimation)',
      typologie: 'Maison de bourg mitoyenne, R+1+combles, cave semi-enterrée',
      systemeConstructif: 'Murs porteurs en moellons calcaires hourdés à la chaux, ép. 55–60 cm ; planchers bois sur solives ; charpente chevillée',
      materiaux: 'Calcaire local, mortier de chaux, enduit ciment en soubassement (années 1970), tuile canal',
      historique: 'Enduit ciment posé en soubassement et trottoir béton coulé contre la façade (déclaration des propriétaires). Menuiseries PVC étanches posées en 2012.',
      abords: 'Rue en légère pente vers la façade. Trottoir béton étanche en pied de façade. Descente EP raccordée à un regard non visitable.',
      geotechnique: 'Pas d’étude disponible. Contexte géologique calcaire, sans indice de retrait-gonflement marqué.',
    },
    souhaits: [
      { id: uid(), rubrique: 'Usage', besoin: 'Aménager la cave en cellier sain', importance: 'souhaite' },
      { id: uid(), rubrique: 'Confort', besoin: 'Supprimer l’odeur d’humidité au rez-de-chaussée', importance: 'essentiel' },
      { id: uid(), rubrique: 'Budget', besoin: 'Enveloppe de 60 000 à 80 000 € toutes taxes comprises sur deux ans', importance: 'essentiel' },
      { id: uid(), rubrique: 'Planning', besoin: 'Travaux lourds avant l’été 2027', importance: 'souhaite' },
    ],
    zones: [
      { code: 'EXT-01', nom: 'Rue et trottoir', categorie: 'EXT', observations: 'Trottoir béton jointif à la façade, pente vers le mur.' },
      { code: 'FAC-01', nom: 'Façade sur rue', categorie: 'FAC', observations: 'Moellons enduits ; soubassement ciment sur 1,10 m.' },
      { code: 'RDC-01', nom: 'Séjour', categorie: 'RDC', observations: 'Salpêtre en pied de mur côté rue.' },
      { code: 'ETG-01', nom: 'Chambre sur rue', categorie: 'ETG', observations: 'Fissure au-dessus de la fenêtre.' },
      { code: 'COM-01', nom: 'Combles et charpente', categorie: 'COM', observations: 'Charpente chevillée, traces d’infiltration près de la souche.' },
      { code: 'CAV-01', nom: 'Cave voûtée', categorie: 'CAV', observations: 'Soupirail obstrué, odeur de confinement.' },
    ],
    desordres: [
      d(1, 'COM-01', 'Souche de cheminée', 'Infiltration', 'P1',
        'Coulures brunes et bois humide au contact de la souche sur environ 1 m². Solin mortier fissuré visible depuis la lucarne.',
        'Rupture d’étanchéité probable du solin de souche, infiltration active par temps de pluie.',
        'Réfection du solin au plomb ou zinc, révision de la couverture autour de la souche, contrôle de l’humidité du chevron après séchage.',
        'Couverture – zinguerie', 1, 'forfait', 900, 1600),
      d(2, 'EXT-01', 'Gouttière / descente', 'Infiltration', 'P1',
        'Descente EP désolidarisée à 2 m du sol ; projection d’eau sur la façade, mousses et enduit dégradé sous ce point.',
        'Apport d’eau concentré en pied de mur aggravant l’humidité du soubassement.',
        'Refixer et raccorder la descente, vérifier le regard et l’évacuation vers le réseau.',
        'Couverture – zinguerie', 1, 'forfait', 250, 500),
      d(3, 'FAC-01', 'Soubassement', 'Joints ciment bloquants', 'P2',
        'Enduit ciment sur 1,10 m de hauteur, soufflé et fissuré par plaques ; moellons pulvérulents au droit des décollements.',
        'L’enduit ciment imperméable piège l’eau dans le mur ; l’humidité migre plus haut et dégrade la pierre (effet de blocage).',
        'Dépose de l’enduit ciment, temps de séchage, enduit chaux aérienne CL90 respirant en trois couches.',
        'Enduits et rejointoiement à la chaux', 14, 'm²', 1700, 2600),
      d(4, 'EXT-01', 'Abords', 'Remontées capillaires', 'P2',
        'Trottoir béton coulé contre la façade sur toute la longueur (8 ml), pente vers le mur.',
        'Le trottoir étanche renvoie l’eau vers le pied de mur et empêche l’évaporation : contribue aux remontées capillaires observées en RDC-01.',
        'Dépose du trottoir béton, drain périphérique respirant avec casquette de galets, pavage jointoyé chaux/sable.',
        'Voirie et réseaux – drainage', 8, 'mètre linéaire', 2400, 4200),
      d(5, 'RDC-01', 'Mur', 'Efflorescences / sels', 'P2',
        'Frange d’humidité continue jusqu’à 0,90 m, efflorescences blanches, peinture écaillée sur le mur côté rue.',
        'Remontées capillaires associées au blocage par l’enduit ciment extérieur et le trottoir. Hypothèse à vérifier par investigation spécifique (mesures d’humidité dans l’épaisseur).',
        'Après traitement des causes (D-003, D-004) : dépose des revêtements, dessalement par compresses, enduit chaux-chanvre intérieur.',
        'Enduits et rejointoiement à la chaux', 18, 'm²', 1800, 3000, { aVerifier: true, investigations: 'Mesures d’humidité par carottage ou bombe à carbure à 3 hauteurs.' }),
      d(6, 'ETG-01', 'Linteau', 'Affaissement de linteau', 'P2',
        'Fissure en arc au-dessus de la baie, ouverture ~1 mm ; linteau bois visible sous l’enduit avec flèche apparente.',
        'Fléchissement ou pourrissement probable du linteau bois. Hypothèse à vérifier par investigation spécifique (sondage local de l’enduit).',
        'Sondage, puis remplacement du linteau par linteau chêne ou pierre, reprise en relancis à la chaux.',
        'Maçonnerie – pierre de taille', 1, 'unité', 1200, 2200, { aVerifier: true, confiance: 'faible', investigations: 'Sondage de l’enduit au droit du linteau.' }),
      d(7, 'CAV-01', 'Voûte', 'Condensation / confinement', 'P2',
        'Soupirail obstrué par un panneau bois ; moisissures en voûte, odeur de confinement.',
        'Défaut de ventilation naturelle : condensation et confinement.',
        'Rouvrir le soupirail avec grille, créer une ventilation traversante.',
        'Ventilation', 1, 'forfait', 300, 700),
      d(8, 'COM-01', 'Charpente', 'Attaque xylophage', 'P3',
        'Trous d’envol anciens sur deux chevrons en rive, sans vermoulure fraîche observée.',
        'Attaque ancienne, apparemment inactive. Niveau de confiance faible sans contrôle spécialisé.',
        'Diagnostic xylophages par un professionnel certifié ; traitement préventif si activité confirmée.',
        'Traitement des bois', 1, 'forfait', 600, 1400, { confiance: 'faible', investigations: 'Diagnostic parasitaire des bois.' }),
      d(9, 'RDC-01', 'Mur', 'Fissure verticale', 'P3',
        'Fissure fine (< 0,2 mm) à la jonction mur de refend / façade, sans désaffleurement.',
        'Fissure de retrait ou micro-mouvement ancien, apparemment stabilisé.',
        'Pose de témoins (jauge Saugnac) et relevé à 6 mois avant toute reprise.',
        'Études et investigations', 2, 'unité', 150, 300),
    ],
    annuaire: [
      { id: uid(), lot: 'Couverture – zinguerie', nom: 'À compléter', ville: '', contact: '' },
      { id: uid(), lot: 'Enduits et rejointoiement à la chaux', nom: 'À compléter', ville: '', contact: '' },
    ],
    conclusion: {
      bilan: 'Le bâtiment ne présente pas de désordre structurel majeur. L’essentiel des désordres provient de l’eau : infiltrations en toiture et en pied de façade, et blocage de l’humidité par des matériaux étanches posés au XXe siècle.',
      conclusion: 'Stopper d’abord les apports d’eau, puis rendre aux murs leur capacité à sécher, avant tout aménagement intérieur. Une période de séchage de plusieurs mois est à prévoir avant les enduits intérieurs.',
    },
  };
}

/* ───────────── Modèles de désordres ───────────── */
import type { DesordreTemplate } from './templates';

/** Pré-remplit une fiche à partir d'un désordre type (texte marqué « à relire »). */
/** Corps d'état d'une fiche, d'une préconisation ou d'un modèle (liste « lots », ou à défaut le « lot » unique). */
export function lotsDe(x: { lot?: string; lots?: string[] }): string[] {
  const l = (x.lots ?? []).filter((v) => v.trim());
  return l.length ? l : x.lot?.trim() ? [x.lot.trim()] : [];
}
/** Met à jour la liste des corps d'état en gardant « lot » = le premier (chiffrage, tableaux par lot). */
export const avecLots = <T extends { lot: string; lots?: string[] }>(x: T, lots: string[]): T => ({ ...x, lots, lot: lots[0] ?? '' });

export function applyTemplate(d: Desordre, t: DesordreTemplate): Desordre {
  return {
    ...d,
    type: t.type,
    famille: t.famille,
    element: t.element,
    priorite: t.priorite,
    phase: DEFAULT_PHASE[t.priorite],
    lot: t.lot,
    lots: lotsDe(t),
    constat: t.constat,
    analyse: t.analyse,
    investigations: t.investigations,
    preconisation: t.preconisation,
    aVerifier: t.analyse.includes('Hypothèse à vérifier'),
    confiance: 'moyen',
    chiffrage: { ...d.chiffrage, unite: t.unite },
    aRelire: true,
  };
}

/** Ajoute une première ligne de chiffrage à partir d'un ouvrage de la bibliothèque de prix. */
import { estimatePrix, type PrixItem } from './business';
export function withPrix(d: Desordre, p: PrixItem | undefined, quantite = 1): Desordre {
  if (!p) return d;
  const e = estimatePrix(p);
  const ligne = { id: uid(), prixId: p.id, libelle: p.libelle, quantite, unite: p.unite, puBas: e.bas, puHaut: e.haut };
  return { ...d, chiffrage: { ...d.chiffrage, lignes: [ligne], quantite, unite: p.unite, bas: Math.round(e.bas * quantite), haut: Math.round(e.haut * quantite) } };
}
