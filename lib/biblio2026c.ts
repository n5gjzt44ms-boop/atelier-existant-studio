/**
 * Bibliothèque tirée des rapports rédigés par Lorine Gratadour (avis structurels visuels 25-1016, 25-1065, 25-1079 ;
 * diagnostics structure 23-1080, 24-3191, 25-1047 ; analyse du bâti pour une rénovation performante).
 * Formulations reprises de ses documents : constats « Nous avons relevé… », préconisations « Nous préconisons… »
 * en listes (les lignes « - » deviennent des puces dans le rapport, et une ligne plus indentée une sous-puce).
 * Priorités selon son échelle : Urgent (P1), À court terme (P2), À moyen terme (P3).
 */
import type { DesordreTemplate } from './templates';
import type { PreconisationType } from './preconisations';

export const LOT_BIBLIO_C = 'biblio-2026-11c-lorine';
const SUITE = ' Analyse à confirmer après investigations complémentaires.';

type T = DesordreTemplate;
const d = (type: string, famille: T['famille'], element: string, priorite: T['priorite'], lots: string[], unite: string, constat: string, analyse: string, investigations: string, preconisation: string): T =>
  ({ type, famille, element, priorite, lot: lots[0], lots, unite, constat, analyse, investigations, preconisation });

/* Blocs de préconisation réutilisés (rédaction de Lorine Gratadour) */
export const BLOC = {
  maconneries: `Nous préconisons la réfection des élévations avec le traitement des maçonneries de pierre :
- Vérifications de leurs états et stabilités,
- Piquage et purge des éléments instables ou dégradés,
- Piquage et purge des joints et enduits ciment, etc.,
- Nettoyage des pierres (manuellement),
- Réfection des pierres dégradées et remplacement de ces dernières si besoin,
  - Modifications des appareillages inadaptés, reharpage si nécessaire,
  - Comblements des vides,
  - Blocage / recalage / goujonnage des pierres si besoin.
- Pose de pierres dans les réservations inutilisées,
- Réfections des joints à la chaux.`,
  fissures: `Les fissures seront renforcées par :
- Mise en place d’agrafes (inox A4) ;
- Remplissage et scellement ;
- Rejointoiement par un mortier de chaux.`,
  metal: `Nous préconisons le traitement des éléments métalliques fixés en maçonneries :
- Purge des éléments obsolètes,
- Lors de la purge, prévoir le calfeutrement ou la mise en place de bouchons,
- Purge, brossage, passivation, protection ou remplacement des éléments métalliques à conserver.`,
  reseaux: `Nous préconisons le dévoiement des réseaux et conduits traversant les élévations.
De plus les réseaux dégradés devront être traités :
- Vérification de l’état et de l’utilité des différents réseaux par passages caméra ;
- Vérification de l’étanchéité des réseaux utiles et réfection si nécessaire ;
- Concernant les réseaux inutiles et obsolètes, nous préconisons :
  - Purge complète de ces réseaux ;
  - Réfection des élévations et autres éléments traversés par ces réseaux suivant les préconisations correspondantes.
- Dans le cas contraire, les réseaux et conduits métalliques oxydés devront être brossés, purgés, passivés et protégés (ou remplacés si besoin).`,
  vegetaux: `Nous préconisons le traitement des végétaux, mousses et lichens :
- Retrait des végétaux,
- Réalisation d’un traitement anti-mousses,
- Nettoyage des façades (manuel / hydrogommage),
- Protection des parties concernées.`,
  bois: `L’ensemble des éléments bois devront faire l’objet d’un état sanitaire (diagnostic xylophages et fongiques) exhaustif par un diagnostiqueur agréé. Après réalisation du diagnostic, réfection (ou remplacement) des éléments bois en mauvais état.`,
  g5: `Si une activité est relevée (réouverture des fissures), nous préconisons des investigations supplémentaires :
- Réalisation d’une mission géotechnique de type G5 afin de déterminer si l’origine des désordres est de type géotechnique.`,
  menuiseries: `Nous préconisons la réfection de l’état et de l’étanchéité des menuiseries :
- Remplacement des menuiseries en mauvais état,
- Réfection de l’étanchéité par la réalisation de calfeutrements,
- Restauration des maçonneries dégradées.`,
  zinc: `Vérification de l’état des protections en zinc et des évacuations d’eaux pluviales, réfection si nécessaire. En cas d’absence de ces dernières, prévoir leur mise en place.`,
  linteaux: `Nous préconisons la vérification de l’état d’usure des linteaux avec la purge des revêtements. Ceci permettra d’établir un traitement ou un changement tel que :
- Éléments conservés :
  - Purge, brossage, passivation, protection,
  - Calfeutrements et maçonneries adaptées.
- Remplacement des éléments :
  - Étaiement de l’ouverture concernée,
  - Purge de tous les éléments métalliques / bois présents au sein des maçonneries,
  - Pose d’un linteau avec un dimensionnement et un matériau adapté,
  - Reprise des maçonneries environnantes.`,
};

