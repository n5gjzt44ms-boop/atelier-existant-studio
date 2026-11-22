/**
 * Bibliothèque de préconisations types — au même niveau que les désordres types.
 * Chaque préconisation peut être insérée dans une fiche (texte de préconisation)
 * ou ajoutée comme solution (Diagnostic structurel : plusieurs solutions par désordre).
 * `pour` liste les désordres types auxquels elle est proposée en priorité.
 */
export interface PreconisationType {
  id: string;
  titre: string;
  famille: 'Fissures & structure' | 'Eau & humidité' | 'Pierre & enduits' | 'Bois' | 'Autres' | 'À catégoriser';
  lot: string;
  /** Plusieurs corps d'état (le premier = « lot ») */
  lots?: string[];
  texte: string;
  pour?: string[];
  prixId?: string;
  categorie?: string; // rangement par nature d'intervention (sinon déduit du titre)
  alias?: string[]; // anciens titres (doublons fusionnés)
}

export const PRECONISATIONS: PreconisationType[] = [
  /* Eau & humidité */
  { id: 'couverture-revision', titre: 'Révision de la couverture', famille: 'Eau & humidité', lot: 'Couverture – zinguerie', prixId: 'couv-revision', pour: ['Infiltration'],
    texte: 'Révision complète de la couverture : remplacement des tuiles cassées ou déplacées, reprise des faîtages et des rives au mortier de chaux, vérification des solins et des noues.' },
  { id: 'zinguerie', titre: 'Reprise des gouttières et descentes', famille: 'Eau & humidité', lot: 'Couverture – zinguerie', prixId: 'gouttiere', pour: ['Infiltration'],
    texte: 'Remplacement ou réparation des gouttières, chéneaux et descentes ; raccordement des descentes à un réseau d’évacuation éloignant l’eau du pied des murs.' },
  { id: 'drain', titre: 'Drainage périphérique ventilé', famille: 'Eau & humidité', lot: 'Voirie et réseaux – drainage', prixId: 'drain', pour: ['Remontées capillaires'],
    texte: 'Tranchée drainante le long du mur à au moins 50 cm de la fondation, drain posé sur lit de gravier, géotextile, regard de visite et exutoire ; surface laissée perméable.' },
  { id: 'abords-permeables', titre: 'Rendre les abords perméables', famille: 'Eau & humidité', lot: 'Voirie et réseaux – drainage', pour: ['Remontées capillaires', 'Efflorescences / sels'],
    texte: 'Dépose du trottoir béton ou de l’enrobé collé au mur et remplacement par un revêtement drainant (gravier, pavés sur sable) avec une pente éloignant l’eau du bâtiment.' },
  { id: 'piquage-enduit-ciment', titre: 'Piquage de l’enduit ciment et enduit chaux', famille: 'Eau & humidité', lot: 'Enduits et rejointoiement à la chaux', prixId: 'enduit-chaux', pour: ['Remontées capillaires', 'Joints ciment bloquants', 'Efflorescences / sels'],
    texte: 'Piquage soigné de l’enduit ciment jusqu’à la maçonnerie, séchage du mur, puis enduit à la chaux naturelle en trois couches (gobetis, corps d’enduit, finition), perméable à la vapeur d’eau.' },
  { id: 'ventilation', titre: 'Ventilation des pièces humides', famille: 'Eau & humidité', lot: 'Ventilation', pour: ['Condensation / confinement'],
    texte: 'Création d’entrées d’air et d’une extraction (ventilation hygroréglable ou insufflation douce), suppression des doublages étanches et des peintures filmogènes.' },
  { id: 'enduit-correcteur', titre: 'Enduit correcteur chaux-chanvre', famille: 'Eau & humidité', lot: 'Enduits et rejointoiement à la chaux', pour: ['Condensation / confinement', 'Remontées capillaires'],
    texte: 'Enduit intérieur chaux-chanvre de 3 à 5 cm, qui régule l’humidité, supprime l’effet de paroi froide et laisse le mur respirer.' },
  { id: 'dessalement', titre: 'Dessalement par compresses', famille: 'Eau & humidité', lot: 'Maçonnerie – pierre de taille', pour: ['Efflorescences / sels'],
    texte: 'Après suppression de la source d’eau : brossage à sec, compresses de dessalement (pâte de cellulose) renouvelées jusqu’à baisse des sels, puis enduit de sacrifice à la chaux.' },

  /* Pierre & enduits */
  { id: 'rejointoiement', titre: 'Rejointoiement à la chaux', famille: 'Pierre & enduits', lot: 'Enduits et rejointoiement à la chaux', prixId: 'rejointoiement', pour: ['Joints ciment bloquants', 'Décollement d’enduit'],
    texte: 'Dégarnissage des joints sur 2 à 3 cm (à la main, sans disqueuse sur la pierre), dépoussiérage, humidification puis rejointoiement au mortier de chaux naturelle NHL 2 et sable local, joint légèrement en retrait ou beurré à fleur.' },
  { id: 'relancis', titre: 'Remplacement de pierres (relancis)', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Altération de la pierre', 'Gélifraction'],
    texte: 'Dépose des pierres trop altérées et remplacement par des pierres de même nature et de même dureté, posées au mortier de chaux ; conservation des pierres simplement patinées.' },
  { id: 'ragreage-chaux', titre: 'Ragréage à la chaux (pierre altérée)', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Altération de la pierre'],
    texte: 'Purge des parties friables et ragréage au mortier de chaux teinté dans la masse (poudre de pierre), en couches fines armées si besoin ; alternative économique au remplacement.' },
  { id: 'badigeon', titre: 'Badigeon ou eau forte de chaux', famille: 'Pierre & enduits', lot: 'Enduits et rejointoiement à la chaux',
    texte: 'Protection des parements et des enduits par un badigeon de chaux aérienne en plusieurs passes, qui consolide la surface et unifie l’aspect sans bloquer la vapeur d’eau.' },

  /* Fissures & structure */
  { id: 'temoins', titre: 'Pose de témoins et suivi', famille: 'Fissures & structure', lot: 'Études et investigations', pour: ['Fissure verticale', 'Fissure diagonale / en escalier'],
    texte: 'Pose de témoins (jauges graduées) de part et d’autre de la fissure et relevé tous les trois mois pendant six à douze mois, pour savoir si le mouvement est actif avant toute réparation.' },
  { id: 'regarnissage', titre: 'Regarnissage et agrafage de la fissure', famille: 'Fissures & structure', lot: 'Maçonnerie – pierre de taille', prixId: 'fissure-regarnissage', pour: ['Fissure verticale', 'Fissure diagonale / en escalier'],
    texte: 'Une fois le mouvement stabilisé : purge, regarnissage au mortier de chaux, agrafes inox scellées à la chaux tous les 40 à 60 cm, et relancis des pierres fendues.' },
  { id: 'tirant', titre: 'Tirant métallique avec ancres', famille: 'Fissures & structure', lot: 'Maçonnerie – pierre de taille', prixId: 'tirant', pour: ['Fissure horizontale / bombement', 'Fissure verticale'],
    texte: 'Pose de tirants métalliques traversants avec ancres apparentes (croix de Saint-André, platines), mis en légère tension, pour ceinturer les murs et reprendre la poussée.' },
  { id: 'coulis', titre: 'Injection de coulis de chaux', famille: 'Fissures & structure', lot: 'Maçonnerie – pierre de taille', pour: ['Fissure horizontale / bombement', 'Déformation de plancher'],
    texte: 'Consolidation du cœur de mur par injection gravitaire de coulis de chaux aérienne ou hydraulique naturelle dans les vides, en remontant par passes successives.' },
  { id: 'linteau-remplacement', titre: 'Remplacement du linteau', famille: 'Fissures & structure', lot: 'Maçonnerie – pierre de taille', prixId: 'linteau', pour: ['Affaissement de linteau'],
    texte: 'Étaiement de la baie, dépose du linteau défaillant et remplacement par un linteau en chêne sec ou en pierre de section adaptée, reprise des maçonneries au mortier de chaux.' },
  { id: 'etude-g5', titre: 'Étude géotechnique avant travaux', famille: 'Fissures & structure', lot: 'Études et investigations', prixId: 'g5', pour: ['Fissure diagonale / en escalier', 'Tassement différentiel'],
    texte: 'Étude géotechnique de diagnostic (mission G5) pour caractériser le sol et la fondation avant toute reprise en sous-œuvre.' },
  { id: 'bet', titre: 'Étude par un bureau d’études structure', famille: 'Fissures & structure', lot: 'Études et investigations',
    texte: 'Note de calcul et plans de renforcement par un bureau d’études structure habitué au bâti ancien, avant consultation des entreprises.' },

  /* Bois */
  { id: 'traitement-bois', titre: 'Traitement curatif des bois', famille: 'Bois', lot: 'Charpente et traitement des bois', prixId: 'traitement-bois', pour: ['Attaque xylophage'],
    texte: 'Bûchage des parties vermoulues, traitement curatif par injection et pulvérisation d’un produit certifié, par une entreprise qualifiée ; vérification préalable de la section résiduelle.' },
  { id: 'greffe-bois', titre: 'Greffe ou moisage de la pièce de bois', famille: 'Bois', lot: 'Charpente et traitement des bois', pour: ['Attaque xylophage', 'Champignon lignivore'],
    texte: 'Conservation de la pièce : greffe d’un bois neuf de même essence assemblé à trait de Jupiter, ou moisage par deux pièces latérales boulonnées, plutôt qu’un remplacement complet.' },
  { id: 'tete-poutre', titre: 'Assainissement des têtes de poutres', famille: 'Bois', lot: 'Charpente et traitement des bois', pour: ['Champignon lignivore'],
    texte: 'Dégagement des têtes de poutres encastrées, purge des parties pourries, prothèse ou étrier métallique, et ventilation de l’about (vide d’air autour du bois, sans mortier ciment au contact).' },
  { id: 'merule', titre: 'Traitement de la mérule', famille: 'Bois', lot: 'Charpente et traitement des bois', pour: ['Champignon lignivore'],
    texte: 'Suppression de la source d’humidité, dépose des bois atteints sur un mètre au-delà de la zone visible, traitement des maçonneries par une entreprise spécialisée. Déclaration en mairie obligatoire.' },

  { id: 'plancher-renfort', titre: 'Renforcement du plancher bois', famille: 'Fissures & structure', lot: 'Charpente et traitement des bois', pour: ['Déformation de plancher'],
    texte: 'Après vérification des appuis et des sections : ajout de solives intermédiaires, moisage des solives fléchies ou pose d’une poutre de reprise sur poteaux, sans chape béton lourde.' },
  { id: 'aciers', titre: 'Traitement des aciers corrodés', famille: 'Fissures & structure', lot: 'Maçonnerie – pierre de taille', pour: ['Corrosion d’aciers'],
    texte: 'Dégagement des aciers corrodés, brossage, passivation ou remplacement par de l’inox, puis reconstitution au mortier de chaux adapté ; suppression des scellements ciment éclatés.' },

  /* Autres */
  { id: 'securisation', titre: 'Mise en sécurité immédiate', famille: 'Autres', lot: 'Maçonnerie – pierre de taille',
    texte: 'Périmètre de sécurité, purge des éléments instables et étaiement provisoire dans l’attente des travaux de consolidation.' },
  { id: 'entretien', titre: 'Surveillance et entretien courant', famille: 'Autres', lot: 'Entretien',
    texte: 'Surveillance annuelle de l’ouvrage, nettoyage des évacuations d’eau et petites reprises au mortier de chaux au fil de l’eau.' },
];
