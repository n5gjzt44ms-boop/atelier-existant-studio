/**
 * Enrichissement de la bibliothèque (novembre 2026), à partir des documents fournis par L'Atelier de l'Existant :
 * - carte mentale des pathologies de la pierre (causes, phénomènes aggravants, solutions) ;
 * - « Les désordres structurels des bâtiments dans l'architecture traditionnelle méditerranéenne » (C. Díaz Gómez) ;
 * - « Préconiser une méthode de nettoyage d'une façade en maçonnerie de pierre dans le respect du bâti » ;
 * - « Préconiser et valider les techniques de conservation et de restauration du patrimoine bâti » ;
 * - rapports « Technique et estimation – Terre de Liens » et « Analyse d'un bâtiment en vue d'une rénovation performante ».
 *
 * Les textes sont des trames : les « … » se complètent sur place, et toute cause non vérifiée reste une hypothèse.
 */
import type { DesordreTemplate } from './templates';
import type { PreconisationType } from './preconisations';
import type { Guide } from '@/components/guides';

/** Identifiant du lot d'ajouts : sert à les livrer une seule fois dans les bibliothèques déjà enregistrées. */
export const LOT_BIBLIO = 'biblio-2026-11';

const VERIF = ' Hypothèse à vérifier par investigation spécifique.';

