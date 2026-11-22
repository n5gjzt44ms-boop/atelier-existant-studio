import type { DeliverableType, Questionnaire } from './types';

/* ───────────── Entreprise & équipe ───────────── */

export interface EntrepriseInfo {
  nom: string;
  forme: string; // ex. Entreprise individuelle, SARL…
  siret: string;
  adresse: string;
  codePostal: string;
  ville: string;
  email: string;
  telephone: string;
  regimeTva: 'franchise' | 'assujetti';
  tauxTva: number; // si assujetti
  numeroTva: string;
  iban: string;
  bic: string;
  delaiPaiementJours: number;
  rayonKm: number; // rayon d'intervention inclus
  mentionsDevis: string;
  presentation: string; // présentation de l'entreprise (propositions commerciales, plaquette)
  approche: string; // notre approche / valeurs
  siteWeb: string;
  assureur: string; // responsabilité civile professionnelle
  policeAssurance: string;
  mediateur: string; // médiateur de la consommation (obligatoire avec des clients particuliers)
}

export interface Employe { id: string; nom: string; fonction: string; email: string }

export const DEFAULT_ENTREPRISE: EntrepriseInfo = {
  nom: "L'Atelier de l'Existant",
  forme: '',
  siret: '',
  adresse: '',
  codePostal: '',
  ville: '',
  email: '',
  telephone: '',
  regimeTva: 'franchise',
  tauxTva: 20,
  numeroTva: '',
  iban: '',
  bic: '',
  delaiPaiementJours: 30,
  rayonKm: 40,
  mentionsDevis: 'Les estimations de travaux figurant dans les rapports sont des ordres de grandeur indicatifs et ne valent pas devis d’entreprises.',
  presentation: 'L’Atelier de l’Existant accompagne les propriétaires de bâtiments anciens — maisons de bourg, fermes, demeures, petits patrimoines — pour comprendre leur bâti avant de le transformer. Nous observons, nous recherchons les causes des désordres et nous proposons des solutions compatibles avec les matériaux traditionnels : pierre, chaux, terre et bois.',
  approche: 'Observer avant d’agir. Traiter les causes plutôt que les symptômes. Respecter le fonctionnement du bâti ancien, qui doit respirer. Hiérarchiser pour que chaque euro investi protège durablement le bâtiment.',
  siteWeb: '',
  assureur: '',
  policeAssurance: '',
  mediateur: '',
};

export const DEFAULT_EMPLOYES: Employe[] = [
  { id: 'lorine', nom: 'Lorine Gratadour', fonction: 'Diagnostiqueuse du bâti ancien', email: '' },
];

/* ───────────── Offre commerciale (référentiel §3) ───────────── */

export interface Prestation {
  id: string;
  type: DeliverableType; // livrable produit (titre de la mission)
  libelle: string;
  detail: string;
  prixBas: number;
  prixHaut: number;
  prixConseille: number;
  unite: string;
}

export interface OptionCommerciale {
  id: string;
  libelle: string;
  detail: string;
  unite: string;
  prixBas: number;
  prixHaut: number;
  prixConseille: number;
}

