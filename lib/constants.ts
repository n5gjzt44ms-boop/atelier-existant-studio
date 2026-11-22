import type { DeliverableType, MesureCategorie, Phase, Priority, Status, ZoneCategory } from './types';

export const BRAND = {
  nom: "L'Atelier de l'Existant",
  baseline: 'Conseil · Diagnostic · Conception · Accompagnement',
  devise: 'Comprendre son histoire, accompagner sa transformation.',
  manifeste: "Comprendre l'existant avant de le transformer",
};

/** Offre commerciale de L'Atelier de l'Existant (référentiel §3). Le type de livrable est le titre de la mission. */
export const DELIVERABLES: Record<
  DeliverableType,
  { num: string; titre: string; court: string; question: string; description: string; livrables: string }
> = {
  avis: {
    num: '01',
    titre: 'Avis sanitaire',
    court: 'Avis sanitaire',
    question: '« Dois-je m’inquiéter ? Faut-il aller plus loin ? »',
    description: 'Visite visuelle sur site, photos des désordres majeurs, analyse sanitaire globale, hypothèses préliminaires, avis sur l’opportunité d’une étude.',
    livrables: 'Compte rendu synthétique, points de vigilance, orientation.',
  },
  diagnostic: {
    num: '02',
    titre: 'Diagnostic structurel',
    court: 'Diagnostic structurel',
    question: '« Qu’est-ce qui ne va pas et quelles sont les causes ? »',
    description: 'Inspection approfondie des maçonneries, charpentes, planchers et ouvertures ; recherche des causes probables et préconisations de principe.',
    livrables: 'Rapport structuré, fiches désordres localisées avec photos, priorités.',
  },
  conseil: {
    num: '03',
    titre: 'Diagnostic et conseil',
    court: 'Diagnostic et conseil',
    question: '« Comment organiser mon projet et quel budget prévoir ? »',
    description: 'Tout le diagnostic structurel, plus l’analyse comparative des solutions, les conseils matériaux anciens, les scénarios financiers et l’ordre des travaux.',
    livrables: 'Diagnostic complet, programme de travaux, budget prévisionnel, planning, annuaire d’artisans.',
  },
  accompagnement: {
    num: '04',
    titre: 'Accompagnement',
    court: 'Accompagnement',
    question: '« Pouvez-vous m’aider à consulter et organiser les artisans ? »',
    description: 'Préparation du dossier de consultation des entreprises, organisation des visites, analyse des devis et des exclusions, aide au choix, suivi du planning.',
    livrables: 'Dossier de consultation, tableau comparatif des devis, planning partagé.',
  },
};

/** Anciens types de livrables → offre actuelle (reprise des dossiers existants). */
export const LEGACY_TYPES: Record<string, DeliverableType> = { msu: 'avis', expertise: 'diagnostic', modulaire: 'conseil' };

export const STATUS_LABEL: Record<Status, string> = {
  brouillon: 'Brouillon',
  revision: 'En révision',
  finalise: 'Finalisé',
  envoye: 'Envoyé au client',
};

export const PRIORITY: Record<Priority, { label: string; court: string; definition: string; color: string }> = {
  P1: {
    label: 'Urgent',
    court: 'Urgent',
    definition:
      'À traiter sans délai ou à très court terme : sécurité des personnes, stabilité de la structure (mesures conservatoires), infiltrations actives qui aggravent rapidement l’état du bâtiment.',
    color: '#A8432F',
  },
  P2: {
    label: 'À court terme',
    court: 'Court terme',
    definition: 'Travaux d’entretien et de renforcement à programmer rapidement : désordres qui dégradent la durabilité de l’ouvrage et la conservation des matériaux.',
    color: '#B97A5B',
  },
  P3: {
    label: 'À moyen terme',
    court: 'Moyen terme',
    definition: 'Amélioration, entretien courant, finitions ou désordres stabilisés sans risque immédiat, à surveiller.',
    color: '#68725E',
  },
};

export const PHASES: Record<Phase, { titre: string; detail: string }> = {
  1: { titre: 'Stopper les apports d’eau et sécuriser', detail: 'Toiture, eaux pluviales, purge des éléments dangereux' },
  2: { titre: 'Assainissement et ventilation', detail: 'Drainage des abords, ventilation, dépose des matériaux étanches' },
  3: { titre: 'Séchage et observation', detail: 'Évaporation de l’eau piégée, témoins sur fissures' },
  4: { titre: 'Reconsolidation structurelle', detail: 'Relancis, tirants, chaînages et linteaux' },
  5: { titre: 'Restauration des parements et joints', detail: 'Rejointoiement chaux, enduits minéraux perspirants' },
  6: { titre: 'Aménagements et finitions', detail: 'Isolation biosourcée, badigeons, sols perméables' },
};

