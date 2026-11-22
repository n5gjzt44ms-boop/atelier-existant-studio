import type { Priority } from './types';

/**
 * Bibliothèque de désordres types — rédigée d'après le référentiel métier
 * de L'Atelier de l'Existant (pathologies §5, compatibilités §8, priorités §6).
 *
 * Chaque modèle pré-remplit une fiche. Les « … » sont à compléter sur place
 * (mesures, orientation, étendue). L'analyse reste prudente : toute cause non
 * vérifiée est signalée « hypothèse à vérifier par investigation spécifique ».
 */
export interface DesordreTemplate {
  type: string; // doit correspondre à PATHOLOGIES
  famille: 'Fissures & structure' | 'Eau & humidité' | 'Pierre & enduits' | 'Bois' | 'Autres' | 'À catégoriser';
  element: string;
  priorite: Priority;
  lot: string;
  lots?: string[];
  unite: string;
  constat: string;
  analyse: string;
  investigations: string;
  preconisation: string;
  prixId?: string; // ouvrage de la bibliothèque de prix utilisé pour le chiffrage automatique
  categorie?: string; // rangement par ouvrage (sinon déduit de l'élément)
  alias?: string[]; // anciens noms (doublons fusionnés) : la recherche les retrouve
}

const VERIF = ' Hypothèse à vérifier par investigation spécifique.';

