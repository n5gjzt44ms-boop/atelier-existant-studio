/**
 * Schéma de données unifié d'un dossier de diagnostic — L'Atelier de l'Existant.
 * Un seul objet `Dossier` contient l'intégralité d'une affaire, quel que soit
 * le type de livrable. Les sections non pertinentes pour un type restent vides
 * et ne sont simplement pas rendues par `ReportPreview`.
 * Version JSON Schema équivalente : lib/dossier.schema.json
 */

/** Offre de L'Atelier de l'Existant : 01 Avis sanitaire · 02 Diagnostic structurel · 03 Diagnostic et conseil · 04 Accompagnement */
export type DeliverableType = 'avis' | 'diagnostic' | 'conseil' | 'accompagnement';
export type Status = 'brouillon' | 'revision' | 'finalise' | 'envoye';
export type Priority = 'P1' | 'P2' | 'P3';
export type Confidence = 'faible' | 'moyen' | 'eleve';

/** Phases de la logique chronologique des travaux (référentiel §6.2) */
export type Phase = 1 | 2 | 3 | 4 | 5 | 6;

export type ZoneCategory = 'EXT' | 'FAC' | 'PC' | 'RDC' | 'ETG' | 'COM' | 'CAV';

export interface Photo {
  id?: string;
  /** Image affichable : data URL (avant envoi) ou lien signé temporaire (Supabase) */
  src: string;
  /** Chemin dans le bucket Supabase « photos » une fois envoyée (src est alors vidé en base) */
  path?: string;
  legende?: string;
  nom?: string; // nom de fichier (documents du classeur)
  categorie?: string; // plan, cadastre, plan ancien, acte, devis d'entreprise…
  mime?: string; // type de fichier si ce n'est pas une image (application/pdf)
  date?: string; // date d'ajout
  visiteId?: string; // visite au cours de laquelle la photo a été prise
  prise?: number; // heure de prise de vue (horodatage)
}

export interface Visite {
  id: string;
  date: string; // AAAA-MM-JJ
  libelle: string; // ex. « Visite initiale »
}

export interface Zone {
  code: string; // ex. EXT-01, RDC-02 — nomenclature conservée dans tout le rapport
  nom: string;
  categorie: ZoneCategory;
  observations: string; // constat général de la zone
  photos?: Photo[]; // vues générales de la zone (reportage photographique)
}

/** Ligne de chiffrage reliée à un ouvrage de la bibliothèque de prix. */
export interface LigneChiffrage {
  id: string;
  prixId?: string;
  libelle: string;
  quantite: number;
  unite: string;
  puBas: number; // prix unitaire hors taxes
  puHaut: number;
}

export interface Chiffrage {
  lignes?: LigneChiffrage[]; // si présentes, bas / haut sont calculés à partir des lignes
  quantite: number | null;
  unite: string; // m², ml, u, forfait…
  bas: number | null; // fourchette basse HT (montant total)
  haut: number | null; // fourchette haute HT
}

export interface Desordre {
  id: string;
  numero: string; // D-001
  zoneCode: string;
  element: string; // Mur, pierre, enduit, plancher, linteau…
  type: string; // Fissure, remontée capillaire… (cf. bibliothèque)
  famille?: string; // famille du désordre type (Eau & humidité, Fissures & structure…)
  priorite: Priority;
  phase: Phase;
  photoEnsemble: Photo | null; // Photo 1 — vue d'ensemble
  photoDetail: Photo | null; // Photo 2 — zoom / détail
  autresPhotos?: Photo[]; // photos complémentaires (import de visite)
  aRelire?: boolean; // texte pré-rédigé par modèle, pas encore relu
  lots?: string[]; // corps d'état concernés (le premier = « lot », utilisé pour le chiffrage)
  general?: boolean; // désordre général (tout le bâtiment), légitime sans photo
  independante?: boolean; // ne pas synchroniser avec les autres fiches du même désordre
  perso?: string[]; // champs rédigés à la main dans cette fiche (ne sont plus remplacés par la synchronisation)
  constat: string; // CONST
  analyse: string; // HYP
  confiance: Confidence;
  aVerifier: boolean; // « hypothèse à vérifier par investigation spécifique »
  aVerifierPrecision?: string; // ce qui reste à vérifier (ex. la nature du liant : ciment ou chaux)
  investigations: string;
  preconisation: string; // ACT
  solutions?: Solution[]; // Diagnostic structurel : plusieurs solutions proposées par désordre
  lot: string; // corps d'état
  chiffrage: Chiffrage;
}