/** Explication rédigée de chaque étape, reprise dans la synthèse pour guider le client. */
export const PHASE_GUIDE: Record<Phase, string> = {
  1: 'Tant que l’eau entre dans le bâtiment, toute autre réparation serait compromise. Cette première étape consiste à remettre la couverture et les évacuations d’eau pluviale en bon état et à supprimer tout danger pour les personnes (pierres instables, éléments menaçant de tomber). C’est la dépense la plus rentable du programme : elle arrête l’aggravation des désordres.',
  2: 'Une fois l’eau arrêtée, il faut permettre aux maçonneries de sécher : éloigner l’eau des pieds de murs, rétablir la ventilation naturelle des pièces et des caves, et déposer les matériaux étanches (enduits et joints au ciment, revêtements plastiques) qui piègent l’humidité dans les murs.',
  3: 'Un mur ancien gorgé d’eau met du temps à sécher : de plusieurs semaines à plusieurs mois selon son épaisseur et la saison. Cette période d’attente est essentielle. Elle permet aussi d’observer les fissures équipées de témoins pour savoir si elles évoluent encore, avant de décider des reprises structurelles. Refaire les enduits trop tôt reviendrait à enfermer à nouveau l’humidité.',
  4: 'Lorsque les maçonneries sont saines et les mouvements stabilisés, les éléments de structure peuvent être consolidés : reprise des linteaux, relancis de pierres, pose de tirants, renfort ou remplacement des bois. Ces travaux se font avec des matériaux compatibles avec le bâti ancien.',
  5: 'Les façades et les murs retrouvent ensuite leur protection : rejointoiement au mortier de chaux et enduits minéraux perméables à la vapeur d’eau, qui laissent le mur respirer tout en le protégeant de la pluie.',
  6: 'Les aménagements intérieurs viennent en dernier, sur un bâti sain et sec : isolation perméable à la vapeur d’eau (fibre de bois, chanvre, enduit chaux-chanvre), badigeons de chaux, sols perméables. Engagés trop tôt, ces travaux seraient abîmés par l’humidité résiduelle.',
};

export const DEFAULT_PHASE: Record<Priority, Phase> = { P1: 1, P2: 4, P3: 6 };

export const ZONE_CATEGORIES: Record<ZoneCategory, string> = {
  EXT: 'Extérieurs et abords',
  FAC: 'Façades',
  PC: 'Parties communes et structures verticales',
  RDC: 'Rez-de-chaussée',
  ETG: 'Étages',
  COM: 'Combles, charpente et couverture',
  CAV: 'Cave et sous-sol',
};

export const PATHOLOGIES = [
  'Fissure verticale',
  'Fissure diagonale / en escalier',
  'Fissure horizontale / bombement',
  'Affaissement de linteau',
  'Tassement différentiel',
  'Remontées capillaires',
  'Infiltration',
  'Condensation / confinement',
  'Efflorescences / sels',
  'Gélifraction',
  'Altération de la pierre',
  'Joints ciment bloquants',
  'Décollement d’enduit',
  'Champignon lignivore',
  'Attaque xylophage',
  'Déformation de plancher',
  'Corrosion d’aciers',
  'Autre',
];

export const ELEMENTS = [
  'Mur', 'Pierre', 'Joint', 'Enduit', 'Soubassement', 'Linteau', 'Appui / seuil', 'Plancher',
  'Poutre', 'Charpente', 'Couverture', 'Souche de cheminée', 'Gouttière / descente', 'Voûte', 'Escalier', 'Abords',
];

export const LOTS = [
  'Couverture – zinguerie',
  'Maçonnerie – pierre de taille',
  'Enduits et rejointoiement à la chaux',
  'Charpente – menuiserie bois',
  'Traitement des bois',
  'Voirie et réseaux – drainage',
  'Étaiement – sécurisation',
  'Ventilation',
  'Isolation biosourcée',
  'Finitions intérieures',
  'Études et investigations',
];