export const DEFAULT_PRESTATIONS: Prestation[] = [
  { id: 'avis', type: 'avis', libelle: 'Avis sanitaire', detail: 'Visite visuelle sur site, relevé de l’ensemble des désordres visibles, avis général sur l’état du bâtiment, points de vigilance et études complémentaires à mener. Compte rendu synthétique.', prixBas: 350, prixHaut: 650, prixConseille: 500, unite: 'forfait' },
  { id: 'diagnostic', type: 'diagnostic', libelle: 'Diagnostic structurel', detail: 'Inspection approfondie des maçonneries, charpentes, planchers et ouvertures ; recherche des causes ; fiches désordres localisées et hiérarchisées ; plusieurs solutions proposées pour chaque désordre.', prixBas: 900, prixHaut: 1600, prixConseille: 1250, unite: 'forfait' },
  { id: 'conseil', type: 'conseil', libelle: 'Diagnostic et conseil', detail: 'Diagnostic structurel complet, feuille de route des travaux étape par étape, budget prévisionnel en trois scénarios, planning, conseils matériaux anciens et annuaire d’artisans.', prixBas: 1800, prixHaut: 3200, prixConseille: 2300, unite: 'forfait' },
  { id: 'accompagnement', type: 'accompagnement', libelle: 'Accompagnement en complément', detail: 'À la suite d’une mission déjà réalisée : dossier de consultation des entreprises, visites, analyse des devis et des exclusions, aide au choix, suivi du planning.', prixBas: 600, prixHaut: 1500, prixConseille: 1000, unite: 'forfait' },
  { id: 'accompagnement-complet', type: 'accompagnement', libelle: 'Accompagnement complet', detail: 'Souscrit dès le départ avec un diagnostic : de la consultation des entreprises au suivi du planning des travaux, avec un tarif d’ensemble (la connaissance du bâtiment est déjà acquise).', prixBas: 500, prixHaut: 1300, prixConseille: 850, unite: 'forfait' },
];

export const DEFAULT_OPTIONS: OptionCommerciale[] = [
  { id: 'km', libelle: 'Déplacement hors secteur', detail: 'Au-delà du rayon d’intervention standard', unite: 'km', prixBas: 0.6, prixHaut: 0.9, prixConseille: 0.75 },
  { id: 'reunion', libelle: 'Visite ou réunion complémentaire', detail: 'Réunion de restitution ou visite supplémentaire sur site', unite: 'séance', prixBas: 180, prixHaut: 350, prixConseille: 250 },
  { id: 'sondages', libelle: 'Sondages destructifs ciblés', detail: 'Ouverture ponctuelle (enduit, doublage, plancher, tête de poutre) pour vérifier un élément caché ; rebouchage sommaire', unite: 'sondage', prixBas: 120, prixHaut: 350, prixConseille: 200 },
  { id: 'plans-situation', libelle: 'Plans de situation et de repérage', detail: 'Plan de situation, plan de masse et plans de repérage des zones et des désordres', unite: 'forfait', prixBas: 150, prixHaut: 400, prixConseille: 250 },
  { id: 'guides', libelle: 'Guides de bonnes pratiques illustrés', detail: 'Fiches pédagogiques d’entretien adaptées aux matériaux du bâtiment (pierre, chaux, bois, terre…), jointes au rapport', unite: 'forfait', prixBas: 80, prixHaut: 250, prixConseille: 150 },
  { id: 'devis-sup', libelle: 'Analyse de devis supplémentaire', detail: 'Analyse technique et financière d’une offre d’entreprise hors forfait', unite: 'devis', prixBas: 75, prixHaut: 150, prixConseille: 100 },
  { id: 'recherche', libelle: 'Recherche d’entreprise qualifiée', detail: 'Recherche et qualification d’un artisan spécialisé pierre et patrimoine', unite: 'lot', prixBas: 150, prixHaut: 300, prixConseille: 200 },
  { id: 'maj', libelle: 'Mise à jour du rapport ou du planning', detail: 'Révision suite à une évolution du programme de travaux', unite: 'forfait', prixBas: 150, prixHaut: 350, prixConseille: 250 },
];

/* ───────────── Questionnaire → prix de la mission ───────────── */

export const QUESTIONNAIRE_VIDE: Questionnaire = {
  besoin: '', typeBatiment: 'maison', surface: null, niveaux: null, etat: 'moyen', desordres: 'plusieurs',
  etendue: 'complet', zonesConcernees: '', acces: 'facile', distanceKm: null, urgence: false, documents: '', notes: '',
};