export const TEMPLATES_PLUS_C: DesordreTemplate[] = [
  d('Élévation en pierre dégradée', 'Pierre & enduits', 'Mur', 'P2', ['Maçonnerie – pierre de taille', 'Enduits et rejointoiement à la chaux'], 'm²',
    `Nous avons relevé un état de dégradation avancé des élévations en pierre, présentant les désordres suivants :
- Joints dégradés voire creux,
- Enduit et joints ciment,
- Pierres dégradées, instables,
- Présence de desquamation, pulvérulence, salpêtre, taches noires…,
- Fissures et lézardes,
- Défaut d’appareillage.`,
    'Ces désordres traduisent une maçonnerie qui ne sèche plus correctement (enduits et joints ciment, humidité) et dont la cohésion diminue : les pierres se dégradent et perdent leur calage.' + SUITE,
    'Vérification de l’état des pierres par sonnage et de leur stabilité après piquage des enduits ciment.',
    `${BLOC.maconneries}\n${BLOC.fissures}`),
  d('Lézarde', 'Fissures & structure', 'Mur', 'P1', ['Maçonnerie – pierre de taille'], 'mètre linéaire',
    'Nous avons relevé la présence d’une importante lézarde … (verticale / oblique) au niveau de … (chaîne d’angle, tapisserie, tête de mur, à proximité des baies), sur une hauteur d’environ … m.',
    'Une lézarde est une fissure ouverte et traversante : elle signale un mouvement de l’ouvrage (défaut d’appareillage ou de harpage, tassement, modification des descentes de charges) qu’il faut qualifier.' + SUITE,
    'Mise en place de fissuromètres (jauges type Saugnac ou fissuromètres connectés) pour suivre l’activité de la lézarde.',
    `À la suite des différents désordres relevés sur site, une campagne de travaux de renforcement est à prévoir à court terme :
- Piquage de l’enduit ;
- Agrafage de la lézarde ;
- Colmatage de la lézarde (coulinage et remplissage) ;
- Réfection ou remplacement des pierres en mauvais état ;
- Piquage des joints dégradés entre les pierres et réfection de ces derniers à la chaux ;
- Réalisation d’un enduit à la chaux sur l’ensemble des élévations en pierre.
${BLOC.g5}`),
  d('Défaut d’appareillage ou de harpage', 'Fissures & structure', 'Mur', 'P2', ['Maçonnerie – pierre de taille'], 'forfait',
    `Nous avons relevé différents défauts d’appareillage tel que :
- Harpage insuffisant (bandeaux / clés et contre-clés) au niveau de différentes baies (plein-cintre et plate-bande),
- Harpage insuffisant au niveau de la jonction entre … (mur en moellon et mur en pierre de taille / élévation en héberge),
- Maçonnerie hétérogène en partie sommitale du mur.`,
    'Sans harpage suffisant, les maçonneries ne sont pas liées entre elles : elles travaillent séparément et se fissurent à leur jonction.' + SUITE,
    'Sondages destructifs pour vérifier la conception des maçonneries.',
    `Nous préconisons la vérification de la conception des maçonneries avec la réalisation de sondages destructifs.
- Modifications des appareillages inadaptés, reharpage si nécessaire,
- Blocage / recalage / goujonnage des pierres si besoin.
${BLOC.fissures}`),
  d('Mouvement des clés d’arc, de linteau ou de voûte', 'Fissures & structure', 'Linteau', 'P1', ['Maçonnerie – pierre de taille', 'Étaiement – sécurisation'], 'unité',
    'Nous avons relevé la présence de légers mouvements au niveau des clés … (d’arc / de linteau / de voûte), ainsi que des joints dégradés voire creux et des jambages en pierre cassés.',
    'Le glissement des clés signale une décompression de l’arc ou de la voûte : les pierres ne sont plus bloquées et la stabilité de l’ouverture n’est plus assurée.' + SUITE,
    'Relevé et suivi des mouvements, vérification des jambages et des appuis.',
    `Nous préconisons la mise en sécurité de l’ouverture :
- Étrésillonnement des baies / ouvertures,
- Étaiement de l’arc ou de la voûte.
Puis la reprise structurelle de l’ouverture :
- Choix n°1 : si souhait de conserver l’arc actuel : mise en place d’un appareillage adapté (joint rayonnant selon règle de l’art),
- Choix n°2 : mise en place d’un linteau ou plate-bande adaptés.`),
  d('Linteau dégradé ou non conforme', 'Fissures & structure', 'Linteau', 'P1', ['Maçonnerie – pierre de taille', 'Charpente – menuiserie bois'], 'unité',
    'Nous avons relevé la présence de linteaux non-conformes : … (linteau bois dégradé / linteau métallique corrodé / absence de reprise structurelle, appareillage non conforme / clef de linteau en pierre qui se délite fortement).',
    'Un linteau dégradé ou absent ne reprend plus les charges au-dessus de l’ouverture : fissures en arc, affaissement de la maçonnerie et déformation des menuiseries.' + SUITE,
    'Purge des revêtements pour vérifier l’état des linteaux sous enduit.',
    `${BLOC.linteaux}
Nous préconisons le remplacement des linteaux bois existants par de nouveaux linteaux dimensionnés suite à la réalisation d’une étude de conception. Ces derniers seront mis en œuvre selon les règles de l’art.`),
  d('Absence de sommier sous appui', 'Fissures & structure', 'Poutre', 'P2', ['Maçonnerie – pierre de taille', 'Bureau d’études structure'], 'unité',
    'Nous notons l’absence de sommier béton accueillant … (les pannes / les poutres / les poutrelles), et une instabilité des pierres de la tête de mur au niveau des empochements.',
    'Sans sommier, la charge de la poutre est concentrée sur quelques pierres qui s’écrasent ou se déplacent : fissures sous l’appui et instabilité de la tête de mur.' + SUITE,
    'Vérification de l’état des appuis et des pierres d’assise.',
    `Nous préconisons la réfection des élévations avec le traitement des maçonneries de pierre :
- Mise en place de sommiers béton (empochements des pannes / appuis des poutres),
- Vérifications de leurs états et stabilités,
- Blocage / recalage / goujonnage des pierres si besoin.`),
  d('Plancher haut de cave dégradé (poutrelles et voûtains)', 'Fissures & structure', 'Plancher', 'P1', ['Étaiement – sécurisation', 'Maçonnerie – pierre de taille', 'Bureau d’études structure'], 'm²',
    `Nous avons relevé un état de dégradation avancé du plancher haut de cave et une certaine faiblesse de ce dernier. Celui-ci est composé de poutrelles métalliques et de voûtains brique :
- Structure métallique : rupture, corrosion, feuilletage, fissures,
- Enduit ciment en très mauvais état : décollements de plaques, risque de chute de plaques d’enduit, fissures et lézardes, taches noires,
- Voûtains brique dans un état de dégradation avancé : pulvérulence des briques,
- Absence de sommiers béton accueillant les poutrelles.`,
    'Au vu de l’état de dégradation avancé du plancher haut de cave, sa solidité ne peut pas être justifiée.',
    'Diagnostic structurel complet de l’immeuble après la mise en sécurité provisoire.',
    `Au vu de l’état de dégradation avancé du plancher haut de cave, nous ne pouvons pas justifier sa solidité. En conséquence, nous préconisons l’étaiement de ce dernier sans délai.
Dans le cas où ces mesures conservatoires ne seraient pas réalisées, nous serons dans l’obligation d’informer le service des bâtiments dangereux.
Suite à la mise en sécurité provisoire du plancher haut de cave, nous préconisons la réalisation d’un diagnostic structurel complet de l’immeuble, suivi d’une étude de conception des principes de renforcement définitifs.`),
  d('Réseaux et éléments traversant les élévations', 'Autres', 'Réseaux', 'P2', ['Réseaux – plomberie', 'Maçonnerie – pierre de taille'], 'forfait',
    `Nous avons relevé la présence d’éléments métalliques, réseaux et conduits fixés dans les maçonneries et traversant les éléments structurels :
- Ceux-ci sont placés dans des réservations non-conformes,
- De plus ils présentent des traces d’oxydation et de corrosion.
Ceux-ci engendrent des faiblesses structurelles au sein de l’élévation en pierre.`,
    'Les réservations successives et l’oxydation des éléments métalliques fragilisent la maçonnerie et apportent de l’humidité (fuites, condensation).' + SUITE,
    'Vérification de l’état et de l’utilité des différents réseaux par passages caméra.',
    BLOC.reseaux),
  d('Éléments métalliques oxydés en maçonnerie', 'Pierre & enduits', 'Ferronnerie', 'P2', ['Ferronnerie – serrurerie', 'Maçonnerie – pierre de taille'], 'forfait',
    'Nous avons relevé la présence d’éléments métalliques fixés en façade (type gonds, garde-corps, barreaux de protection…) présentant des traces d’oxydation ainsi que des fissures et cavités au niveau de leurs fixations.',
    'L’acier qui s’oxyde gonfle et fait éclater la pierre autour de ses fixations ; les coulures de rouille tachent la façade.' + SUITE,
    'Vérification de la stabilité des garde-corps.',
    BLOC.metal),
  d('Tirants corrodés ou non conformes', 'Fissures & structure', 'Tirant', 'P1', ['Ferronnerie – serrurerie', 'Bureau d’études structure'], 'unité',
    `Nous avons relevé la présence de tirants fortement dégradés :
- Feuilletage des aciers,
- Corrosion avancée et oxydation,
- Perte de matière,
- Déformations des éléments métalliques.
D’après les désordres relevés sur ces derniers, nous considérons les tirants comme non-conformes : ces derniers ne remplissent plus leur fonction.`,
    'Les tirants ne reprennent plus les efforts pour lesquels ils ont été posés : les maçonneries qu’ils retenaient peuvent se déformer (gonflements, déversements).' + SUITE,
    'Relevé des déformations des maçonneries retenues par les tirants.',
    `Nous préconisons le traitement des ancres de tirant corrodées et le remplacement des tirants non conformes, dimensionnés suite à la réalisation d’une étude de conception.`),
  d('Enduit ciment dégradé avec risque de chute', 'Pierre & enduits', 'Enduit', 'P1', ['Enduits et rejointoiement à la chaux'], 'm²',
    'Nous avons relevé la présence d’un enduit ciment en mauvais état : il présente différentes fissures et des zones de décollements avec le risque de chute de plaques d’enduits.',
    'L’enduit ciment, proscrit sur la pierre, empêche le mur de sécher et se décolle par plaques ; il masque l’état réel de la maçonnerie.' + SUITE,
    'Après piquage, vérification de l’état des pierres et des éventuelles agrafes présentes.',
    `Nous préconisons le piquage et la purge des enduits et joints ciment, puis :
- Vérification de l’état des pierres et des agrafes présentes,
- Réfection des pierres dégradées et des joints à la chaux,
- Pour un assainissement complet des élévations en pierres, nous vous conseillons la réalisation d’un enduit traditionnel sacrificiel (chaux).`),
  d('Mesures conservatoires inadaptées', 'Fissures & structure', 'Escalier', 'P1', ['Étaiement – sécurisation'], 'forfait',
    'Nous avons relevé des mesures conservatoires provisoires avec la présence d’un étai métallique au niveau de … (chaque palier / …). Nous notons l’absence de bastaings haut et bas et un nombre insuffisant / incomplet d’étais.',
    'Un étaiement incomplet ne garantit pas la reprise des charges : les mesures conservatoires doivent être adaptées.',
    '—',
    `Sans délai, nous préconisons la modification de l’étaiement actuel pour une mesure conservatoire provisoire adaptée, tel que :
- Mise en place d’un bastaing haut et d’un bastaing bas,
- Mise en place de 3 étais par volée.`),
  d('Escalier en pierre dégradé', 'Pierre & enduits', 'Escalier', 'P2', ['Maçonnerie – pierre de taille'], 'forfait',
    'Les marches en pierre sont fortement dégradées avec de nombreuses fissures ; nous avons relevé la présence de ciment (proscrit pour la pierre), de joints dégradés voire creux, ainsi que des fissures et un décollement du revêtement au niveau de la paillasse, avec un risque de chute de plaques.',
    'Les reprises au ciment et l’usure fragilisent les marches et leurs appuis.' + SUITE,
    'Vérification de la stabilité des marches et des fixations de garde-corps.',
    `Nous préconisons la réfection des élévations en pierre et de l’escalier :
- Piquage et purge du revêtement plâtre ainsi que des joints ciment de l’escalier,
- Réfection des marches en pierre / pierres de palier dégradées ou remplacement de ces dernières si besoin,
  - Blocage / recalage / goujonnage des pierres si besoin.
- Les fissures présentes sur les marches seront renforcées par :
  - Mise en place d’agrafes (inox A4),
  - Remplissage et scellement,
  - Rejointoiement par un mortier de chaux.
- Réfection des joints en mauvais état entre les pierres composant les marches.`),
  d('Bandeaux et corniches dégradés', 'Pierre & enduits', 'Corniche / bandeau', 'P2', ['Maçonnerie – pierre de taille', 'Couverture – zinguerie'], 'mètre linéaire',
    'Nous avons relevé la présence de taches noires, mousses et lichens au niveau des bandeaux et des corniches, des pierres dégradées et l’absence de protections.',
    'Les pierres en saillie reçoivent directement la pluie : sans protection, elles se dégradent et peuvent devenir instables.' + SUITE,
    'Vérification de la stabilité des pierres et de leur état par sonnage.',
    `Traitement des bandeaux et corniches de l’immeuble :
- Vérification de la stabilité des pierres ;
- Vérification de l’état des pierres par sonnage ;
- Réfection ou remplacement des pierres si besoin ;
- Recalage et blocage des pierres ;
- Piquage des joints dégradés entre les pierres et réfection à la chaux ;
- Vérification de l’état des protections en zinc et réfection si nécessaire. En cas d’absence de ces dernières, prévoir leur mise en place.`),
  d('Soubassement dégradé (manque de matière)', 'Pierre & enduits', 'Soubassement', 'P2', ['Maçonnerie – pierre de taille'], 'mètre linéaire',
    'Nous avons relevé un manque de matière au niveau du soubassement (…), avec des traces d’humidité et d’efflorescences.',
    'La perte d’épaisseur du soubassement réduit la section porteuse du mur à sa base, là où l’humidité est la plus forte.' + SUITE,
    '—',
    'Nous préconisons la réfection du soubassement par le remplacement des pierres afin d’obtenir une épaisseur convenable.'),
  d('Cuvelage ou revêtement étanche en cave', 'Eau & humidité', 'Cave', 'P2', ['Maçonnerie – pierre de taille', 'Ventilation'], 'm²',
    'Nous avons relevé la présence d’un cuvelage sur l’ensemble de la surface de la cave, ainsi que des remontées capillaires, du salpêtre, de la pulvérulence et de la desquamation au niveau des élévations et de la voûte.',
    'Le cuvelage bloque l’évaporation de l’humidité : celle-ci se concentre dans les maçonneries et les dégrade.' + SUITE,
    'Vérification de l’état des maçonneries derrière le cuvelage.',
    `Nous préconisons d’assainir la cave afin de limiter le développement de désordres engendrés par l’humidité :
- Réfection de l’évacuation et de la gestion des eaux pluviales pouvant s’infiltrer par le soupirail,
- Mise en place d’une ventilation adaptée pour accentuer le rôle du soupirail afin de diminuer la présence d’humidité.
${BLOC.maconneries}`),
  d('Ventilation de cave insuffisante, soupiraux obstrués', 'Eau & humidité', 'Cave', 'P2', ['Ventilation', 'Maçonnerie – pierre de taille'], 'forfait',
    'Nous avons relevé une ventilation des caves insuffisante, de plus les soupiraux sont obstrués et en mauvais état ; forte humidité ambiante.',
    'Sans renouvellement d’air, l’humidité de la cave se concentre dans les maçonneries et les bois.' + SUITE,
    '—',
    `Nous préconisons d’assainir la cave :
- Réfection des soupiraux et de leur fonctionnement,
- Mise en place d’une ventilation adaptée pour accentuer le rôle des soupiraux,
- Réfection de la gestion des eaux pluviales pouvant s’infiltrer par les soupiraux.`),
  d('Encombrement (stockages, déchets)', 'Autres', 'Cave', 'P3', ['Nettoyage – évacuation'], 'forfait',
    'Nous avons relevé la présence de nombreux stockages et déchets, empêchant l’observation de certains ouvrages.',
    'L’encombrement empêche la ventilation, entretient l’humidité et masque des désordres.',
    '—',
    'Nous préconisons l’évacuation des stockages et déchets, puis une nouvelle visite des parties non observables.'),
  d('Éléments bois dégradés (xylophages, pourriture)', 'Bois', 'Poutre', 'P1', ['Diagnostiqueur agréé (xylophages / fongiques)', 'Charpente – menuiserie bois'], 'forfait',
    'Nous avons relevé la présence d’éléments bois (… poutres, pannes, chevrons, planchers de palier) présentant d’importants désordres : présence de traces d’infestation xylophage / fongique, de taches d’humidité, de pourritures, de gerces…',
    'Les éléments bois exposés à l’humidité perdent leur résistance ; une infestation active peut compromettre leur capacité portante.' + SUITE,
    'État sanitaire (diagnostic xylophages et fongiques) exhaustif par un diagnostiqueur agréé.',
    `${BLOC.bois}\nMise en place d’une protection (étanchéité) des éléments structurels exposés (linteaux, pannes et planchers).`),
  d('Couverture et étanchéité en mauvais état', 'Eau & humidité', 'Couverture', 'P1', ['Couverture – zinguerie', 'Charpente – menuiserie bois'], 'm²',
    'Nous avons relevé une étanchéité et une couverture en mauvais état, la présence d’infiltrations au niveau du voligeage ainsi que le manque de certaines voliges. Nous notons l’absence d’un écran de sous-toiture ; les fenêtres de toit et leur étanchéité sont dégradées.',
    'Les infiltrations par la couverture dégradent rapidement la charpente et les têtes de murs.' + SUITE,
    'Inspection de la couverture et des points singuliers (solins, noues, fenêtres de toit).',
    `Nous préconisons la réfection de la couverture, zinguerie et étanchéité :
- Vérification et réfection de l’étanchéité de la couverture,
- Vérification et réfection du réseau de gestion et des évacuations d’eaux pluviales,
- Réfection de l’état et de l’étanchéité des fenêtres de toit,
- Réfection des éléments de charpente instables et dégradés (chevrons, pannes…).`),
  d('Présence de volatiles', 'Autres', 'Charpente', 'P3', ['Nettoyage – évacuation'], 'forfait',
    'Nous avons relevé la présence de volatiles dans les combles, ainsi que de fientes et de nids.',
    'Les fientes apportent des sels et de l’humidité qui dégradent bois et maçonneries ; les volatiles entrent par des ouvertures non protégées.',
    '—',
    'Nous préconisons l’évacuation des volatiles et le nettoyage de tous éléments dus à leur présence, puis la fermeture des accès.'),
  d('Plancher technique dégradé', 'Bois', 'Plancher', 'P2', ['Charpente – menuiserie bois'], 'm²',
    'Nous avons relevé un plancher technique dégradé présentant des lames absentes et dégradées.',
    'Un plancher technique en mauvais état présente un risque de chute lors des interventions dans les combles.',
    '—',
    'Nous préconisons la réfection (ou le remplacement) du plancher technique.'),
  d('Conduit en pierre dégradé', 'Pierre & enduits', 'Conduit', 'P2', ['Maçonnerie – pierre de taille', 'Fumisterie – conduits'], 'unité',
    'Nous avons relevé un conduit en pierre dans un état de dégradation avancé : joints dégradés voire creux, pierres en mauvais état…',
    'Un conduit dégradé laisse passer l’eau et peut devenir instable.' + SUITE,
    '—',
    'Nous préconisons la suppression ou la réfection du conduit en pierre.'),
  d('Tête de mur ou chaperon dégradé', 'Pierre & enduits', 'Mur de soutènement / clôture', 'P2', ['Maçonnerie – pierre de taille'], 'mètre linéaire',
    `Nous avons relevé au niveau du mur … une maçonnerie dégradée comprenant les désordres suivants :
- Développement de lichens et mousses,
- Joints dégradés et creux,
- Fissures et coups de sabre,
- Bouchons, joints et plaquages ciment,
- Protections de tête de mur (chaperon) et maçonnerie (arases) dégradées.`,
    'Sans protection en tête, l’eau pénètre dans le mur par le dessus et le dégrade sur toute sa hauteur.' + SUITE,
    '—',
    `Nous préconisons la réfection des têtes de murs :
- Réfection des protections de tête de mur en mauvais état,
${BLOC.maconneries.split('\n').slice(1).join('\n')}`),
  d('Mouvement global des maçonneries', 'Fissures & structure', 'Mur', 'P1', ['Étaiement – sécurisation', 'Bureau d’études structure'], 'forfait',
    'Nous avons relevé un mouvement global des maçonneries, avec gonflements et déformations des élévations du bâtiment …',
    'Les déformations généralisées (gonflements, déversements) indiquent une perte de cohésion ou de liaison de la maçonnerie, souvent associée à des tirants défaillants et à l’humidité.' + SUITE,
    'Investigations complémentaires (sondages destructifs) pour analyser l’état et la conception de la structure.',
    `Nous considérons que l’immeuble doit être sécurisé en urgence :
- Étrésillonnement des baies / ouvertures ;
- Étaiement lourd ;
- Mise en place de fissuromètres connectés.
Nous rappelons que ces dispositions ne font pas foi en conception et ne sont que des indications pour la maîtrise d’œuvre responsable de la mise en sécurité provisoire. Ces mesures conservatoires devront faire l’objet d’une étude de conception.`),
  d('Dallage extérieur irrégulier et instable', 'Eau & humidité', 'Abords', 'P3', ['Voirie et réseaux – drainage'], 'm²',
    'Nous avons relevé au niveau du sol : un dallage irrégulier, instable, avec un développement de végétaux ; nous notons l’absence de drain en pied de façade.',
    'L’eau stagne et s’infiltre au pied des murs ; le développement des végétaux entretient l’humidité.' + SUITE,
    '—',
    `Nous préconisons la réfection du dallage avec une pente adaptée et la mise en place d’un caniveau adapté pour la gestion des eaux pluviales en pied de façade.`),
  d('Éléments structurels dissimulés', 'Autres', 'Doublage', 'P2', ['Bureau d’études structure'], 'forfait',
    'Nous n’avons pas relevé de désordres particuliers sur les éléments structurels, cependant ces derniers étaient dissimulés par des éléments de second œuvre. Nous avons tout de même relevé des taches d’humidité et microfissures au niveau des élévations et des plafonds.',
    'Les désordres visibles sur les revêtements peuvent révéler des désordres sur la structure cachée.',
    'Sondages sur les doublages et revêtements.',
    `Nous préconisons la réalisation de sondages sur les doublages et revêtements pour la vérification des éléments structurels. Un traitement adapté sera alors proposé.
De plus, nous préconisons la réalisation d’investigations complémentaires (sondages destructifs). Celles-ci nous permettront d’analyser de manière précise l’état et la conception de la structure actuelle.`),
];