export const TEMPLATES_PLUS: DesordreTemplate[] = [
  /* ───────── Pierre & enduits ───────── */
  {
    type: 'Desquamation', famille: 'Pierre & enduits', element: 'Pierre', priorite: 'P2', lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Décollement de la pierre en plaques (squames) de … mm d’épaisseur, parallèles au parement, sur environ … m² (…). Zone concernée : … (assise de rejaillissement / sous un bandeau / partie haute exposée aux pluies battantes).',
    analyse: 'La desquamation traduit des cycles répétés d’humidification et de séchage, souvent aggravés par les sels et par la pollution (dépôt de sulfin). Les causes habituelles sont le rejaillissement en pied de mur, les pluies battantes sur les parties saillantes ou une fuite en partie supérieure (gouttière absente, solin défaillant). Les fientes d’oiseaux accélèrent le phénomène.' + VERIF,
    investigations: 'Repérage de l’origine de l’eau (descentes, solins, rejaillissement, débords de toiture) ; sondage au maillet pour délimiter les zones creuses ; recherche de sels si efflorescences associées.',
    preconisation: 'Supprimer d’abord l’arrivée d’eau (gouttière, protection en plomb ou zinc avec goutte d’eau sur les parties saillantes, éloignement du rejaillissement). Ensuite : purge des plaques non adhérentes, ragréage au mortier de chaux pour les manques peu profonds, remplacement des pierres trop atteintes par des pierres de même nature. Proscrire les ragréages au ciment.',
  },
  {
    type: 'Exfoliation', famille: 'Pierre & enduits', element: 'Pierre', priorite: 'P2', lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Délitement de la pierre en feuillets fins et multiples (« pages de livre ») sur … m², principalement … (lits de pose / arêtes / pierres posées en délit).',
    analyse: 'L’exfoliation est une forme aggravée de la desquamation : l’eau et les sels pénètrent entre les lits de la pierre, souvent parce qu’elle a été posée en délit (lits verticaux) ou qu’elle reste humide longtemps.' + VERIF,
    investigations: 'Vérification du sens de pose des pierres atteintes ; recherche de l’origine de l’humidité ; mesure de la profondeur d’altération.',
    preconisation: 'Mêmes principes que pour la desquamation : traiter la cause de l’humidité, purger les feuillets instables, puis ragréage à la chaux ou remplacement des pierres (repose dans le bon sens du lit). Consolidation ponctuelle possible sur avis spécialisé.',
  },
  {
    type: 'Alvéolisation', famille: 'Pierre & enduits', element: 'Pierre', priorite: 'P2', lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Creusement de la pierre en alvéoles juxtaposées, profondes de … cm, sur … m² (…). Pierres voisines d’un joint ou d’un enduit au ciment : …',
    analyse: 'L’alvéolisation résulte de l’action conjuguée de l’humidité et du vent : l’eau chargée de sels s’évapore en surface et les cristaux désagrègent la pierre. Un enduit ou des joints au ciment, qui concentrent l’évaporation dans la pierre, l’aggravent nettement.' + VERIF,
    investigations: 'Repérage des matériaux bloquants (joints ou enduit ciment) ; recherche de sels ; exposition aux vents dominants.',
    preconisation: 'Purge des joints et enduits au ciment, drainage ou assainissement du pied de mur si l’eau vient du sol, puis ragréage à la chaux des alvéoles peu profondes ou remplacement des pierres trop creusées.',
  },
  {
    type: 'Érosion du parement', famille: 'Pierre & enduits', element: 'Pierre', priorite: 'P3', lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Usure de la surface de la pierre, arêtes et modénatures émoussées sur … (…), perte de matière estimée à … mm. Cause apparente : … (eau et vent / frottements, chocs, nettoyage abrasif ancien).',
    analyse: 'L’érosion peut être naturelle (ruissellement, vent) ou due à l’homme (frottements, sablage ou retaille anciens). Tant que la pierre reste saine en profondeur, elle fait partie de l’histoire de l’édifice.' + VERIF,
    investigations: 'Test de cohésion de la surface (brossage léger, sondage) pour distinguer une simple usure d’une pierre fragilisée.',
    preconisation: 'Si la pierre est saine : ne pas intervenir, conserver la patine (seul un entretien et une bonne gestion de l’eau sont conseillés). Si la structure de la pierre est atteinte : remplacement par une pierre de même nature choisie en amont (couleur, grain, porosité, dureté).',
  },
  {
    type: 'Encrassement / croûte noire', famille: 'Pierre & enduits', element: 'Pierre', priorite: 'P3', lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Dépôts noirs ou gris adhérents sur … m², surtout dans les zones abritées de la pluie (sous les bandeaux, corniches, appuis). Croûte épaisse se détachant par endroits : …',
    analyse: 'La croûte noire (sulfin) se forme par réaction de la pierre calcaire avec la pollution soufrée : elle est imperméable, piège l’humidité et finit par se détacher en entraînant la surface de la pierre. Le calcin, en revanche, est une patine protectrice à préserver.' + VERIF,
    investigations: 'Essais de nettoyage sur une zone de référence acceptée par toutes les parties avant de choisir la méthode ; repérage des pierres fragilisées sous la croûte.',
    preconisation: 'Nettoyage doux et contrôlable après essais sur zone de référence : nébulisation à l’eau, hydrogommage basse pression ou compresses selon la pierre. Proscrire le sablage, l’eau haute pression, la retaille et les produits acides sur les calcaires.',
  },
  {
    type: 'Colonisation biologique (mousses, algues, lichens)', famille: 'Pierre & enduits', element: 'Pierre', priorite: 'P3', lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Présence de … (mousses / algues vertes, rouges ou noires / lichens) sur … m², principalement sur les faces … (nord, nord-ouest, exposées au ruissellement) et sur …',
    analyse: 'Les micro-organismes signalent une humidité durable de la surface. Ils retiennent l’eau et leurs racines ou acides organiques attaquent la pierre ; les lichens incrustés peuvent provoquer une désagrégation superficielle et de petits cratères.' + VERIF,
    investigations: 'Recherche de la source d’humidité (ruissellement, défaut d’écoulement, ombre et absence de ventilation).',
    preconisation: 'Corriger l’arrivée d’eau, puis traitement biocide adapté à la pierre, laissé agir, et brossage doux (brosse nylon ou chiendent) ; renouveler si besoin. Proscrire l’eau haute pression et les produits chlorés.',
  },
  {
    type: 'Végétation dans la maçonnerie', famille: 'Pierre & enduits', element: 'Mur', priorite: 'P2', lot: 'Maçonnerie – pierre de taille', unite: 'forfait',
    constat: 'Plantes … (herbacées / lierre / arbuste) enracinées dans les joints sur …, avec ouverture de joints ou de fissures de … mm.',
    analyse: 'Les racines élargissent les fissures existantes et entretiennent une humidité permanente et des sels dans la maçonnerie, jusqu’à la fragmenter.' + VERIF,
    investigations: 'Vérification de la profondeur des racines et de l’état des joints et des pierres après dégagement.',
    preconisation: 'Coupe puis extraction soignée de la végétation, traitement des racines restantes, puis rejointoiement à la chaux et calfeutrement des fissures ; remplacement des pierres disloquées.',
  },
  {
    type: 'Fientes et salissures d’oiseaux', famille: 'Pierre & enduits', element: 'Pierre', priorite: 'P3', lot: 'Maçonnerie – pierre de taille', unite: 'forfait',
    constat: 'Accumulation de fientes sur … (corniches, appuis, bandeaux), avec taches et altération de surface sur …',
    analyse: 'Les fientes apportent des sels et des acides qui accélèrent la desquamation et favorisent les champignons ; les pigeons griffent aussi la pierre.' + VERIF,
    investigations: '—',
    preconisation: 'Nettoyage doux des dépôts, puis pose de dispositifs anti-pigeons discrets (pics, fils tendus, filets) sur les parties saillantes.',
  },
  {
    type: 'Ragréage ou reprise inadaptée', famille: 'Pierre & enduits', element: 'Pierre', priorite: 'P2', lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Reprises anciennes mal intégrées sur … : … (ragréage au ciment / mortier type « Métalline » / bouchons de matériau différent), avec fissures ou décollement à l’interface et dégradation de la pierre autour.',
    analyse: 'Un ragréage plus dur et moins poreux que la pierre concentre l’humidité et les sels à sa périphérie : la pierre se dégrade autour de la reprise.' + VERIF,
    investigations: 'Sondage pour identifier la nature des reprises et l’état de la pierre derrière.',
    preconisation: 'Purge des reprises inadaptées jusqu’à la pierre saine, puis ragréage au mortier de chaux (armé au-delà de 3 cm d’épaisseur) ou incrustation de pierre de même nature.',
  },
  {
    type: 'Peinture ou revêtement filmogène sur maçonnerie', famille: 'Pierre & enduits', element: 'Mur', priorite: 'P2', lot: 'Enduits et rejointoiement à la chaux', unite: 'm²',
    constat: 'Peinture … (acrylique / pliolite / revêtement plastique) appliquée sur la pierre ou l’enduit, qui cloque, s’écaille et se détache par endroits sur … m².',
    analyse: 'Un revêtement filmogène empêche le mur de sécher : l’humidité s’accumule derrière, fait cloquer la peinture et dégrade la pierre.' + VERIF,
    investigations: 'Essai de décapage sur une petite surface pour choisir le procédé le moins agressif.',
    preconisation: 'Décapage du revêtement (produit adapté appliqué en gel ou gommage doux, après essai), puis finition perméable à la vapeur d’eau : badigeon ou eau forte de chaux, enduit à la chaux, ou peinture minérale.',
  },
  {
    type: 'Graffitis / tags', famille: 'Pierre & enduits', element: 'Mur', priorite: 'P3', lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Inscriptions peintes sur … m² (…).',
    analyse: 'Sur une pierre poreuse, la peinture pénètre en profondeur ; les décapants mal choisis la font migrer encore plus loin.',
    investigations: 'Essai de nettoyage sur une petite surface.',
    preconisation: 'Nettoyage par le procédé le plus doux validé par essai (compresses, gommage doux), puis protection anti-graffiti sacrificielle et perméable à la vapeur d’eau, à renouveler après chaque nettoyage.',
  },
  {
    type: 'Corniche ou bandeau dégradé', famille: 'Pierre & enduits', element: 'Corniche / bandeau', priorite: 'P2', lot: 'Maçonnerie – pierre de taille', unite: 'mètre linéaire',
    constat: 'Corniche / bandeau … (pierre / mortier) présentant … (épaufrures, fissures, éléments déplacés, absence de protection supérieure) sur … ml. Risque de chute d’éléments : …',
    analyse: 'Les parties saillantes reçoivent directement la pluie : sans protection, l’eau stagne sur le dessus, pénètre et fait éclater la pierre (gel, sels).' + VERIF,
    investigations: 'Sondage des éléments (stabilité, fixations), vérification de la pente et de la protection supérieure.',
    preconisation: 'Purge des parties instables (mise en sécurité si risque de chute), restauration de la corniche (ragréage armé à la chaux, incrustation ou remplacement des éléments), puis protection en plomb ou zinc avec goutte d’eau sur le dessus.',
  },

  /* ───────── Eau & humidité ───────── */
  {
    type: 'Appui de fenêtre sans écoulement correct', famille: 'Eau & humidité', element: 'Appui / seuil', priorite: 'P2', lot: 'Maçonnerie – pierre de taille', unite: 'unité',
    constat: 'Appui de la baie … sans pente suffisante ni goutte d’eau, encrassé (mousses) ; traces d’humidité et dégradation de la pierre sous l’appui sur … cm.',
    analyse: 'L’eau stagne sur l’appui puis ruisselle sur la façade et s’infiltre dans le mur sous la baie.' + VERIF,
    investigations: 'Contrôle de la pente, de l’état de la pierre et des joints de l’appui.',
    preconisation: 'Réfection de l’appui avec une pente correcte vers l’extérieur et une goutte d’eau (pierre neuve de même nature, ou ragréage à la chaux et protection en zinc ou plomb), rejointoiement à la chaux.',
  },

  /* ───────── Fissures & structure ───────── */
  {
    type: 'Écrasement de maçonnerie', famille: 'Fissures & structure', element: 'Mur', priorite: 'P1', lot: 'Maçonnerie – pierre de taille', unite: 'm²',
    constat: 'Faisceau de fissures verticales rapprochées en partie basse du mur / des trumeaux entre baies sur … m de hauteur ; joints horizontaux écrasés, pierres fendues verticalement : …',
    analyse: 'Ces fissures suivent les lignes de compression : elles signalent un dépassement de la résistance de la maçonnerie à l’endroit le plus chargé (surcharge, réduction de section par percements, mortier très dégradé). Le danger dépend de la capacité du mur à redistribuer les efforts.' + VERIF,
    investigations: 'Relevé des fissures et de leur évolution (témoins), descente de charges et vérification par un bureau d’études structure, sondages pour l’état des joints et du cœur du mur.',
    preconisation: 'Mise en sécurité (étaiement des planchers) si les fissures sont nombreuses ou évolutives, puis selon étude : réduction des charges, reprise des maçonneries par relancis au mortier de chaux, injection de coulis de chaux, renforcement des trumeaux.',
  },
  {
    type: 'Fissure sous charge ponctuelle', famille: 'Fissures & structure', element: 'Mur', priorite: 'P2', lot: 'Maçonnerie – pierre de taille', unite: 'unité',
    constat: 'Fissures inclinées ou verticales partant de l’appui de … (poutre / poutrelle / sommier) dans le mur …, ouverture ≈ … mm.',
    analyse: 'La charge concentrée d’une poutre dépasse localement la résistance de la maçonnerie sous son appui. La gravité dépend de la possibilité de répartir la charge ; elle est plus grande sur un pilier isolé.' + VERIF,
    investigations: 'Sondage de l’appui de la poutre (état de la tête, présence d’une pierre d’assise), suivi des fissures.',
    preconisation: 'Répartir la charge : pose d’un sommier (pierre ou bois) sous l’appui de la poutre, relancis des pierres fendues au mortier de chaux, renfort selon étude s’il s’agit d’un pilier isolé.',
  },
  {
    type: 'Décollement à la jonction de murs', famille: 'Fissures & structure', element: 'Mur', priorite: 'P2', lot: 'Maçonnerie – pierre de taille', unite: 'mètre linéaire',
    constat: 'Fissure verticale continue à l’angle formé par la façade et le mur de refend / pignon …, sur … m de hauteur, ouverture ≈ … mm ; désaffleurement : …',
    analyse: 'Les deux murs ne portent pas les mêmes charges (l’un reçoit les planchers) et se déforment différemment : ils se désolidarisent, ce qui réduit le monolithisme de l’ensemble et sa tenue au vent.' + VERIF,
    investigations: 'Pose de témoins et suivi ; contrôle du chaînage ou de l’harpage à l’angle ; vérification du sens de portée des planchers.',
    preconisation: 'Une fois le mouvement stabilisé : regarnissage au mortier de chaux et agrafage ou harpage des deux murs ; tirant de liaison si la façade tend à se détacher.',
  },
  {
    type: 'Fissure entre matériaux de rigidités différentes', famille: 'Fissures & structure', element: 'Mur', priorite: 'P3', lot: 'Maçonnerie – pierre de taille', unite: 'mètre linéaire',
    constat: 'Fissures le long des liaisons entre … (pilastres en pierre / brique et remplissage en pisé / moellons), ouverture ≈ … mm.',
    analyse: 'Deux matériaux de rigidités différentes ne se déforment pas de la même façon : ils se séparent le long de leur interface. Ces fissures ont en général peu d’incidence sur la stabilité d’un mur épais.' + VERIF,
    investigations: 'Suivi par témoins pour vérifier qu’elles sont stables.',
    preconisation: 'Si elles sont stables : regarnissage souple au mortier de chaux ou chaux-terre selon le matériau, sans matériau rigide qui reporterait le problème.',
  },
  {
    type: 'Dédoublement du mur (fissuration interne)', famille: 'Fissures & structure', element: 'Mur', priorite: 'P1', lot: 'Étaiement – sécurisation', unite: 'm²',
    constat: 'Parement extérieur se détachant du cœur du mur : son creux au maillet, ventre de … cm, pierres de parement déplacées sur … m².',
    analyse: 'Une surcharge sur un mur au remplissage hétérogène peut provoquer une fissure verticale interne qui partage le mur en deux, réduit sa capacité portante et progresse sans être visible jusqu’à la chute. C’est la forme de rupture la plus dangereuse.' + VERIF,
    investigations: 'Sondages ou carottages pour reconnaître le cœur du mur, relevé de verticalité, étude par un bureau d’études structure à court terme.',
    preconisation: 'Mesures de renforcement à court terme : étaiement, puis injection de coulis de chaux dans les vides, ancrage du parement au cœur du mur (épingles ou tirants) et relancis, selon étude.',
  },
  {
    type: 'Poussée de voûte', famille: 'Fissures & structure', element: 'Voûte', priorite: 'P1', lot: 'Maçonnerie – pierre de taille', unite: 'forfait',
    constat: 'Voûte … (berceau / arêtes / voûtains) présentant une fissure longitudinale à la clé ou aux reins sur … m ; déversement des murs porteurs ≈ … cm.',
    analyse: 'La voûte pousse sur ses appuis ; si les murs ou les contreforts ne compensent pas cette poussée (murs qui s’écartent, fondations qui bougent), la voûte se décomprime et fissure.' + VERIF,
    investigations: 'Relevé géométrique de la voûte et de la verticalité des murs, suivi des fissures, étude par un bureau d’études structure.',
    preconisation: 'Selon étude : tirants pour reprendre la poussée, contrefort ou buttée, injection de coulis de chaux et regarnissage des joints de la voûte. Étaiement provisoire si la voûte est très déformée.',
  },
  {
    type: 'Fente de poutre', famille: 'Bois', element: 'Poutre', priorite: 'P3', lot: 'Charpente – menuiserie bois', unite: 'unité',
    constat: 'Fente longitudinale sur la poutre / solive … , longueur ≈ … m, ouverture ≈ … mm, … (dans le fil du bois / oblique, au droit d’un appui ou d’une charge).',
    analyse: 'La plupart des fentes viennent du séchage du bois ou des variations d’humidité et sont sans gravité. Une fente oblique, au milieu de la portée ou près d’un appui, peut au contraire annoncer une rupture mécanique.' + VERIF,
    investigations: 'Observation de l’orientation et de l’évolution de la fente, mesure de la flèche, avis d’un charpentier ou d’un bureau d’études si fente d’origine mécanique.',
    preconisation: 'Fente de retrait : surveillance simple. Fente d’origine mécanique : renfort de la pièce (moisage, frettage, prothèse) ou remplacement selon étude ; réduire les charges dans l’attente.',
  },
  {
    type: 'Dégradation du pan de bois', famille: 'Bois', element: 'Pan de bois', priorite: 'P2', lot: 'Charpente – menuiserie bois', unite: 'm²',
    constat: 'Pan de bois … : pièces pourries ou attaquées (…), assemblages déboîtés, remplissages … (torchis / brique / plâtre) fissurés ou manquants, déformation ≈ … cm.',
    analyse: 'Dans un pan de bois, ce sont les pièces de bois qui portent ; les remplissages les maintiennent. Sans entretien, le bois se dégrade (eau, insectes) et la capacité portante diminue progressivement.' + VERIF,
    investigations: 'Sondage des pièces (pourriture, insectes), relevé des déformations, vérification des pieds de poteaux et de la sablière basse.',
    preconisation: 'Reprise des bois dégradés (greffes, remplacement de pièces), ferrures de liaison aux angles si nécessaire, réfection des remplissages en matériaux compatibles (torchis, chaux-chanvre) ; protection par essentage ventilé sur les faces très exposées.',
  },

  /* ───────── Autres (rénovation) ───────── */
  {
    type: 'Absence ou insuffisance d’isolation', famille: 'Autres', element: 'Mur', priorite: 'P3', lot: 'Isolation biosourcée', unite: 'm²',
    constat: 'Parois … (murs / rampants / combles / plancher bas) sans isolation ou avec un isolant insuffisant (… cm de …) sur … m².',
    analyse: 'Les déperditions de chaleur sont importantes et la sensation de paroi froide nuit au confort. Dans un bâti ancien, l’isolation doit rester perméable à la vapeur d’eau pour ne pas piéger l’humidité dans les murs.',
    investigations: 'Relevé des compositions de parois, éventuellement calcul thermique (besoins de chauffage avant / après travaux).',
    preconisation: 'Isolation avec des matériaux perspirants (laine de bois, ouate de cellulose, chaux-chanvre) associés à un frein-vapeur hygrovariable ; pour la toiture, isolation par l’extérieur (sarking) si la couverture est refaite.',
  },
  {
    type: 'Menuiseries vétustes ou non étanches', famille: 'Autres', element: 'Menuiserie', priorite: 'P3', lot: 'Menuiseries extérieures', unite: 'unité',
    constat: 'Menuiseries … (bois simple vitrage / double vitrage ancien) en mauvais état : … (bois dégradé, jeu, absence de joints), infiltrations d’air.',
    analyse: 'Les menuiseries non étanches provoquent des déperditions et de l’inconfort ; leur remplacement modifie aussi le renouvellement d’air du logement.',
    investigations: 'Inventaire des menuiseries et de leur état ; vérification des contraintes patrimoniales (secteur ABF).',
    preconisation: 'Restauration des menuiseries récupérables (reprise des bois, joints, survitrage) ou remplacement par des menuiseries performantes (Uw ≤ 1,4 W/m².K) respectant le dessin d’origine ; prévoir des entrées d’air pour la ventilation.',
  },
  {
    type: 'Installation électrique vétuste', famille: 'Autres', element: 'Réseaux', priorite: 'P1', lot: 'Électricité', unite: 'forfait',
    constat: 'Installation électrique non conforme : … (fils apparents non protégés, absence de tableau ou de terre, dominos dans les boîtes, réseaux en façade).',
    analyse: 'Risque pour la sécurité des occupants ; les percements successifs des réseaux en façade fragilisent aussi la pierre et laissent entrer l’humidité.',
    investigations: 'Diagnostic électrique par un professionnel.',
    preconisation: 'Dépose du réseau existant et installation neuve depuis le tableau, encastrée, conforme aux normes, avec certificat Consuel ; regroupement et mise en sécurité des réseaux apparents en façade.',
  },
];