export const Q_LABELS = {
  typeBatiment: { maison: 'Maison', 'grande-maison': 'Grande maison, ferme, demeure', immeuble: 'Immeuble', 'grand-edifice': 'Grand édifice (château, édifice religieux…)', annexe: 'Annexe, dépendance, mur' },
  etat: { bon: 'Bon état apparent', moyen: 'Quelques signes de fatigue', degrade: 'Dégradé', ruine: 'Très dégradé ou en ruine' },
  desordres: { peu: 'Peu de désordres', plusieurs: 'Plusieurs désordres', nombreux: 'Nombreux désordres' },
  etendue: { complet: 'Bâtiment complet', partiel: 'Une partie du bâtiment', zone: 'Une seule zone ou un seul ouvrage' },
  acces: { facile: 'Accès facile', moyen: 'Accès partiel (combles, cave…)', difficile: 'Accès difficile (hauteur, encombrement, sécurité)' },
} as const;

/**
 * Propose un prix dans la fourchette de la prestation selon l'ampleur du bâtiment :
 * 0 = petit bâtiment simple en bon état (prix bas), 1 = grand édifice dégradé (prix haut).
 */
export function prixSuggere(p: Prestation, q: Questionnaire): { prix: number; raisons: string[] } {
  const raisons: string[] = [];
  const s = q.surface ?? 0;
  const fSurface = s >= 500 ? 1 : s >= 250 ? 0.65 : s >= 120 ? 0.35 : s > 0 ? 0.1 : 0.35;
  const fType = { maison: 0.2, 'grande-maison': 0.6, immeuble: 0.6, 'grand-edifice': 1, annexe: 0 }[q.typeBatiment];
  const fNiv = (q.niveaux ?? 2) >= 4 ? 0.9 : (q.niveaux ?? 2) >= 3 ? 0.6 : (q.niveaux ?? 2) >= 2 ? 0.3 : 0;
  const fEtat = { bon: 0, moyen: 0.3, degrade: 0.7, ruine: 1 }[q.etat];
  const fDes = { peu: 0, plusieurs: 0.4, nombreux: 0.9 }[q.desordres];
  const fAcces = { facile: 0, moyen: 0.3, difficile: 0.8 }[q.acces];
  let f = fSurface * 0.3 + fType * 0.15 + fNiv * 0.1 + fEtat * 0.15 + fDes * 0.2 + fAcces * 0.1;
  if (s) raisons.push(`${s.toLocaleString('fr-FR')} m² de plancher`);
  raisons.push(Q_LABELS.typeBatiment[q.typeBatiment].toLowerCase(), Q_LABELS.etat[q.etat].toLowerCase(), Q_LABELS.desordres[q.desordres].toLowerCase());
  if (q.acces !== 'facile') raisons.push(Q_LABELS.acces[q.acces].toLowerCase());
  let prix = p.prixBas + (p.prixHaut - p.prixBas) * Math.min(1, Math.max(0, f));
  if (q.etendue === 'partiel') { prix *= 0.8; raisons.push('mission limitée à une partie du bâtiment'); }
  if (q.etendue === 'zone') { prix = Math.min(prix, p.prixBas) * 0.75; raisons.push('mission limitée à une seule zone'); }
  if (q.urgence) { prix *= 1.1; raisons.push('intervention urgente'); }
  return { prix: Math.round(prix / 10) * 10, raisons };
}

/* ───────────── Contacts ───────────── */

export type CategorieContact = 'client' | 'entreprise' | 'entreprise-possible' | 'partenaire' | 'autre';
export const CATEGORIES_CONTACT: Record<CategorieContact, string> = {
  client: 'Clients',
  entreprise: 'Entreprises avec qui j’ai travaillé',
  'entreprise-possible': 'Entreprises possibles',
  partenaire: 'Partenaires (architectes, bureaux d’études, notaires…)',
  autre: 'Autres',
};
export interface Contact {
  id: string;
  categorie: CategorieContact;
  nom: string; // personne
  societe: string;
  metier: string; // lot ou métier
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  notes: string;
  note?: number; // appréciation 1 à 5 (entreprises)
  lat?: number; lon?: number; // position (pour la recherche autour d'une adresse)
}
export const contactVide = (categorie: CategorieContact = 'client'): Contact => ({ id: Math.random().toString(36).slice(2, 10), categorie, nom: '', societe: '', metier: '', adresse: '', codePostal: '', ville: '', telephone: '', email: '', notes: '' });