export const MESURE_CATEGORIES: Record<MesureCategorie, string> = {
  tirant: 'Tirant provisoire',
  etaiement: 'Étaiement / étrésillonnement',
  purge: 'Purge / dépose',
  perimetre: 'Périmètre de sécurité',
  bachage: 'Bâchage / mise hors d’eau',
  instrumentation: 'Instrumentation / surveillance',
};

export const CONFIDENCE_LABEL = { faible: 'Faible', moyen: 'Moyen', eleve: 'Élevé' } as const;

export const LEGAL_LIMITS =
  "Le présent rapport restitue les observations visuelles réalisées lors de la visite et les analyses formulées à partir des éléments accessibles. Il constitue un document d'aide à la décision et de compréhension du bâti. Il ne remplace pas, lorsque la situation l'exige, une étude géotechnique de sol (G5), une étude de structure avec calculs de charges, des sondages destructifs ciblés ou un diagnostic réglementaire (amiante, plomb, termites, diagnostic de performance énergétique). Les estimations financières fournies constituent des ordres de grandeur indicatifs et ne valent pas devis d'entreprises.";

export const LEGAL_RESERVES =
  "L'inspection porte sur les éléments visibles et accessibles le jour de la visite, sans sondage destructif. Les éléments masqués (fondations enterrées, têtes de poutres encastrées, structures sous doublage) font l'objet de réserves d'usage. Ce document ne constitue ni une étude d'exécution ni un CCTP de marché de travaux.";

/**
 * Limites du diagnostic, renforcées : nature de la mission, ce qu'elle ne couvre pas,
 * valeur des estimations, responsabilité. Texte à faire relire par votre assureur
 * en responsabilité civile professionnelle.
 */