export const PRECOS_PLUS: PreconisationType[] = [
  /* Nettoyage de façade */
  { id: 'nettoyage-zone-reference', titre: 'Essais et zone de référence de nettoyage', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Encrassement / croûte noire', 'Colonisation biologique (mousses, algues, lichens)'],
    texte: 'Avant tout nettoyage : examen de la façade (nature des pierres, état de conservation, types de salissures), essais de plusieurs méthodes sur de petites surfaces, puis constitution d’une zone de référence acceptée par le propriétaire, l’entreprise et le maître d’œuvre. Elle fixe le résultat attendu pour toute la façade.' },
  { id: 'nettoyage-nebulisation', titre: 'Nettoyage par nébulisation', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Encrassement / croûte noire'],
    texte: 'Nettoyage par brouillard d’eau à très basse pression (rampes de micro-asperseurs), qui ramollit les salissures et les croûtes sans choc pour la pierre, complété par un brossage doux. À éviter par temps de gel et sur les pierres très altérées.' },
  { id: 'nettoyage-hydrogommage', titre: 'Hydrogommage basse pression', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Encrassement / croûte noire', 'Peinture ou revêtement filmogène sur maçonnerie'],
    texte: 'Projection sous très faible pression (0,1 à 2,5 bars) de poudres fines (30 à 100 microns) sous un léger brouillard d’eau, après essais pour choisir la poudre et la pression. Méthode polyvalente, adaptée aux parements comme aux modénatures. Non utilisable sur les pierres peintes ou polychromes.' },
  { id: 'nettoyage-neutre', titre: 'Nettoyage au savon neutre et brossage doux', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Encrassement / croûte noire'],
    texte: 'Nettoyage au produit à pH neutre (tensioactif non ionique) et brossage doux à la brosse nylon ou en chiendent, rinçage à l’eau claire. Non agressif et totalement contrôlable, adapté aux encrassements légers.' },
  { id: 'nettoyage-cataplasme', titre: 'Nettoyage par cataplasme humide', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Encrassement / croûte noire', 'Efflorescences / sels'],
    texte: 'Cataplasme maintenu humide sur le parement (laine de roche ou compresses), qui ramollit les salissures et retire une grande partie des sels sans ruissellement ni infiltration ; élimination par simple rinçage et brossage doux. Compatible avec toutes les pierres.' },
  { id: 'nettoyage-laser', titre: 'Nettoyage laser des éléments sculptés', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Encrassement / croûte noire'],
    texte: 'Pour les sculptures et décors fragiles : nettoyage par laser, très précis, sans eau ni abrasif ni produit, qui conserve l’épiderme de la pierre. Réservé aux petites surfaces (coût élevé), par un opérateur spécialisé.' },
  { id: 'nettoyage-proscrits', titre: 'Méthodes de nettoyage à proscrire', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Encrassement / croûte noire'],
    texte: 'Proscrire sur la pierre ancienne : la retaille du parement et le ponçage, le sablage à sec et l’hydrosablage, l’eau à haute pression ou la vapeur, et les produits acides sur les calcaires. Ces procédés enlèvent le calcin, émoussent les modénatures et accélèrent les dégradations.' },

  /* Conservation et restauration de la pierre */
  { id: 'consolidation-pierre', titre: 'Consolidation de la pierre', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Desquamation', 'Exfoliation', 'Altération de la pierre'],
    texte: 'Consolidation des pierres fragilisées avant nettoyage ou reprise : imprégnation jusqu’à refus d’un consolidant compatible (silicate d’éthyle, ou eau de chaux pour les calcaires), en concentrations progressives. Produit perméable à la vapeur d’eau, sans sels solubles, après essai sur une petite surface.' },
  { id: 'ragreage-arme', titre: 'Ragréage armé à la chaux (manques profonds)', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Ragréage ou reprise inadaptée', 'Corniche ou bandeau dégradé', 'Desquamation'],
    texte: 'Purge jusqu’à la pierre saine, puis ragréage au mortier de chaux teinté dans la masse. Au-delà de 3 cm d’épaisseur, armature en goujons de fibre de verre et grille synthétique ; respect des joints existants. Proscrire les mortiers au ciment ou à l’oxyde de zinc.' },
  { id: 'incrustation-pierre', titre: 'Incrustation de pierre (bouchon)', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Ragréage ou reprise inadaptée', 'Corniche ou bandeau dégradé', 'Altération de la pierre'],
    texte: 'Lorsque seule une partie de la pierre ou d’une moulure est altérée : refouillement de la partie dégradée et remplacement par une pièce de pierre de même nature, scellée et goujonnée, taillée à l’outil d’origine.' },
  { id: 'purge-reprises', titre: 'Purge des reprises au ciment', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Ragréage ou reprise inadaptée', 'Alvéolisation', 'Joints ciment bloquants'],
    texte: 'Dépose soignée des ragréages, bouchons et joints au ciment, à la main ou au petit outillage, sans entamer la pierre saine, avant reprise à la chaux.' },
  { id: 'decapage-filmogene', titre: 'Décapage d’un revêtement filmogène', famille: 'Pierre & enduits', lot: 'Enduits et rejointoiement à la chaux', pour: ['Peinture ou revêtement filmogène sur maçonnerie'],
    texte: 'Décapage de la peinture ou du revêtement plastique après essai : produit alcalin en gel appliqué sur support sec puis rincé, ou gommage doux. Finition ensuite perméable à la vapeur d’eau (badigeon, eau forte de chaux, enduit à la chaux ou peinture minérale).' },
  { id: 'biocide', titre: 'Traitement biocide et brossage doux', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Colonisation biologique (mousses, algues, lichens)'],
    texte: 'Après correction de l’humidité : application d’un biocide compatible avec la pierre, temps d’action, puis brossage doux et rinçage à basse pression ; renouvellement si nécessaire. Proscrire les produits chlorés et l’eau haute pression.' },
  { id: 'devegetalisation', titre: 'Dévégétalisation de la maçonnerie', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Végétation dans la maçonnerie'],
    texte: 'Coupe de la végétation, extraction soignée des racines, traitement des souches restantes, puis rejointoiement à la chaux et calfeutrement des fissures ouvertes.' },
  { id: 'anti-pigeons', titre: 'Protection contre les pigeons', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Fientes et salissures d’oiseaux'],
    texte: 'Nettoyage doux des fientes puis pose de dispositifs discrets (pics, fils tendus, filets) sur les corniches, appuis et bandeaux.' },
  { id: 'anti-graffiti', titre: 'Protection anti-graffiti sacrificielle', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Graffitis / tags'],
    texte: 'Application d’une protection anti-graffiti sacrificielle (à base de polysaccharides), perméable à la vapeur d’eau, qui s’élimine avec les tags lors du nettoyage et se renouvelle ensuite. Éviter les vernis permanents imperméables ; à défaut, laisser 10 à 15 cm non traités en pied de mur.' },
  { id: 'hydrofuge', titre: 'Hydrofuge microporeux (préventif)', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille',
    texte: 'Seulement après restauration et si l’exposition le justifie : hydrofuge microporeux qui limite l’entrée de l’eau liquide tout en laissant passer la vapeur. Jamais sur un mur humide ou chargé de sels ; proscrire les produits imperméables.' },
  { id: 'protection-saillies', titre: 'Protection plomb ou zinc des parties saillantes', famille: 'Eau & humidité', lot: 'Couverture – zinguerie', pour: ['Desquamation', 'Corniche ou bandeau dégradé', 'Exfoliation'],
    texte: 'Pose d’une protection en plomb ou en zinc sur le dessus des corniches, bandeaux et appuis, avec pente et goutte d’eau, pour éloigner l’eau de pluie du parement.' },
  { id: 'appui-reprise', titre: 'Réfection des appuis de fenêtre', famille: 'Eau & humidité', lot: 'Maçonnerie – pierre de taille', pour: ['Appui de fenêtre sans écoulement correct'],
    texte: 'Réfection des appuis avec une pente vers l’extérieur et une goutte d’eau : remplacement par une pierre de même nature, ou ragréage à la chaux complété d’une bavette en zinc ; rejointoiement à la chaux.' },
  { id: 'corniche-restauration', titre: 'Restauration de la corniche', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille', pour: ['Corniche ou bandeau dégradé'],
    texte: 'Mise en sécurité des éléments instables, puis restauration de la corniche : ragréage armé, incrustations ou remplacement des pierres, rejointoiement à la chaux et protection supérieure en plomb ou zinc.' },
  { id: 'barbacanes', titre: 'Ventilation du pied de mur (barbacanes)', famille: 'Eau & humidité', lot: 'Maçonnerie – pierre de taille', pour: ['Remontées capillaires'],
    texte: 'Ventilation du bas des maçonneries par des barbacanes, couplée à un drainage périphérique, pour laisser sécher le pied de mur sans le bloquer.' },
  { id: 'ravalement-respectueux', titre: 'Ravalement respectueux du bâti ancien', famille: 'Pierre & enduits', lot: 'Maçonnerie – pierre de taille',
    texte: 'Ravalement complet comprenant : nettoyage doux (brossage ou nébulisation basse pression), purge et remplacement ponctuel des pierres trop dégradées par des pierres de même nature, reprise des joints au mortier de chaux, réfection des appuis avec pente et goutte d’eau, restauration de la corniche et mise en sécurité des réseaux apparents. Déclaration préalable en secteur protégé.' },

  /* Structure */
  { id: 'sommier', titre: 'Sommier de répartition sous appui de poutre', famille: 'Fissures & structure', lot: 'Maçonnerie – pierre de taille', pour: ['Fissure sous charge ponctuelle'],
    texte: 'Étaiement de la poutre, pose d’un sommier en pierre dure ou en bois sous son appui pour répartir la charge, puis relancis des pierres fendues au mortier de chaux.' },
  { id: 'harpage', titre: 'Agrafage et harpage de deux murs', famille: 'Fissures & structure', lot: 'Maçonnerie – pierre de taille', pour: ['Décollement à la jonction de murs'],
    texte: 'Après stabilisation : regarnissage de la fissure au mortier de chaux et liaison des deux murs par harpage (pierres traversantes) ou agrafes inox ; tirant si la façade tend à se détacher.' },
  { id: 'contrefort', titre: 'Reprise de la poussée d’une voûte', famille: 'Fissures & structure', lot: 'Maçonnerie – pierre de taille', pour: ['Poussée de voûte'],
    texte: 'Selon étude structure : tirants pour reprendre la poussée, ou contrefort / buttée, puis injection de coulis de chaux et regarnissage des joints de la voûte.' },
  { id: 'epinglage', titre: 'Épinglage du parement au cœur du mur', famille: 'Fissures & structure', lot: 'Maçonnerie – pierre de taille', pour: ['Dédoublement du mur (fissuration interne)', 'Fissure horizontale / bombement'],
    texte: 'Après étaiement : injection de coulis de chaux dans les vides et ancrage du parement au cœur du mur par épingles inox ou fibre de verre scellées à la chaux, puis relancis.' },
  { id: 'pan-de-bois', titre: 'Restauration du pan de bois', famille: 'Bois', lot: 'Charpente – menuiserie bois', pour: ['Dégradation du pan de bois'],
    texte: 'Reprise partielle des bois (greffes, remplacement des pièces dégradées), ferrures de liaison aux poteaux d’angle si nécessaire, réfection des remplissages en torchis ou chaux-chanvre.' },
  { id: 'essentage', titre: 'Essentage ventilé d’un pignon exposé', famille: 'Bois', lot: 'Couverture – zinguerie', pour: ['Dégradation du pan de bois'],
    texte: 'Protection d’un pignon très exposé par un essentage ventilé (ardoise ou bardeaux de bois) sur tasseaux, qui laisse le mur sécher.' },
  { id: 'fente-renfort', titre: 'Renfort d’une poutre fendue', famille: 'Bois', lot: 'Charpente – menuiserie bois', pour: ['Fente de poutre'],
    texte: 'Si la fente est d’origine mécanique : moisage, frettage ou prothèse bois, ou remplacement de la pièce selon avis d’un bureau d’études ; simple surveillance pour une fente de retrait.' },

  /* Rénovation */
  { id: 'sarking', titre: 'Isolation de toiture par l’extérieur (sarking)', famille: 'Autres', lot: 'Isolation biosourcée', pour: ['Absence ou insuffisance d’isolation'],
    texte: 'Lors de la réfection de la couverture : isolation par-dessus les chevrons en panneaux rigides de laine de bois haute densité (200 à 240 mm), écran de sous-toiture HPV. Bon confort d’été, sans perte de volume intérieur.' },
  { id: 'iti-perspirante', titre: 'Isolation intérieure perspirante', famille: 'Autres', lot: 'Isolation biosourcée', pour: ['Absence ou insuffisance d’isolation'],
    texte: 'Isolation des murs anciens par l’intérieur avec un isolant perméable à la vapeur (laine de bois, ouate de cellulose ou chaux-chanvre) et un frein-vapeur hygrovariable, sans enduit ni doublage étanche, pour éviter la condensation dans le mur.' },
  { id: 'menuiseries', titre: 'Restauration ou remplacement des menuiseries', famille: 'Autres', lot: 'Menuiseries extérieures', pour: ['Menuiseries vétustes ou non étanches'],
    texte: 'Restauration des menuiseries récupérables, ou remplacement par des menuiseries performantes (Uw ≤ 1,4 W/m².K) respectant le dessin et les matériaux d’origine, avec entrées d’air pour la ventilation.' },
  { id: 'electricite', titre: 'Mise aux normes de l’installation électrique', famille: 'Autres', lot: 'Électricité', pour: ['Installation électrique vétuste'],
    texte: 'Dépose du réseau existant et installation neuve encastrée depuis le tableau, conforme aux normes, avec certificat Consuel ; regroupement des réseaux en façade.' },
];