/* ───────────── Relation client : modèles de mails ───────────── */

export interface ModeleMail { id: string; titre: string; moment: string; objet: string; corps: string }

export const VARIABLES_MAIL: [string, string][] = [
  ['{client}', 'Nom du client'], ['{adresse}', 'Adresse du bien'], ['{commune}', 'Commune'], ['{mission}', 'Titre de la mission'],
  ['{date_visite}', 'Date de visite'], ['{date_rendu}', 'Date de rendu prévue'], ['{numero_devis}', 'Numéro du dernier devis'], ['{montant_devis}', 'Montant du dernier devis'],
  ['{numero_facture}', 'Numéro de la dernière facture'], ['{montant_facture}', 'Montant de la dernière facture'], ['{echeance}', 'Échéance de la facture'], ['{signature}', 'Votre signature'],
];

export const DEFAULT_MAILS: ModeleMail[] = [
  { id: 'premier-contact', titre: 'Réponse à une première demande', moment: 'Prospect', objet: 'Votre projet — {adresse}',
    corps: 'Bonjour {client},\n\nMerci pour votre message et pour la confiance que vous accordez à L’Atelier de l’Existant.\n\nPour vous proposer la mission la plus adaptée, j’aurais besoin de quelques informations : surface approximative, nombre de niveaux, état général, désordres constatés, et ce que vous envisagez pour ce bâtiment (achat, travaux, entretien…).\n\nJe vous propose également un court échange téléphonique à votre convenance.\n\nBien cordialement,\n{signature}' },
  { id: 'envoi-devis', titre: 'Envoi du devis', moment: 'Devis', objet: 'Proposition de mission {numero_devis} — {mission}',
    corps: 'Bonjour {client},\n\nVeuillez trouver ci-joint ma proposition {numero_devis} pour la mission « {mission} » concernant le bien situé {adresse}, pour un montant de {montant_devis}.\n\nElle détaille le contenu de la mission, le déroulement de la visite et le livrable remis. Pour l’accepter, il suffit de me la retourner datée et signée avec la mention « Bon pour accord ».\n\nJe reste à votre disposition pour toute question.\n\nBien cordialement,\n{signature}' },
  { id: 'relance-devis', titre: 'Relance du devis', moment: 'Devis', objet: 'Suite à ma proposition {numero_devis}',
    corps: 'Bonjour {client},\n\nJe me permets de revenir vers vous au sujet de ma proposition {numero_devis} pour {adresse}. Avez-vous pu en prendre connaissance ?\n\nSi certains points méritent d’être ajustés (périmètre, calendrier), je peux tout à fait adapter la mission à vos besoins.\n\nBien cordialement,\n{signature}' },
  { id: 'confirmation-visite', titre: 'Confirmation de la visite', moment: 'Visite', objet: 'Confirmation de notre visite du {date_visite}',
    corps: 'Bonjour {client},\n\nJe vous confirme notre rendez-vous le {date_visite} au {adresse}.\n\nPour que la visite soit la plus utile possible, merci de prévoir si possible :\n- l’accès à toutes les pièces, aux combles, à la cave et aux abords ;\n- les plans, anciens diagnostics, factures de travaux et photos anciennes dont vous disposez ;\n- la liste de vos questions et de vos projets.\n\nLa visite dure en général deux à trois heures.\n\nÀ très bientôt,\n{signature}' },
  { id: 'envoi-rapport', titre: 'Envoi du rapport', moment: 'Rapport', objet: 'Votre rapport — {mission}',
    corps: 'Bonjour {client},\n\nVeuillez trouver ci-joint le rapport de la mission « {mission} » pour {adresse}.\n\nJe vous conseille de commencer par la synthèse, qui résume l’essentiel et l’ordre des priorités. Je vous propose un échange pour le parcourir ensemble et répondre à vos questions.\n\nBien cordialement,\n{signature}' },
  { id: 'envoi-facture', titre: 'Envoi de la facture', moment: 'Facturation', objet: 'Facture {numero_facture}',
    corps: 'Bonjour {client},\n\nVeuillez trouver ci-joint la facture {numero_facture} d’un montant de {montant_facture}, payable au plus tard le {echeance}.\n\nJe vous remercie pour votre confiance.\n\nBien cordialement,\n{signature}' },
  { id: 'relance-facture', titre: 'Relance de facture', moment: 'Facturation', objet: 'Rappel — facture {numero_facture}',
    corps: 'Bonjour {client},\n\nSauf erreur de ma part, la facture {numero_facture} d’un montant de {montant_facture}, arrivée à échéance le {echeance}, reste à régler. Pourriez-vous vérifier de votre côté ?\n\nSi le règlement a été effectué entre-temps, merci de ne pas tenir compte de ce message.\n\nBien cordialement,\n{signature}' },
  { id: 'demande-acompte', titre: 'Demande d’acompte avant la visite', moment: 'Visite', objet: 'Acompte avant notre visite du {date_visite}',
    corps: 'Bonjour {client},\n\nMerci pour votre accord sur la proposition {numero_devis}. Comme prévu dans le devis, un acompte est à régler avant la visite du {date_visite} pour confirmer le rendez-vous. Vous trouverez la facture d’acompte {numero_facture} ({montant_facture}) ci-jointe.\n\nBien cordialement,\n{signature}' },
  { id: 'bonne-reception', titre: 'Bonne réception du rapport', moment: 'Rapport', objet: 'Avez-vous bien reçu le rapport ?',
    corps: 'Bonjour {client},\n\nJe voulais m’assurer que vous avez bien reçu le rapport « {mission} » pour {adresse}, et qu’il est lisible de votre côté.\n\nSi certains points méritent des explications, je vous propose un échange téléphonique ou une visio pour le parcourir ensemble.\n\nBien cordialement,\n{signature}' },
  { id: 'accompagnement', titre: 'Proposition d’accompagnement', moment: 'Après la mission', objet: 'Pour la suite de vos travaux',
    corps: 'Bonjour {client},\n\nVous avez maintenant en main le rapport pour {adresse}. Si vous le souhaitez, je peux vous accompagner pour la suite : consultation des entreprises, analyse des devis (méthodes, matériaux, exclusions), aide au choix et suivi du planning.\n\nCet accompagnement évite les mauvaises surprises et garantit que les travaux respectent le bâti ancien. Je vous envoie une proposition sur simple demande.\n\nBien cordialement,\n{signature}' },
  { id: 'prescripteur', titre: 'Présentation à un prescripteur', moment: 'Prospection', objet: 'Diagnostic du bâti ancien — L’Atelier de l’Existant',
    corps: 'Bonjour,\n\nJe me permets de vous présenter L’Atelier de l’Existant : je réalise des avis sanitaires et des diagnostics de bâtiments anciens (pierre, chaux, terre, bois) pour les particuliers qui achètent, rénovent ou constatent des désordres.\n\nVos clients se posent sans doute des questions avant un achat ou des travaux : un avis indépendant peut les aider à décider sereinement. Je vous joins ma plaquette et me tiens à votre disposition pour en parler.\n\nBien cordialement,\n{signature}' },
  { id: 'avis-client', titre: 'Demande d’avis', moment: 'Après la mission', objet: 'Votre avis compte',
    corps: 'Bonjour {client},\n\nJ’espère que le rapport vous aide dans votre projet. Si vous avez été satisfait de mon intervention, un court témoignage me serait précieux pour faire connaître L’Atelier de l’Existant.\n\nMerci d’avance,\n{signature}' },
  { id: 'suivi', titre: 'Prise de nouvelles après travaux', moment: 'Après la mission', objet: 'Des nouvelles de votre bâtiment',
    corps: 'Bonjour {client},\n\nQuelques mois ont passé depuis notre mission à {adresse}. Où en sont vos travaux ? Si vous avez des photos de l’avancement ou du résultat, je serais ravie de les voir — et, avec votre accord, de les présenter parmi nos réalisations.\n\nSi des questions se posent en cours de chantier, je reste disponible.\n\nBien cordialement,\n{signature}' },
];