export function limitesMission(type: DeliverableType, ent: { nom: string; assureur?: string; policeAssurance?: string }): { titre: string; texte: string }[] {
  const nom = ent.nom || 'L’Atelier de l’Existant';
  const nature: Record<DeliverableType, string> = {
    avis: 'La mission « Avis sanitaire » est un avis général, établi à partir d’une visite visuelle d’une durée limitée. Elle recense les désordres visibles sans les analyser en détail ni en rechercher toutes les causes, et oriente vers les études complémentaires nécessaires. Elle ne constitue ni un diagnostic structurel, ni une expertise.',
    diagnostic: 'La mission « Diagnostic structurel » analyse les désordres visibles et en recherche les causes probables. Les solutions proposées sont des principes de réparation : elles ne constituent ni une étude d’exécution, ni un dimensionnement, ni un descriptif de travaux, et doivent être validées et détaillées par les entreprises et, le cas échéant, par un bureau d’études structure. Aucune estimation de coût n’est fournie dans le cadre de cette mission.',
    conseil: 'La mission « Diagnostic et conseil » analyse les désordres visibles, en recherche les causes probables et propose une feuille de route des travaux. Les solutions proposées sont des principes de réparation, à valider et détailler par les entreprises et, le cas échéant, par un bureau d’études structure.',
    accompagnement: 'La mission « Accompagnement » est une mission d’assistance au maître d’ouvrage pour la consultation des entreprises, l’analyse des offres et la planification. Elle ne constitue ni une mission de maîtrise d’œuvre (conception, direction et réception des travaux), ni une mission de contrôle technique ou de coordination sécurité. Le choix des entreprises et la signature des marchés relèvent du seul maître d’ouvrage.',
  };
  // Réserves rédigées par Lorine Gratadour (formulations de ses rapports)
  const nota = [
    'Nous rappelons que ces dispositions et constats sont liés aux parties visibles et informations collectées.',
    type === 'avis'
      ? 'Nous vous rappelons que le présent rapport reste un avis, et qu’à ce titre il ne peut être considéré comme un diagnostic exhaustif de l’immeuble ou une pièce contractuelle d’un marché (CCTP).'
      : 'Nous rappelons que les principes de renforcement présents dans ce rapport ne constituent pas un dossier de conception permettant de réaliser un appel d’offres et / ou d’exécuter directement les travaux.',
  ].join(' ');
  const out = [
    { titre: 'Nota', texte: nota },
    { titre: 'Nature de la mission', texte: `${nature[type]} ${nom} est tenue à une obligation de moyens et non de résultat.` },
    { titre: 'Étendue de l’examen', texte: 'L’examen est visuel et non destructif. Il porte sur les parties visibles et accessibles le jour de la visite, sans démontage, sondage, déplacement de mobilier ni accès en hauteur au-delà de ce qui est sans danger. Les éléments cachés ou inaccessibles (fondations, têtes de poutres encastrées, structures sous doublage, réseaux enterrés, couverture non accessible) font l’objet de réserves. Les parties non visitées sont indiquées dans le rapport. Aucun calcul de structure, aucune mesure instrumentée et aucun essai en laboratoire n’ont été réalisés, sauf mention contraire.' },
    { titre: 'Ce que la mission ne couvre pas', texte: 'Le présent document ne remplace pas : une étude géotechnique (missions G1 à G5), une étude de structure par un bureau d’études, une mission de maîtrise d’œuvre ou de contrôle technique, ni les diagnostics réglementaires (amiante, plomb, termites, mérule dans les zones concernées, gaz, électricité, assainissement, performance énergétique, état des risques). Il ne vaut pas expertise judiciaire ou d’assurance et ne se prononce pas sur la conformité aux règles d’urbanisme, ni sur les responsabilités entre parties.' },
    { titre: 'Validité dans le temps', texte: 'Le rapport décrit l’état du bâtiment à la date de la visite. Un bâtiment évolue : de nouveaux désordres peuvent apparaître ou s’aggraver, notamment après des intempéries, des travaux ou un changement d’usage. Les constats ne peuvent être opposés à des évolutions postérieures à la visite.' },
    { titre: 'Informations utilisées', texte: 'Le rapport s’appuie sur les informations fournies par le client (historique, travaux antérieurs, usages), sous sa responsabilité, et sur des données publiques (cadastre, cartes, bases nationales des bâtiments et des risques) données à titre indicatif, qui ne remplacent pas les documents officiels.' },
    ...(type === 'conseil' ? [{ titre: 'Estimations financières', texte: 'Les montants indiqués sont des ordres de grandeur établis à partir de prix moyens constatés. Ils ne valent pas devis d’entreprises, n’engagent pas ' + nom + ' et peuvent varier selon les entreprises, la saison, les quantités réelles et les découvertes en cours de chantier.' }] : []),
    { titre: 'Sécurité et urgence', texte: 'Lorsque le rapport signale un risque pour la sécurité des personnes, il appartient au propriétaire de prendre sans délai les mesures de mise en sécurité nécessaires et, le cas échéant, d’informer les occupants, les voisins et la mairie. La responsabilité de ' + nom + ' ne saurait être engagée en cas de non-respect des préconisations, de travaux réalisés sans suivi adapté, ni pour des désordres non visibles le jour de la visite.' },
    { titre: 'Usage du rapport', texte: 'Le rapport est établi pour le client désigné et pour l’objet indiqué. Il ne peut être utilisé à d’autres fins, transmis à des tiers en vue d’engager la responsabilité de ' + nom + ', ni reproduit partiellement sans son accord. Il reste la propriété intellectuelle de ' + nom + ' jusqu’au paiement complet de la mission.' },
  ];
  if (ent.assureur) out.push({ titre: 'Assurance', texte: `${nom} est assurée en responsabilité civile professionnelle auprès de ${ent.assureur}${ent.policeAssurance ? `, contrat numéro ${ent.policeAssurance}` : ''}.` });
  return out;
}

export const LEGAL_ACCOMPAGNEMENT =
  "Les missions de suivi sont des missions d'accompagnement à la consultation, à la sélection et à la planification ; elles ne constituent pas une mission de maîtrise d'œuvre complète.";

export const NEUTRALITE_ANNUAIRE =
  "Cette liste est fournie à titre indicatif. L'Atelier de l'Existant n'a aucun lien commercial avec les entreprises citées et ne perçoit aucune commission ; le choix final appartient au maître d'ouvrage.";