/** Solution envisageable pour un désordre (Diagnostic structurel). */
export interface Solution {
  id: string;
  titre: string;
  texte: string;
  recommandee?: boolean;
}

/** Point de vigilance (Avis sanitaire). */
export interface PointVigilance { id: string; localisation: string; texte: string }
/** Étude complémentaire à mener (Avis sanitaire). */
export interface EtudeComplementaire { id: string; nature: string; objet: string; intervenant: string }

/** Plan de repérage des zones : image + repères placés à la main (positions en %). */
export interface PlanZones {
  id: string; titre: string; image: Photo | null; reperes: { code: string; x: number; y: number }[];
  /** Schéma dessiné (vue de dessus) : rectangles de couleur, positions et tailles en % du cadre */
  formes?: { id: string; code: string; x: number; y: number; w: number; h: number; couleur: string }[];
}

/** Échange avec le client (mail envoyé ou reçu), rangé dans le classeur du dossier. */
export interface Echange { id: string; date: string; sens: 'envoye' | 'recu' | 'appel' | 'note'; objet: string; texte: string }

/** Version d'un livrable envoyée au client, archivée dans le classeur. */
export interface VersionLivrable { id: string; date: string; titre: string; revision: string; snapshot: string }

/** Questionnaire préalable au devis : sert à ajuster le prix de la mission. */
export interface Questionnaire {
  besoin: string; // achat, travaux, sinistre, entretien…
  typeBatiment: 'maison' | 'grande-maison' | 'immeuble' | 'grand-edifice' | 'annexe';
  surface: number | null; // m² de plancher
  niveaux: number | null;
  etat: 'bon' | 'moyen' | 'degrade' | 'ruine';
  desordres: 'peu' | 'plusieurs' | 'nombreux';
  etendue: 'complet' | 'partiel' | 'zone';
  zonesConcernees: string;
  acces: 'facile' | 'moyen' | 'difficile';
  distanceKm: number | null;
  urgence: boolean;
  documents: string; // plans, anciens diagnostics, photos…
  notes: string;
}

export type MesureCategorie =
  | 'tirant'
  | 'etaiement'
  | 'purge'
  | 'perimetre'
  | 'bachage'
  | 'instrumentation';

/** Mesure conservatoire — rapport MSU et avis visuel */
export interface MesureSecurite {
  id: string;
  categorie: MesureCategorie;
  localisation: string;
  description: string;
  delai: string; // ex. « Sous 48 h »
}

export interface Souhait {
  id: string;
  rubrique: string; // confort, usage, budget, planning…
  besoin: string;
  importance: 'essentiel' | 'souhaite' | 'optionnel';
}

export interface Entreprise {
  id: string;
  lot: string;
  nom: string;
  ville: string;
  contact: string;
}

/* ───────────── Gestion commerciale ───────────── */

export interface LigneCommerciale {
  id: string;
  libelle: string;
  quantite: number;
  unite: string;
  puHT: number;
}

export type StatutDevis = 'brouillon' | 'envoye' | 'accepte' | 'refuse';
export interface Devis {
  id: string;
  numero: string; // DEV-AAAA-###
  date: string;
  validiteJours: number;
  lignes: LigneCommerciale[];
  statut: StatutDevis;
  acomptePct: number;
  notes: string;
}