const p = (id: string, titre: string, famille: PreconisationType['famille'], lots: string[], texte: string, pour?: string[]): PreconisationType => ({ id, titre, famille, lot: lots[0], lots, texte, pour });

export const PRECOS_PLUS_C: PreconisationType[] = [
  p('lg-maconneries', 'Réfection des élévations — traitement des maçonneries de pierre', 'Pierre & enduits', ['Maçonnerie – pierre de taille', 'Enduits et rejointoiement à la chaux'], BLOC.maconneries,
    ['Élévation en pierre dégradée', 'Joints dégarnis ou creusés', 'Desquamation', 'Pulvérulence de la pierre', 'Cuvelage ou revêtement étanche en cave', 'Altération de la pierre']),
  p('lg-fissures', 'Renforcement des fissures (agrafes inox A4)', 'Fissures & structure', ['Maçonnerie – pierre de taille'], BLOC.fissures,
    ['Lézarde', 'Fissure verticale', 'Fissure diagonale / en escalier', 'Élévation en pierre dégradée', 'Défaut d’appareillage ou de harpage']),
  p('lg-lezarde', 'Campagne de renforcement d’une lézarde', 'Fissures & structure', ['Maçonnerie – pierre de taille', 'Enduits et rejointoiement à la chaux'],
    `À la suite des différents désordres relevés sur site, une campagne de travaux de renforcement est à prévoir à court terme :
- Piquage de l’enduit ;
- Agrafage de la lézarde ;
- Colmatage de la lézarde (coulinage et remplissage) ;
- Réfection ou remplacement des pierres en mauvais état ;
- Piquage des joints dégradés entre les pierres et réfection de ces derniers à la chaux ;
- Réalisation d’un enduit à la chaux sur l’ensemble des élévations en pierre.`, ['Lézarde', 'Fissure verticale']),
  p('lg-metal', 'Traitement des éléments métalliques fixés en maçonnerie', 'Pierre & enduits', ['Ferronnerie – serrurerie', 'Maçonnerie – pierre de taille'], BLOC.metal,
    ['Éléments métalliques oxydés en maçonnerie', 'Éclatement de pierre au droit d’un scellement', 'Garde-corps corrodé ou descellé', 'Corrosion d’aciers']),
  p('lg-reseaux', 'Dévoiement et traitement des réseaux traversant les élévations', 'Autres', ['Réseaux – plomberie', 'Maçonnerie – pierre de taille'], BLOC.reseaux,
    ['Réseaux et éléments traversant les élévations']),
  p('lg-vegetaux', 'Traitement des végétaux, mousses et lichens', 'Pierre & enduits', ['Maçonnerie – pierre de taille'], BLOC.vegetaux,
    ['Colonisation biologique (mousses, algues, lichens)', 'Végétation dans la maçonnerie', 'Dallage extérieur irrégulier et instable']),
  p('lg-g5', 'Mission géotechnique G5 si les fissures sont actives', 'Fissures & structure', ['Études et investigations'], BLOC.g5,
    ['Lézarde', 'Tassement différentiel', 'Retrait-gonflement des argiles', 'Fissure verticale', 'Fissure diagonale / en escalier']),
  p('lg-bois', 'État sanitaire des bois (diagnostic xylophages et fongiques)', 'Bois', ['Diagnostiqueur agréé (xylophages / fongiques)', 'Charpente – menuiserie bois'], BLOC.bois,
    ['Éléments bois dégradés (xylophages, pourriture)', 'Attaque xylophage', 'Champignon lignivore', 'Termites', 'Déformation de plancher']),
  p('lg-menuiseries', 'Réfection de l’état et de l’étanchéité des menuiseries', 'Autres', ['Menuiseries extérieures', 'Maçonnerie – pierre de taille'], BLOC.menuiseries,
    ['Menuiseries vétustes ou non étanches', 'Pourriture des menuiseries bois']),
  p('lg-zinc', 'Protections en zinc et évacuations d’eaux pluviales', 'Eau & humidité', ['Couverture – zinguerie'], BLOC.zinc,
    ['Bandeaux et corniches dégradés', 'Corniche ou bandeau dégradé', 'Infiltration', 'Eaux pluviales rejetées au pied du mur']),
  p('lg-linteaux', 'Vérification et traitement des linteaux', 'Fissures & structure', ['Maçonnerie – pierre de taille', 'Ferronnerie – serrurerie'], BLOC.linteaux,
    ['Linteau dégradé ou non conforme', 'Affaissement de linteau']),
  p('lg-linteau-monolithe', 'Remplacement d’un linteau par une pierre monolithe', 'Fissures & structure', ['Maçonnerie – pierre de taille'],
    `Nous préconisons le remplacement du linteau :
- Ce remplacement sera effectué par une pierre monolithe avec un dimensionnement adapté.`, ['Linteau dégradé ou non conforme', 'Affaissement de linteau']),
  p('lg-ouverture', 'Reprise structurelle d’une ouverture (arc ou plate-bande)', 'Fissures & structure', ['Maçonnerie – pierre de taille'],
    `Nous préconisons la reprise structurelle de l’ouverture :
- Choix n°1 : si souhait de conserver l’arc actuel : mise en place d’un appareillage adapté (joint rayonnant selon règle de l’art),
- Choix n°2 : mise en place d’un linteau ou plate-bande adaptés.`, ['Mouvement des clés d’arc, de linteau ou de voûte', 'Linteau dégradé ou non conforme']),
  p('lg-sommiers', 'Mise en place de sommiers béton', 'Fissures & structure', ['Maçonnerie – pierre de taille', 'Bureau d’études structure'],
    'Nous préconisons la mise en place de sommiers béton armé sous les appuis (empochements des pannes / appuis des poutres), avec un dimensionnement adapté.', ['Absence de sommier sous appui', 'Fissure sous charge ponctuelle']),
  p('lg-etaiement-plancher', 'Étaiement sans délai d’un plancher', 'Fissures & structure', ['Étaiement – sécurisation'],
    `Au vu de l’état de dégradation avancé du plancher, nous ne pouvons pas justifier sa solidité. En conséquence, nous préconisons l’étaiement de ce dernier sans délai.
Dans le cas où ces mesures conservatoires ne seraient pas réalisées, nous serons dans l’obligation d’informer le service des bâtiments dangereux.`, ['Plancher haut de cave dégradé (poutrelles et voûtains)', 'Corrosion d’aciers', 'Déformation de plancher']),
  p('lg-etaiement-lourd', 'Étaiement lourd (étais compris bastaings haut et bas)', 'Fissures & structure', ['Étaiement – sécurisation'],
    'Mise en place de mesures conservatoires provisoires : étaiement lourd à l’aplomb des éléments concernés, avec mise en place d’étais métalliques compris bastaings haut et bas.', ['Mesures conservatoires inadaptées', 'Plancher haut de cave dégradé (poutrelles et voûtains)']),
  p('lg-etaiement-escalier', 'Étaiement adapté d’un escalier', 'Fissures & structure', ['Étaiement – sécurisation'],
    `Sans délai, nous préconisons la modification de l’étaiement actuel de l’escalier pour une mesure conservatoire provisoire adaptée, tel que :
- Mise en place d’un bastaing haut et d’un bastaing bas,
- Mise en place de 3 étais par volée.`, ['Mesures conservatoires inadaptées', 'Escalier en pierre dégradé']),
  p('lg-securisation', 'Sécurisation d’urgence de l’immeuble', 'Fissures & structure', ['Étaiement – sécurisation', 'Bureau d’études structure'],
    `Nous considérons que l’immeuble doit être sécurisé en urgence :
- Étrésillonnement des baies / ouvertures ;
- Étaiement lourd ;
- Mise en place de fissuromètres connectés.
Nous rappelons que ces dispositions ne font pas foi en conception et ne sont que des indications pour la maîtrise d’œuvre responsable de la mise en sécurité provisoire. Ces mesures conservatoires devront faire l’objet d’une étude de conception.`, ['Mouvement global des maçonneries', 'Mouvement des clés d’arc, de linteau ou de voûte', 'Fissure horizontale / bombement']),
  p('lg-diag-complet', 'Diagnostic structurel complet et étude de conception', 'Fissures & structure', ['Bureau d’études structure'],
    'Suite à la mise en sécurité provisoire, nous préconisons la réalisation d’un diagnostic structurel complet de l’immeuble, suivi d’une étude de conception des principes de renforcement définitifs.', ['Plancher haut de cave dégradé (poutrelles et voûtains)', 'Mouvement global des maçonneries']),
  p('lg-sondages', 'Sondages et investigations complémentaires', 'Autres', ['Bureau d’études structure'],
    `Nous préconisons la réalisation de sondages sur les doublages et revêtements pour la vérification des éléments structurels. Un traitement adapté sera alors proposé.
De plus, nous préconisons la réalisation d’investigations complémentaires (sondages destructifs). Celles-ci nous permettront d’analyser de manière précise l’état et la conception de la structure actuelle.`, ['Éléments structurels dissimulés', 'Défaut d’appareillage ou de harpage']),
  p('lg-enduit-sacrificiel', 'Enduit traditionnel sacrificiel à la chaux', 'Pierre & enduits', ['Enduits et rejointoiement à la chaux'],
    'Pour un assainissement complet des élévations en pierres, nous vous conseillons la réalisation d’un enduit traditionnel sacrificiel (chaux).', ['Enduit ciment dégradé avec risque de chute', 'Élévation en pierre dégradée', 'Efflorescences / sels']),
  p('lg-piquage-ciment', 'Piquage des enduits et joints ciment', 'Pierre & enduits', ['Enduits et rejointoiement à la chaux'],
    `Nous préconisons le piquage et la purge des enduits et joints ciment, puis :
- Vérification de l’état des pierres et des agrafes présentes,
- Réfection des pierres dégradées et des joints à la chaux.`, ['Enduit ciment dégradé avec risque de chute', 'Joints ciment bloquants']),
  p('lg-corniches', 'Traitement des bandeaux et corniches', 'Pierre & enduits', ['Maçonnerie – pierre de taille', 'Couverture – zinguerie'],
    `Traitement des bandeaux et corniches de l’immeuble :
- Vérification de la stabilité des pierres ;
- Vérification de l’état des pierres par sonnage ;
- Réfection ou remplacement des pierres si besoin ;
- Recalage et blocage des pierres ;
- Piquage des joints dégradés entre les pierres et réfection à la chaux ;
- ${BLOC.zinc}`, ['Bandeaux et corniches dégradés', 'Corniche ou bandeau dégradé']),
  p('lg-soubassement', 'Réfection du soubassement', 'Pierre & enduits', ['Maçonnerie – pierre de taille'],
    'Nous préconisons la réfection du soubassement par le remplacement des pierres afin d’obtenir une épaisseur convenable.', ['Soubassement dégradé (manque de matière)']),
  p('lg-escalier', 'Réfection d’un escalier en pierre', 'Pierre & enduits', ['Maçonnerie – pierre de taille'],
    `Nous préconisons la réfection de l’escalier :
- Piquage et purge du revêtement plâtre ainsi que des joints ciment,
- Réfection des marches en pierre / pierres de palier dégradées ou remplacement de ces dernières si besoin,
  - Blocage / recalage / goujonnage des pierres si besoin.
- Les fissures présentes sur les marches seront renforcées par :
  - Mise en place d’agrafes (inox A4),
  - Remplissage et scellement,
  - Rejointoiement par un mortier de chaux.
- Réfection des joints en mauvais état entre les pierres composant les marches.`, ['Escalier en pierre dégradé']),
  p('lg-cave', 'Assainissement de la cave', 'Eau & humidité', ['Ventilation', 'Couverture – zinguerie'],
    `Nous préconisons d’assainir la cave afin de limiter le développement de désordres engendrés par l’humidité :
- Réfection de l’évacuation et de la gestion des eaux pluviales pouvant s’infiltrer par le soupirail,
- Mise en place d’une ventilation adaptée pour accentuer le rôle du soupirail afin de diminuer la présence d’humidité.`, ['Cuvelage ou revêtement étanche en cave', 'Ventilation de cave insuffisante, soupiraux obstrués', 'Cave ou sous-sol humide']),
  p('lg-couverture', 'Réfection de la couverture, zinguerie et étanchéité', 'Eau & humidité', ['Couverture – zinguerie', 'Charpente – menuiserie bois'],
    `Nous préconisons la réfection de la couverture, zinguerie et étanchéité :
- Vérification et réfection de l’étanchéité de la couverture,
- Vérification et réfection du réseau de gestion et des évacuations d’eaux pluviales,
- Réfection des éléments de charpente instables et dégradés (chevrons, pannes…).`, ['Couverture et étanchéité en mauvais état', 'Tuiles ou ardoises cassées, glissées ou poreuses']),
  p('lg-etancheite-facade', 'Étanchéité adaptée de la façade', 'Eau & humidité', ['Menuiseries extérieures', 'Couverture – zinguerie', 'Maçonnerie – pierre de taille'],
    `Nous préconisons la réalisation d’une étanchéité adaptée sur l’ensemble de la façade :
- Ouvertures : réfection de l’état et de l’étanchéité des menuiseries,
- ${BLOC.zinc}
- Descentes d’eaux pluviales : réfection du réseau de gestion des évacuations d’eaux pluviales, mise en place d’un caniveau adapté,
- Tête du mur de clôture : réfection des protections de tête de mur en mauvais état.`, ['Infiltration par la façade (pluie battante)', 'Dallage extérieur irrégulier et instable']),
  p('lg-protection-bois', 'Protection des éléments structurels bois exposés', 'Bois', ['Charpente – menuiserie bois', 'Couverture – zinguerie'],
    'Mise en place d’une protection (étanchéité) des éléments structurels exposés (linteaux, pannes et planchers).', ['Éléments bois dégradés (xylophages, pourriture)']),
  p('lg-volatiles', 'Évacuation des volatiles et nettoyage', 'Autres', ['Nettoyage – évacuation'],
    'Nous préconisons l’évacuation des volatiles et le nettoyage de tous éléments dus à leur présence, puis la fermeture des accès.', ['Présence de volatiles', 'Fientes et salissures d’oiseaux']),
  p('lg-plancher-technique', 'Réfection du plancher technique', 'Bois', ['Charpente – menuiserie bois'],
    'Nous préconisons la réfection (ou le remplacement) du plancher technique.', ['Plancher technique dégradé']),
  p('lg-conduit', 'Suppression ou réfection d’un conduit en pierre', 'Pierre & enduits', ['Maçonnerie – pierre de taille', 'Fumisterie – conduits'],
    'Nous préconisons la suppression ou la réfection du conduit en pierre.', ['Conduit en pierre dégradé', 'Souche de cheminée dégradée']),
  p('lg-tirants', 'Traitement ou remplacement des tirants', 'Fissures & structure', ['Ferronnerie – serrurerie', 'Bureau d’études structure'],
    'Nous préconisons le traitement des ancres de tirant corrodées et le remplacement des tirants non conformes, dimensionnés suite à la réalisation d’une étude de conception.', ['Tirants corrodés ou non conformes', 'Mouvement global des maçonneries']),
  p('lg-tete-mur', 'Réfection des têtes de murs', 'Pierre & enduits', ['Maçonnerie – pierre de taille'],
    'Nous préconisons la réfection des têtes de murs et des protections de tête de mur (chaperon, arases) en mauvais état.', ['Tête de mur ou chaperon dégradé', 'Mur de soutènement ou de clôture déversé']),
  p('lg-evacuation', 'Évacuation des stockages et déchets', 'Autres', ['Nettoyage – évacuation'],
    'Nous préconisons l’évacuation des stockages et déchets, puis une nouvelle visite des parties non observables.', ['Encombrement (stockages, déchets)']),
  p('lg-pierres-saillie', 'Réfection et protection des pierres en saillie', 'Pierre & enduits', ['Maçonnerie – pierre de taille', 'Couverture – zinguerie'],
    `Réalisation des travaux d’entretien / renforcement sur les ouvrages pierre :
- Réfection des pierres en saillie (ex : bandeaux, corniches…),
- Protection des pierres en saillie (ex : pierres de harpage en attente).`, ['Bandeaux et corniches dégradés', 'Corniche ou bandeau dégradé']),
];

export const LOTS_PLUS_C = ['Charpente et traitement des bois', 'Entretien', 'Bureau d’études structure', 'Diagnostiqueur agréé (xylophages / fongiques)', 'Réseaux – plomberie', 'Nettoyage – évacuation'];
export const ELEMENTS_PLUS_C = ['Tirant', 'Escalier', 'Voûte / voûtains'];