/* ───────────── À faire ───────────── */
export interface Tache { id: string; texte: string; fait: boolean; date?: string; dossierId?: string; categorie?: TypeEvenement }

/* ───────────── Bibliothèque de prix (chiffrage des interventions) ───────────── */

export interface ObservationPrix {
  id: string;
  date: string;
  prixUnitaire: number; // hors taxes
  source: 'devis' | 'facture' | 'estimation';
  entreprise?: string;
  commune?: string;
}

export interface PrixItem {
  id: string;
  libelle: string;
  lot: string;
  unite: string;
  bas: number; // valeur de départ (hors taxes, fourniture et pose)
  haut: number;
  observations: ObservationPrix[];
}

const P = (id: string, libelle: string, lot: string, unite: string, bas: number, haut: number): PrixItem => ({ id, libelle, lot, unite, bas, haut, observations: [] });

/**
 * Valeurs de départ indicatives (hors taxes, fourniture et pose, bâti ancien).
 * Elles s'affinent automatiquement avec les devis et factures que vous enregistrez.
 */
export const DEFAULT_PRIX: PrixItem[] = [
  P('solin', 'Réfection de solin de souche (plomb ou zinc)', 'Couverture – zinguerie', 'unité', 400, 900),
  P('couv-revision', 'Révision de couverture en tuiles (remaniage)', 'Couverture – zinguerie', 'm²', 25, 55),
  P('couv-refection', 'Réfection complète de couverture en tuile canal', 'Couverture – zinguerie', 'm²', 110, 190),
  P('gouttiere', 'Gouttière pendante en zinc', 'Couverture – zinguerie', 'mètre linéaire', 45, 90),
  P('descente', 'Descente d’eau pluviale en zinc', 'Couverture – zinguerie', 'mètre linéaire', 40, 80),
  P('raccord-ep', 'Raccordement de descente et regard', 'Couverture – zinguerie', 'unité', 250, 600),
  P('bachage', 'Bâchage provisoire de couverture', 'Étaiement – sécurisation', 'forfait', 300, 900),
  P('etai', 'Étaiement provisoire (location et pose, par étai)', 'Étaiement – sécurisation', 'unité', 60, 160),
  P('purge', 'Purge d’éléments instables en tête de mur', 'Étaiement – sécurisation', 'forfait', 300, 1200),
  P('depose-enduit-ciment', 'Dépose d’enduit ciment sur maçonnerie ancienne', 'Enduits et rejointoiement à la chaux', 'm²', 25, 50),
  P('enduit-chaux', 'Enduit à la chaux en trois couches', 'Enduits et rejointoiement à la chaux', 'm²', 70, 130),
  P('rejointoiement', 'Dégarnissage et rejointoiement à la chaux', 'Enduits et rejointoiement à la chaux', 'm²', 60, 120),
  P('chaux-chanvre', 'Enduit intérieur chaux-chanvre', 'Enduits et rejointoiement à la chaux', 'm²', 60, 110),
  P('dessalement', 'Dessalement par compresses', 'Enduits et rejointoiement à la chaux', 'm²', 30, 70),
  P('badigeon', 'Badigeon de chaux', 'Finitions intérieures', 'm²', 15, 35),
  P('depose-trottoir', 'Dépose de trottoir béton en pied de façade', 'Voirie et réseaux – drainage', 'mètre linéaire', 40, 90),
  P('drain', 'Drain périphérique avec casquette de galets', 'Voirie et réseaux – drainage', 'mètre linéaire', 120, 250),
  P('pavage', 'Pavage jointoyé chaux et sable', 'Voirie et réseaux – drainage', 'm²', 80, 160),
  P('linteau', 'Remplacement de linteau (chêne ou pierre)', 'Maçonnerie – pierre de taille', 'unité', 800, 1800),
  P('relancis', 'Relancis de pierres de même nature', 'Maçonnerie – pierre de taille', 'm²', 300, 650),
  P('fissure-regarnissage', 'Regarnissage de fissure au mortier de chaux', 'Maçonnerie – pierre de taille', 'mètre linéaire', 40, 90),
  P('agrafage', 'Agrafage traditionnel de fissure', 'Maçonnerie – pierre de taille', 'unité', 80, 200),
  P('tirant', 'Tirant métallique traversant avec clés d’ancrage', 'Maçonnerie – pierre de taille', 'unité', 1200, 2800),
  P('coulis', 'Injection de coulis de chaux dans les vides', 'Maçonnerie – pierre de taille', 'm²', 90, 200),
  P('pierre-taille', 'Remplacement de pierre de taille', 'Maçonnerie – pierre de taille', 'unité', 250, 700),
  P('soupirail', 'Réouverture de soupirail avec grille', 'Ventilation', 'unité', 250, 600),
  P('ventilation', 'Création de ventilation naturelle traversante', 'Ventilation', 'forfait', 400, 1500),
  P('prothese-bois', 'Prothèse de tête de poutre en bois massif', 'Charpente – menuiserie bois', 'unité', 450, 1100),
  P('solive', 'Doublement ou remplacement de solive', 'Charpente – menuiserie bois', 'unité', 150, 400),
  P('traitement-bois', 'Traitement insecticide et fongicide des bois', 'Traitement des bois', 'm²', 25, 50),
  P('isolation-chanvre', 'Isolation intérieure perméable (fibre de bois, chanvre)', 'Isolation biosourcée', 'm²', 80, 160),
  P('temoins', 'Pose de témoins de fissure et relevés', 'Études et investigations', 'unité', 60, 150),
  P('diag-bois', 'Diagnostic parasitaire des bois', 'Études et investigations', 'forfait', 150, 450),
  P('humidite', 'Mesures d’humidité dans les murs', 'Études et investigations', 'forfait', 200, 500),
  P('g5', 'Étude géotechnique de type G5', 'Études et investigations', 'forfait', 1500, 4000),
  P('structure', 'Étude de structure par un bureau d’études', 'Études et investigations', 'forfait', 900, 3000),
];