export type StatutFacture = 'brouillon' | 'emise' | 'payee';
export interface Facture {
  id: string;
  numero: string; // FAC-AAAA-### attribué à l'émission (numérotation continue)
  date: string;
  echeance: string;
  nature: 'acompte' | 'solde' | 'totale';
  devisId?: string;
  lignes: LigneCommerciale[];
  statut: StatutFacture;
  datePaiement?: string;
  modePaiement?: string;
}

export interface Commercial {
  questionnaire?: Questionnaire;
  devis: Devis[];
  factures: Facture[];
  dateRendu?: string; // date butoir de remise du rapport
  notes?: string;
}

/* ───────────── Accompagnement (04) : consultation des entreprises ───────────── */

export interface LotConsultation {
  id: string;
  lot: string;
  description: string;
  estimationBas: number | null;
  estimationHaut: number | null;
}

export interface OffreEntreprise {
  id: string;
  lotId: string;
  entreprise: string;
  dateDevis: string;
  montantHT: number | null;
  delai: string;
  exclusions: string;
  observations: string;
  retenue: boolean;
  prixId?: string; // ouvrage de la bibliothèque de prix (pour apprendre des devis)
  quantite?: number | null;
}

export interface Consultation {
  lots: LotConsultation[];
  offres: OffreEntreprise[];
  analyse: string;
}

export interface PhasePlanning {
  phase: Phase;
  debut: number; // semaine de début (1 = démarrage)
  duree: number; // en semaines
}

export interface Dossier {
  id: string;
  numero: string; // DIA-AAAA-###
  type: DeliverableType;
  status: Status;
  version: string; // indice de révision
  createdAt: string;
  updatedAt: string;

  meta: {
    titreMission: string;
    client: { nom: string; qualite: string; adresse: string; email: string; telephone: string; type?: 'particulier' | 'professionnel' };
    bien: { adresse: string; codePostal: string; commune: string; cadastre: string; plu: string; gps: string };
    dateVisite: string;
    dateRapport: string;
    intervenant: string;
    personnesPresentes: string;
    conditionsAcces: string;
    meteo: string;
    limitesVisite: string; // parties non visitées / non accessibles
    objetMission: string;
    photoCouverture: Photo | null;
    perimetre?: { etendue: 'complet' | 'partiel' | 'zone'; detail: string }; // tout le bâtiment ou une partie
    dateRapportFixe?: boolean; // date saisie à la main : ne plus la mettre à jour automatiquement
  };

  contexte: {
    datation: string;
    typologie: string;
    systemeConstructif: string;
    materiaux: string;
    historique: string;
    abords: string; // relief, terrain, eaux pluviales (§8 du sommaire)
    risques?: string; // synthèse Géorisques
    geotechnique: string;
    vues: Photo[]; // vues parcellaires, cartes anciennes
  };

  souhaits: Souhait[];
  visites?: Visite[];
  zones: Zone[];
  desordres: Desordre[];
  mesures: MesureSecurite[];
  avisTiers: string;

  conclusion: {
    bilan: string; // bilan structurel / avis synthétique
    conclusion: string;
  };

  planning: PhasePlanning[];
  annuaire: Entreprise[];
  commercial?: Commercial;
  consultation?: Consultation;
  archive?: boolean; // dossier archivé (les dossiers facturés ne sont jamais supprimés)
  prospect?: boolean; // devis en préparation : pas encore de mission (la validation du devis crée le dossier)
  affaireId?: string; // regroupe les missions successives d'un même bien (avis puis diagnostic…)
  vigilance?: PointVigilance[];
  etudes?: EtudeComplementaire[];
  plansZones?: PlanZones[];
  guides?: string[]; // guides de bonnes pratiques joints au rapport
  photosAClasser?: Photo[]; // bac des photos importées pas encore rangées dans une zone ou une fiche
  classeur?: { echanges: Echange[]; documents: Photo[]; versions?: VersionLivrable[] };
  dates?: { finalise?: string; envoye?: string }; // passages au statut finalisé / envoyé (agenda et rappels)

  finances: {
    aleasPct: number; // provision pour aléas (%)
    tvaPct: number; // 10 % travaux de rénovation logement > 2 ans, 20 % sinon
  };
}