export const GUIDES_PLUS: Guide[] = [
  {
    id: 'nettoyage-pierre', titre: 'Nettoyer une façade en pierre sans l’abîmer',
    accroche: 'Le meilleur nettoyage est le plus doux qui donne un résultat acceptable.',
    principe: 'Le nettoyage est irréversible : un procédé trop agressif enlève le calcin, la couche protectrice formée naturellement à la surface de la pierre, émousse les moulures et accélère les dégradations. On choisit donc la méthode après des essais sur de petites surfaces, et on fixe le résultat attendu sur une zone de référence acceptée par tous.',
    faire: ['Faire des essais et valider une zone de référence avant de nettoyer toute la façade', 'Privilégier la nébulisation, l’hydrogommage basse pression ou les compresses', 'Consolider les pierres fragiles avant de les nettoyer', 'Traiter d’abord la cause des salissures (ruissellement, défaut d’écoulement)'],
    eviter: ['Le sablage, l’hydrosablage et l’eau à haute pression', 'Les produits acides sur les pierres calcaires', 'La retaille du parement et les ponceuses', 'Nettoyer par temps de gel'],
    entretien: ['Surveiller les zones de ruissellement et les appuis', 'Brosser doucement les dépôts avant qu’ils ne durcissent'],
    motsCles: 'pierre|tuffeau|calcaire|façade|ravalement|nettoyage',
  },
  {
    id: 'conserver-pierre', titre: 'Conserver plutôt que remplacer la pierre',
    accroche: 'Chaque pierre d’origine conservée garde l’authenticité de la façade.',
    principe: 'Avant de remplacer une pierre, on cherche à la conserver : consolidation, ragréage à la chaux, incrustation d’une pièce sur la seule partie abîmée. Quand le remplacement est nécessaire, la nouvelle pierre doit ressembler à l’ancienne par sa nature, sa porosité, sa dureté et son aspect, sinon elle crée de nouveaux désordres autour d’elle.',
    faire: ['Purger jusqu’à la pierre saine avant toute reprise', 'Ragréer à la chaux, avec une armature au-delà de 3 cm', 'Choisir une pierre de remplacement de même nature et de même porosité', 'Tailler la pierre neuve à l’outil d’origine'],
    eviter: ['Les ragréages au ciment ou aux mortiers type « Métalline »', 'Les consolidants ou hydrofuges imperméables', 'Multiplier les petites reprises de matériaux différents'],
    entretien: ['Contrôler les reprises après chaque hiver', 'Garder une réserve de pierre identique pour les futures réparations'],
    motsCles: 'pierre|tuffeau|calcaire|grès|corniche|modénature',
  },
];

export const ELEMENTS_PLUS = ['Corniche / bandeau', 'Pan de bois', 'Menuiserie', 'Réseaux', 'Balcon / garde-corps', 'Pignon', 'Trumeau', 'Chaîne d’angle'];
export const LOTS_PLUS = ['Menuiseries extérieures', 'Électricité'];