const quantile = (sorted: number[], q: number) => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/**
 * Fourchette de prix unitaire estimée :
 *  - sans devis : valeur de départ ;
 *  - 1 ou 2 devis : moyenne pondérée entre valeur de départ et prix constatés ;
 *  - 3 devis ou plus : quartiles des prix constatés des 3 dernières années.
 */
export function estimatePrix(item: PrixItem): { bas: number; haut: number; fiabilite: string; n: number } {
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - 3);
  const obs = item.observations
    .filter((o) => o.prixUnitaire > 0 && (!o.date || new Date(o.date) >= limite))
    .map((o) => o.prixUnitaire)
    .sort((a, b) => a - b);
  const n = obs.length;
  const round = (v: number) => (v >= 100 ? Math.round(v / 5) * 5 : Math.round(v * 100) / 100);
  if (n === 0) return { bas: item.bas, haut: item.haut, fiabilite: 'Valeur de départ', n };
  if (n < 3) {
    const w = 2; // poids de la valeur de départ
    const min = obs[0];
    const max = obs[n - 1];
    return { bas: round((item.bas * w + min * n) / (w + n)), haut: round((item.haut * w + max * n) / (w + n)), fiabilite: `Affinée par ${n} prix constaté${n > 1 ? 's' : ''}`, n };
  }
  return { bas: round(quantile(obs, 0.25)), haut: round(quantile(obs, 0.75)), fiabilite: `Basée sur ${n} prix constatés`, n };
}