/** Titre et objet de mission proposés selon le type de livrable. */
/** Objet de mission proposé selon le livrable (le titre de la mission est l’intitulé du livrable). */
export const DEFAULT_MISSION: Record<DeliverableType, { titre: string; objet: string }> = {
  avis: {
    titre: 'Avis sanitaire',
    objet: 'Le maître d’ouvrage s’interroge sur l’état de son bâtiment. La mission consiste en une visite visuelle sur site afin d’identifier les désordres majeurs et les éventuelles urgences, de formuler des hypothèses préliminaires et de donner un avis sur l’opportunité d’engager une étude plus approfondie.',
  },
  diagnostic: {
    titre: 'Diagnostic structurel',
    objet: 'La mission consiste à inspecter de façon approfondie les maçonneries, charpentes, planchers et ouvertures, à localiser et décrire chaque désordre, à en rechercher les causes probables et à formuler des préconisations de principe compatibles avec le bâti ancien, hiérarchisées par priorité.',
  },
  conseil: {
    titre: 'Diagnostic et conseil',
    objet: 'Les propriétaires souhaitent comprendre l’état de leur bâtiment avant d’engager des travaux. La mission comprend le diagnostic structurel complet, puis l’élaboration d’un programme de travaux ordonné, chiffré selon plusieurs scénarios, avec des conseils sur les matériaux et une liste d’artisans qualifiés.',
  },
  accompagnement: {
    titre: 'Accompagnement',
    objet: 'La mission consiste à accompagner le maître d’ouvrage dans la consultation des entreprises : préparation du dossier de consultation, organisation des visites, analyse technique et financière des devis et de leurs exclusions, aide au choix et suivi du planning. Il s’agit d’une mission d’accompagnement à la consultation, à la sélection et à la planification, distincte d’une mission de maîtrise d’œuvre.',
  },
};

/** Familles de désordres : explication de l’origine, reprise dans la synthèse. */
export const FAMILLE_GUIDE: Record<string, { titre: string; texte: string }> = {
  'Eau & humidité': {
    titre: 'L’eau, première cause des désordres',
    texte: 'Dans un bâtiment en pierre, l’eau est le premier facteur de dégradation. Les murs anciens fonctionnent comme des éponges : ils absorbent l’humidité et doivent pouvoir la rendre par évaporation. Lorsque l’eau entre en excès (toiture, gouttières, sol) ou ne peut plus sortir (enduits et joints au ciment, revêtements étanches), elle provoque salpêtre, moisissures, décollements et dégradation de la pierre.',
  },
  'Fissures & structure': {
    titre: 'Les mouvements de la structure',
    texte: 'Les fissures renseignent sur les efforts que subit le bâtiment. Leur orientation et leur évolution permettent de distinguer un mouvement ancien et stabilisé d’un mouvement actif. Une maçonnerie ancienne tolère de petits mouvements grâce à ses joints de chaux ; une fissure ne devient préoccupante que si elle s’ouvre, se déforme ou s’accompagne d’un bombement.',
  },
  'Pierre & enduits': {
    titre: 'Des matériaux de réparation incompatibles',
    texte: 'Une grande partie des dégradations des façades vient de réparations faites au ciment au cours du XXe siècle. Plus dur et plus étanche que la pierre, le ciment bloque l’humidité dans le mur et concentre les dégradations sur la pierre elle-même. Le retour à des mortiers et enduits de chaux est la base de toute restauration durable.',
  },
  Bois: {
    titre: 'L’état des bois de structure',
    texte: 'Les charpentes et planchers en bois sont sensibles à l’humidité et aux insectes. Un bois sec et ventilé peut durer plusieurs siècles ; un bois humide et confiné peut être attaqué par des champignons ou des insectes qui réduisent sa résistance. Les têtes de poutres encastrées dans des murs humides sont les points les plus exposés.',
  },
};

/** Ce qu’il ne faut pas faire, par famille de désordres (référentiel §8). */
export const A_EVITER: Record<string, string[]> = {
  'Eau & humidité': [
    'Injecter de la résine en pied de mur ou poser une membrane plastique sans ventilation : l’humidité remonterait plus haut.',
    'Couler une dalle en béton directement sur terre-plein ou un trottoir en béton contre la façade.',
  ],
  'Fissures & structure': [
    'Reboucher une fissure au ciment ou à la mousse avant d’avoir vérifié qu’elle est stabilisée.',
    'Injecter de la résine polyuréthane dans les murs ou les renforcer par du béton armé lourd.',
  ],
  'Pierre & enduits': [
    'Refaire joints ou enduits au ciment Portland, au ciment prompt ou avec des résines d’étanchéité.',
    'Sabler ou nettoyer la pierre à haute pression.',
  ],
  Bois: [
    'Remplacer systématiquement les poutres par de l’acier sans étude de conservation.',
    'Sceller les têtes de solives au ciment.',
  ],
  tous: [
    'Isoler avec du polystyrène collé ou de la mousse polyuréthane projetée, qui bloquent la vapeur d’eau.',
    'Engager les finitions intérieures avant que les murs aient séché.',
  ],
};

export const REGLE_OR =
  'Toute intervention sur une maçonnerie ancienne doit être mécaniquement plus tendre et plus perméable à la vapeur d’eau que le matériau d’origine sur lequel elle s’applique.';