export const TEMPLATES: DesordreTemplate[] = [
  /* ───────── Fissures & structure ───────── */
  {
    type: 'Fissure verticale', prixId: 'fissure-regarnissage', famille: 'Fissures & structure', element: 'Mur', priorite: 'P2',
    lot: 'Maçonnerie – pierre de taille', unite: 'mètre linéaire',
    constat: 'Fissure verticale d’ouverture ≈ … mm, sur une hauteur d’environ … m, située … (angle / jonction entre deux corps de bâtiment / au droit d’une baie). Traversante : … Désaffleurement des lèvres : …',
    analyse: 'Une fissure verticale à un angle ou à une jonction traduit le plus souvent un défaut de chaînage d’angle ou un tassement différentiel entre deux parties d’âges ou de charges différents.' + VERIF,
    investigations: 'Pose de témoins (jauges type Saugnac) et relevés sur 6 à 12 mois pour savoir si la fissure est active ; étude de sol G5 si elle évolue.',
    preconisation: 'Si la fissure est stabilisée : purge, regarnissage au mortier de chaux NHL 2 ou NHL 3.5, éventuellement agrafage traditionnel. Si elle est active : traiter d’abord la cause (chaînage, tirant, reprise en sous-œuvre selon étude). Proscrire le calfeutrement au ciment ou à la mousse.',
  },
  {
    type: 'Fissure diagonale / en escalier', prixId: 'fissure-regarnissage', famille: 'Fissures & structure', element: 'Mur', priorite: 'P2',
    lot: 'Maçonnerie – pierre de taille', unite: 'mètre linéaire',
    constat: 'Fissure oblique suivant les joints de mortier « en escalier », longueur ≈ … m, ouverture maximale ≈ … mm vers … (haut / bas, gauche / droite). Située …',
    analyse: 'La fissure en escalier indique un mouvement de cisaillement ou un affaissement localisé du sol sous une partie du mur : la maçonnerie se désolidarise le long des joints. Le sens d’ouverture renseigne sur la zone qui descend.' + VERIF,
    investigations: 'Témoins de fissure et suivi ; vérification des réseaux enterrés (fuite, regard), de la végétation proche et du ruissellement ; étude géotechnique G5 si évolution.',
    preconisation: 'Supprimer la cause (eau au pied du mur, fuite de réseau, racines) puis, une fois le mouvement stabilisé, regarnir les joints au mortier de chaux et relancer les pierres fendues (relancis de même nature géologique).',
  },
  {
    type: 'Fissure horizontale / bombement', prixId: 'tirant', famille: 'Fissures & structure', element: 'Mur', priorite: 'P1',
    lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Fissure horizontale et/ou bombement du parement (« ventre ») sur environ … m², flèche estimée ≈ … cm, à … m du sol. Pierres déplacées ou fendues : …',
    analyse: 'Signe critique : décollement probable du parement extérieur par rapport au cœur du mur en tout-venant, ou poussée excessive d’une charpente sans entrait. Risque de chute de pierres ou d’instabilité.' + VERIF,
    investigations: 'Relevé de verticalité (fil à plomb ou laser), sondage ponctuel pour évaluer la cohésion du cœur de mur, examen de la charpente (présence et état des entraits).',
    preconisation: 'En urgence : périmètre de sécurité et étaiement si risque de chute. Ensuite : tirants métalliques traversants avec clés d’ancrage, coulis de chaux aérienne dans les vides, relancis. Proscrire les injections de résine et l’agrafage béton armé.',
  },
  {
    type: 'Affaissement de linteau', prixId: 'linteau', famille: 'Fissures & structure', element: 'Linteau', priorite: 'P2',
    lot: 'Maçonnerie – pierre de taille', unite: 'unité',
    constat: 'Fissuration en arc au-dessus de la baie, ouverture ≈ … mm ; linteau … (bois / pierre) présentant une flèche apparente de ≈ … mm. Jambages : …',
    analyse: 'Fissure en arc de décharge causée par la rupture ou le pourrissement probable du linteau, ou par le basculement d’un jambage.' + VERIF,
    investigations: 'Sondage local de l’enduit au droit du linteau pour constater l’état du bois (pourriture, insectes) ou de la pierre (fissure).',
    preconisation: 'Étaiement provisoire de la baie, dépose du linteau défaillant et remplacement par un linteau chêne ou pierre de section adaptée, reprise des maçonneries en relancis au mortier de chaux.',
  },
  {
    type: 'Tassement différentiel', prixId: 'g5', famille: 'Fissures & structure', element: 'Mur', priorite: 'P2',
    lot: 'Études et investigations', unite: 'forfait',
    constat: 'Ensemble de fissures … (verticales / en escalier) concentrées sur …, avec défaut de planéité des sols / déformation des baies (portes qui frottent : …).',
    analyse: 'L’ensemble des désordres oriente vers un tassement différentiel d’une partie de l’ouvrage (sol hétérogène, variation d’humidité, fuite de réseau, extension sur fondations différentes).' + VERIF,
    investigations: 'Étude géotechnique G5, inspection des réseaux enterrés, suivi des fissures par témoins sur au moins un cycle saisonnier.',
    preconisation: 'Aucune reprise structurelle avant les conclusions de l’étude de sol. Dans l’attente : maîtriser l’eau aux abords (gouttières, pentes, regards), surveiller les témoins.',
  },
  {
    type: 'Déformation de plancher', prixId: 'prothese-bois', famille: 'Fissures & structure', element: 'Plancher', priorite: 'P2',
    lot: 'Charpente – menuiserie bois', unite: 'm²',
    constat: 'Plancher présentant une flèche ≈ … cm et une souplesse marquée à la marche sur environ … m² (pièce …). Fissures en plafond dessous : …',
    analyse: 'Sous-dimensionnement, surcharge, ou affaiblissement des solives et des têtes de poutres encastrées (pourriture liée à l’humidité du mur, attaque d’insectes).' + VERIF,
    investigations: 'Sondage des têtes de poutres côté mur, diagnostic des bois (humidité, insectes, champignons), vérification des sections par un bureau d’études si nécessaire.',
    preconisation: 'Selon sondage : prothèses de bois massif aux têtes de poutres (assemblages traditionnels), moisage ou doublement de solives, traitement des bois. Interdire les charges lourdes dans l’attente. Proscrire le scellement des têtes au ciment.',
  },
  {
    type: 'Corrosion d’aciers', prixId: 'etai', famille: 'Fissures & structure', element: 'Plancher', priorite: 'P1',
    lot: 'Étaiement – sécurisation', unite: 'forfait',
    constat: 'Poutrelles métalliques … (plancher haut de cave / voûtains) corrodées avec feuilletage de l’acier, perte de section visible sur … ; éclats de maçonnerie au droit des appuis.',
    analyse: 'La corrosion gonfle l’acier et réduit sa section porteuse ; l’humidité du local (cave peu ventilée, infiltrations) entretient le phénomène. Risque pour la tenue du plancher.' + VERIF,
    investigations: 'Mesure des pertes de section et vérification de la capacité portante par un bureau d’études structure.',
    preconisation: 'Étaiement provisoire immédiat sous les poutrelles atteintes, puis brossage, traitement anticorrosion ou remplacement selon étude ; ventiler la cave et supprimer les arrivées d’eau.',
  },

  /* ───────── Eau & humidité ───────── */
  {
    type: 'Infiltration', prixId: 'couv-revision', famille: 'Eau & humidité', element: 'Gouttière / descente', priorite: 'P1',
    lot: 'Couverture – zinguerie', unite: 'forfait',
    constat: 'Traces d’humidité localisées (coulures, auréoles, mousses) sous … (gouttière / chéneau / souche / appui de fenêtre / fissure), sur environ … m². Point de rupture visible : …',
    analyse: 'Taches localisées sous un point de rupture : infiltration d’eau liquide liée à un défaut d’étanchéité de la couverture, de la zinguerie ou à un mauvais rejet d’eau. Infiltration active susceptible d’aggraver rapidement l’état du bâtiment.',
    investigations: 'Contrôle par temps de pluie ; inspection rapprochée de la couverture et de la zinguerie.',
    preconisation: 'Mise hors d’eau rapide : réparation ou remplacement de l’élément défaillant (gouttière, solin, chéneau, appui avec goutte d’eau), puis séchage avant toute reprise d’enduit ou de finition.',
  },
  {
    type: 'Remontées capillaires', prixId: 'drain', famille: 'Eau & humidité', element: 'Soubassement', priorite: 'P2',
    lot: 'Voirie et réseaux – drainage', unite: 'mètre linéaire',
    constat: 'Frange d’humidité continue en pied de mur jusqu’à ≈ … m de hauteur, avec efflorescences (salpêtre) et décollement des enduits / peintures sur ≈ … ml. Abords : … (trottoir béton, enrobé, terre).',
    analyse: 'La frange continue à la base du mur caractérise des remontées capillaires depuis le sol, aggravées par tout revêtement étanche aux abords ou sur le mur qui empêche l’évaporation.' + VERIF,
    investigations: 'Mesures d’humidité dans l’épaisseur du mur à plusieurs hauteurs (bombe à carbure ou carottage), relevé des niveaux de sol extérieur et intérieur.',
    preconisation: 'Rendre au mur sa capacité à sécher : dépose des revêtements étanches (trottoir béton, enduit ciment), drain périphérique respirant avec casquette de galets, pavage jointoyé chaux/sable. Proscrire le seringage de résine et les membranes plastiques non ventilées.',
  },
  {
    type: 'Condensation / confinement', prixId: 'ventilation', famille: 'Eau & humidité', element: 'Mur', priorite: 'P2',
    lot: 'Ventilation', unite: 'forfait',
    constat: 'Moisissures et taches noires en … (angles, plafond, derrière les meubles), odeur de renfermé, buée sur les vitrages. Ventilation existante : … ; revêtements : …',
    analyse: 'Vapeur d’eau retenue dans les locaux : ventilation insuffisante et/ou parois rendues étanches (enduit ciment, peinture plastique, doublage) qui empêchent la régulation hygrothermique du mur.' + VERIF,
    investigations: 'Mesure de l’humidité relative intérieure sur quelques jours (hygromètre enregistreur).',
    preconisation: 'Rétablir la ventilation (entrées d’air, extraction, soupiraux), déposer les revêtements étanches et les remplacer par des enduits et badigeons de chaux perspirants.',
  },
  {
    type: 'Efflorescences / sels', prixId: 'dessalement', famille: 'Eau & humidité', element: 'Mur', priorite: 'P2',
    lot: 'Enduits et rejointoiement à la chaux', unite: 'm²',
    constat: 'Efflorescences blanches et poudreuses sur environ … m² à … m de hauteur ; pierre ou enduit sous-jacent … (sain / alvéolé / sableux).',
    analyse: 'L’eau chargée en sels minéraux migre dans le mur et cristallise en surface (efflorescences) ou dans les pores (crypto-efflorescences) ; la pression de cristallisation désagrège la pierre. Il s’agit d’un symptôme : la source d’humidité est à traiter.' + VERIF,
    investigations: 'Identifier la source d’eau (remontées, infiltration, ancien usage du local) ; analyse des sels si dessalement envisagé.',
    preconisation: 'Après traitement de la source d’humidité : brossage à sec, dessalement par compresses si nécessaire, enduit chaux à porosité adaptée (enduit sacrificiel éventuel).',
  },
  {
    type: 'Gélifraction', prixId: 'pierre-taille', famille: 'Eau & humidité', element: 'Pierre', priorite: 'P2',
    lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Écaillage / feuilletage / éclatement de pierres sur environ … m² (…, zone exposée), profondeur des pertes ≈ … cm.',
    analyse: 'L’eau piégée dans une pierre saturée gèle et augmente de volume : écaillage et éclatement. Phénomène souvent aggravé par un joint ou un enduit ciment qui bloque l’eau dans la pierre.' + VERIF,
    investigations: 'Vérifier l’origine de la saturation (rejaillissement, joints ciment, absence de rejet d’eau).',
    preconisation: 'Supprimer l’apport d’eau, purger les parties instables, remplacer les pierres trop dégradées par relancis de même nature géologique, rejointoyer à la chaux.',
  },

  /* ───────── Pierre & enduits ───────── */
  {
    type: 'Joints ciment bloquants', prixId: 'rejointoiement', famille: 'Pierre & enduits', element: 'Joint', priorite: 'P2',
    lot: 'Enduits et rejointoiement à la chaux', unite: 'm²',
    constat: 'Joints / enduit au ciment sur environ … m² (…). Pierres en retrait ou dégradées autour des joints ; fissures et décollements : …',
    analyse: 'Le ciment, plus dur et imperméable que la pierre, bloque l’évaporation : l’humidité se concentre dans la pierre, qui s’altère, et sa rigidité crée des tensions qui fendent les pierres voisines (effet de blocage).',
    investigations: 'Analyse de mortier si la nature du joint est incertaine.',
    preconisation: 'Déjointoiement soigné du ciment sans épaufrer les pierres, temps de séchage, rejointoiement au mortier de chaux (CL90 ou NHL 2 selon la pierre) et sable de rivière lavé. Le nouveau mortier doit rester plus tendre et plus perméable que la pierre.',
  },
  {
    type: 'Décollement d’enduit', prixId: 'enduit-chaux', famille: 'Pierre & enduits', element: 'Enduit', priorite: 'P2',
    lot: 'Enduits et rejointoiement à la chaux', unite: 'm²',
    constat: 'Enduit … (ciment / chaux / plâtre) soufflé, sonnant creux ou tombé sur environ … m², à … m de hauteur.',
    analyse: 'Perte d’adhérence liée à l’humidité du support et/ou à l’incompatibilité de l’enduit (enduit ciment sur maçonnerie ancienne).' + VERIF,
    investigations: 'Sondage au marteau pour délimiter les zones creuses ; identification de l’enduit.',
    preconisation: 'Purge des parties décollées (totale si enduit ciment), séchage du support, enduit chaux en trois couches compatible avec le support.',
  },
  {
    type: 'Altération de la pierre', prixId: 'relancis', famille: 'Pierre & enduits', element: 'Pierre', priorite: 'P2',
    lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Pierres présentant … (désagrégation sableuse / desquamation en plaques / alvéolisation) sur environ … m², profondeur ≈ … cm.',
    analyse: 'Altération liée à l’action combinée de l’eau, des sels et du vent ; souvent accélérée par des joints ou enduits imperméables voisins.' + VERIF,
    investigations: 'Repérer les sources d’eau et de sels ; identifier la nature de la pierre pour les remplacements.',
    preconisation: 'Traiter la cause, purger les parties friables, ragréer au mortier de chaux ou remplacer par relancis de pierre de même nature géologique.',
  },

  /* ───────── Bois ───────── */
  {
    type: 'Champignon lignivore', prixId: 'traitement-bois', famille: 'Bois', element: 'Poutre', priorite: 'P1',
    lot: 'Traitement des bois', unite: 'forfait',
    constat: 'Bois présentant … (pourriture cubique, filaments blancs ou cotonneux, fructifications, poussière rousse) sur …, zone humide et confinée.',
    analyse: 'Développement probable d’un champignon lignivore (mérule, coniophore), qui exige un bois à plus de 20 % d’humidité en atmosphère confinée ; la mérule détruit la cellulose et peut se propager vite.' + VERIF,
    investigations: 'Diagnostic par un professionnel (identification de l’espèce, extension) ; déclaration en mairie si mérule confirmée selon arrêté local.',
    preconisation: 'Supprimer la source d’humidité et ventiler, purger les bois atteints au-delà de la zone visible, traitement fongicide certifié des bois et maçonneries, prothèses en bois massif.',
  },
  {
    type: 'Attaque xylophage', prixId: 'traitement-bois', famille: 'Bois', element: 'Charpente', priorite: 'P2',
    lot: 'Traitement des bois', unite: 'forfait',
    constat: 'Trous d’envol (… mm) et galeries sur … (chevrons / solives / poutres) ; vermoulure fraîche : … (oui / non).',
    analyse: 'Attaque d’insectes à larves xylophages (capricorne, vrillettes) réduisant la section efficace des bois. Activité … (à confirmer par la présence de vermoulure fraîche).' + VERIF,
    investigations: 'Diagnostic parasitaire des bois par un professionnel certifié ; sondage au poinçon pour évaluer la section saine.',
    preconisation: 'Si activité confirmée : bûchage des parties vermoulues, traitement insecticide certifié par badigeon et/ou injection, renfort ou prothèse si la section restante est insuffisante.',
  },

  /* ───────── Autres ───────── */
  {
    type: 'Autre', famille: 'Autres', element: 'Mur', priorite: 'P3',
    lot: '', unite: 'forfait',
    constat: '…',
    analyse: '…',
    investigations: '',
    preconisation: '…',
  },
];

export const TEMPLATE_BY_TYPE = new Map(TEMPLATES.map((t) => [t.type, t]));

export const FAMILLES = ['Fissures & structure', 'Eau & humidité', 'Pierre & enduits', 'Bois', 'Autres', 'À catégoriser'] as const;
export const A_CATEGORISER = 'À catégoriser' as const;