/* ───────────── Agenda ───────────── */

export type TypeEvenement = 'rdv' | 'visite' | 'rendu' | 'relance' | 'mail' | 'prospection' | 'administratif' | 'comptabilite' | 'communication' | 'developpement' | 'formation' | 'autre';

export interface Evenement {
  id: string;
  date: string; // AAAA-MM-JJ
  heure?: string; // HH:MM
  dureeMin?: number;
  titre: string;
  type: TypeEvenement;
  dossierId?: string;
  lieu?: string;
  notes?: string;
}

export const TYPE_EVENEMENT: Record<TypeEvenement | 'facture' | 'devis', { label: string; color: string }> = {
  rdv: { label: 'Rendez-vous', color: '#334B3D' },
  visite: { label: 'Visite', color: '#68725E' },
  rendu: { label: 'Date de rendu', color: '#A8432F' },
  relance: { label: 'Relance client', color: '#B97A5B' },
  mail: { label: 'Mail à envoyer', color: '#7FA3B5' },
  prospection: { label: 'Prospection', color: '#C9A15A' },
  administratif: { label: 'Administratif', color: '#6E6A8E' },
  comptabilite: { label: 'Comptabilité', color: '#5B7F95' },
  communication: { label: 'Communication', color: '#9C6B8E' },
  developpement: { label: 'Développement', color: '#4E7A55' },
  formation: { label: 'Formation, veille', color: '#8A7A5B' },
  autre: { label: 'Autre', color: '#8A8F86' },
  devis: { label: 'Fin de validité du devis', color: '#C9A15A' },
  facture: { label: 'Échéance de facture', color: '#A8432F' },
};

/* ───────────── Prospection ───────────── */
export type StatutPiste = 'a-contacter' | 'contacte' | 'rdv' | 'devis' | 'gagne' | 'perdu';
export const STATUTS_PISTE: Record<StatutPiste, string> = { 'a-contacter': 'À contacter', contacte: 'Contacté', rdv: 'Rendez-vous', devis: 'Devis envoyé', gagne: 'Gagné', perdu: 'Sans suite' };
export const TYPES_PISTE = ['Particulier', 'Notaire', 'Agence immobilière', 'Architecte', 'Artisan', 'Mairie, collectivité', 'Association du patrimoine', 'Syndic, bailleur', 'Autre'];
export const SOURCES = ['Bouche à oreille', 'Site internet', 'Réseaux sociaux', 'Notaire', 'Agence immobilière', 'Artisan', 'Architecte', 'Salon, marché', 'Démarchage', 'Ancien client', 'Autre'];
export interface Piste {
  id: string; nom: string; type: string; source: string; statut: StatutPiste;
  telephone: string; email: string; ville: string;
  prochaineAction: string; dateAction?: string; notes: string; creeLe: string; dossierId?: string;
}

/* ───────────── Développement de l'entreprise ───────────── */
export interface ActionDev { id: string; titre: string; categorie: TypeEvenement; echeance?: string; fait: boolean; notes?: string }
export interface Developpement { objectifCA: number; objectifMissions: number; actions: ActionDev[]; idees: string }
export const DEV_VIDE: Developpement = {
  objectifCA: 30000, objectifMissions: 40, idees: '',
  actions: [
    { id: 'a1', titre: 'Présenter l’activité aux notaires et agences immobilières du secteur', categorie: 'prospection', fait: false },
    { id: 'a2', titre: 'Créer une fiche d’établissement sur les cartes en ligne et demander des avis clients', categorie: 'communication', fait: false },
    { id: 'a3', titre: 'Désigner un médiateur de la consommation (obligatoire avec des clients particuliers)', categorie: 'administratif', fait: false },
    { id: 'a4', titre: 'Faire relire les conditions générales et les limites du rapport par l’assureur', categorie: 'administratif', fait: false },
    { id: 'a5', titre: 'Publier trois réalisations (avec l’accord des clients)', categorie: 'communication', fait: false },
  ],
};

/* ───────────── Nos réalisations ───────────── */
export interface Realisation { dossierId: string; titre: string; texte: string; accordClient: boolean; anonyme: boolean }
