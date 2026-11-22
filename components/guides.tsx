/**
 * Guides de bonnes pratiques illustrés — option commerciale jointe au rapport.
 * Fiches pédagogiques par matériau, avec un schéma « à faire / à éviter ».
 * Les textes sont modifiables dans la bibliothèque (section Guides).
 */
import type { Dossier } from '@/lib/types';

export interface Guide {
  id: string;
  titre: string;
  accroche: string; // une phrase qui résume
  principe: string; // comment ça marche
  faire: string[];
  eviter: string[];
  entretien: string[];
  motsCles: string; // pour proposer le guide selon le bâtiment (expression régulière)
}

export const GUIDES: Guide[] = [
  {
    id: 'chaux-ciment', titre: 'Pierre et chaux : pourquoi bannir le ciment',
    accroche: 'Un mur ancien doit respirer : la chaux le laisse sécher, le ciment l’enferme.',
    principe: 'Les murs anciens n’ont pas de barrière contre l’humidité du sol : l’eau monte un peu dans la maçonnerie et s’évapore par les faces du mur. La chaux, souple et poreuse, laisse passer cette vapeur. Le ciment, dur et étanche, la bloque : l’eau s’accumule derrière, dissout les sels et fait éclater la pierre et les joints.',
    faire: ['Enduits et joints à la chaux naturelle (aérienne ou hydraulique naturelle NHL 2 ou 3,5)', 'Sable local, de granulométrie variée, pour retrouver l’aspect d’origine', 'Joints légèrement en retrait ou beurrés à fleur de pierre', 'Badigeon de chaux pour protéger et unifier'],
    eviter: ['Mortier de ciment, enduit monocouche, joints au ciment « lissés »', 'Peintures et hydrofuges filmogènes qui ferment les pores', 'Sablage ou disqueuse sur les pierres tendres', 'Mastics et mousses expansives dans les fissures'],
    entretien: ['Surveiller l’apparition de taches d’humidité ou de pierres qui s’effritent', 'Reprendre ponctuellement les joints creusés avant qu’ils ne laissent entrer l’eau', 'Renouveler le badigeon tous les 5 à 10 ans selon l’exposition'],
    motsCles: 'pierre|moellon|calcaire|chaux|enduit|joint|maçonnerie|grès|granit',
  },
  {
    id: 'humidite', titre: 'L’humidité des murs : traiter l’eau à la source',
    accroche: 'Neuf fois sur dix, l’humidité vient de l’eau qui stagne au pied du mur, pas du mur lui-même.',
    principe: 'Un mur ancien humide est presque toujours un mur qui reçoit trop d’eau (gouttière percée, trottoir étanche, terre contre la façade) ou qui ne peut plus sécher (enduit ciment, doublage étanche). On commence donc par éloigner l’eau et rendre au mur sa capacité de séchage, avant tout autre traitement.',
    faire: ['Éloigner les eaux de pluie : gouttières, descentes et regards en bon état', 'Laisser le pied du mur à l’air ou le protéger par un drain et du gravier', 'Abaisser le terrain s’il est plus haut que le sol intérieur', 'Aérer les pièces et les caves'],
    eviter: ['Trottoir ou enrobé collé au mur', 'Injections de résine « anti-remontées » sans traitement de la cause', 'Doublages avec polystyrène et pare-vapeur contre un mur humide', 'Plantations et massifs arrosés au pied des façades'],
    entretien: ['Nettoyer gouttières et chéneaux deux fois par an', 'Vérifier après chaque gros orage que l’eau s’évacue loin du bâtiment', 'Observer les traces de salpêtre : leur extension signale un problème d’eau'],
    motsCles: 'humid|capill|infiltr|condens|salp|sel|drain|cave',
  },
  {
    id: 'bois', titre: 'Les bois de charpente et de plancher',
    accroche: 'Un bois sec et ventilé traverse les siècles ; un bois enfermé dans l’humidité pourrit en quelques années.',
    principe: 'Les insectes et les champignons attaquent surtout les bois humides ou mal ventilés : têtes de poutres encastrées dans un mur mouillé, sablières sous une gouttière qui fuit, solives sous une chape étanche. Garder les bois au sec et à l’air est la meilleure protection.',
    faire: ['Laisser un vide d’air autour des têtes de poutres dans les murs', 'Réparer par greffe ou moisage plutôt que remplacer toute la pièce', 'Utiliser des bois de même essence, secs, de qualité charpente', 'Faire vérifier une charpente après tout dégât des eaux'],
    eviter: ['Sceller les abouts de poutres au ciment', 'Couler une chape béton sur un plancher bois ancien', 'Traiter sans avoir supprimé la cause d’humidité', 'Supprimer un entrait ou une pièce de charpente sans avis'],
    entretien: ['Inspecter les combles chaque année (traces d’eau, sciure, trous d’envol)', 'Ventiler les combles et les vides sanitaires', 'Surveiller les zones sous les noues, chéneaux et lucarnes'],
    motsCles: 'bois|charpente|plancher|solive|poutre|xylo|mérule|champignon|colombage|pan de bois',
  },
  {
    id: 'eaux-pluviales', titre: 'Toiture et eaux pluviales',
    accroche: 'Une toiture et des gouttières en bon état protègent tout le reste du bâtiment.',
    principe: 'La couverture et la zinguerie sont la première protection du bâti. Une tuile déplacée ou une descente bouchée envoient l’eau dans les murs et la charpente, ce qui provoque la plupart des désordres graves. Leur entretien régulier coûte peu au regard des réparations qu’il évite.',
    faire: ['Faire réviser la couverture tous les 5 à 10 ans', 'Raccorder les descentes à un réseau ou les rejeter loin des murs', 'Conserver des débords de toit suffisants', 'Reprendre les solins et faîtages au mortier de chaux'],
    eviter: ['Laisser des gouttières déborder ou des descentes se vider au pied des murs', 'Mousses et végétation sur la toiture', 'Bandes bitumineuses et silicone en guise de réparation durable', 'Supprimer les débords de toit lors d’une réfection'],
    entretien: ['Nettoyer gouttières et chéneaux à l’automne et au printemps', 'Contrôler la toiture après chaque tempête', 'Vérifier les regards et l’exutoire des eaux pluviales'],
    motsCles: 'toit|couverture|tuile|ardoise|gouttière|zinguerie|chéneau|infiltr',
  },
  {
    id: 'isolation', titre: 'Isoler un bâtiment ancien sans l’abîmer',
    accroche: 'On peut isoler un mur ancien, à condition d’utiliser des matériaux qui laissent passer la vapeur d’eau.',
    principe: 'Un mur ancien épais stocke la chaleur et régule l’humidité. Une isolation étanche (polystyrène, pare-vapeur, enduit ciment) piège l’humidité dans le mur, qui se dégrade et devient froid. Les isolants dits « perspirants » (fibre de bois, chanvre, liège, chaux-chanvre) améliorent le confort sans enfermer l’eau.',
    faire: ['Commencer par la toiture, les menuiseries et l’étanchéité à l’air', 'Enduit correcteur chaux-chanvre ou isolant en fibre de bois sur les murs', 'Isolant sous la toiture en fibre de bois ou ouate de cellulose', 'Ventilation adaptée après les travaux'],
    eviter: ['Polystyrène, polyuréthane ou laine minérale avec pare-vapeur contre un mur en pierre', 'Isolation par l’extérieur avec enduit ciment', 'Isoler un mur encore humide', 'Supprimer toute ventilation pour « garder la chaleur »'],
    entretien: ['Surveiller l’apparition de moisissures derrière les meubles et dans les angles', 'Entretenir la ventilation (entrées d’air, bouches)', 'Contrôler l’humidité intérieure avec un hygromètre (idéalement 40 à 60 %)'],
    motsCles: 'isol|confort|énerg|chauff|doublage',
  },
  {
    id: 'menuiseries', titre: 'Menuiseries et appuis de fenêtres',
    accroche: 'Une fenêtre ancienne restaurée dure plus longtemps qu’une fenêtre neuve, et garde le caractère de la façade.',
    principe: 'Les menuiseries anciennes en bois de qualité se réparent : remplacement d’une pièce, reprise du mastic, pose de joints. L’appui de fenêtre doit rejeter l’eau à l’extérieur grâce à sa pente et à son larmier, faute de quoi l’eau ruisselle dans le mur.',
    faire: ['Restaurer les menuiseries en bon état (mastic, joints, peinture microporeuse)', 'Ajouter un double vitrage mince ou une contre-fenêtre intérieure', 'Vérifier la pente et le larmier des appuis', 'Choisir le bois pour les remplacements, aux mêmes profils'],
    eviter: ['Menuiseries PVC posées en rénovation sur l’ancien dormant', 'Appuis sans pente ni débord, ou recouverts de carrelage', 'Peintures épaisses qui emprisonnent l’humidité du bois'],
    entretien: ['Repeindre ou relasurer tous les 5 à 8 ans', 'Refaire les mastics fissurés', 'Dégager les trous d’évacuation des pièces d’appui'],
    motsCles: 'menuiser|fenêtre|volet|appui|baie',
  },
  {
    id: 'terre', titre: 'Les murs en terre (pisé, torchis, bauge)',
    accroche: '« De bonnes bottes et un bon chapeau » : un mur en terre craint seulement l’eau.',
    principe: 'La terre crue est un matériau solide et sain tant qu’elle reste sèche. Elle repose sur un soubassement en pierre (les bottes) et se protège sous un large débord de toit (le chapeau). Un enduit à la chaux ou à la terre la laisse respirer ; un enduit ciment la fait pourrir de l’intérieur.',
    faire: ['Conserver un soubassement en pierre hors d’eau', 'Maintenir de larges débords de toit', 'Enduits terre ou chaux aérienne, peu épais', 'Réparer avec de la terre de même nature'],
    eviter: ['Enduit ciment, peinture étanche', 'Terre ou trottoir remontés contre le pied du mur', 'Percements et saignées sans avis'],
    entretien: ['Surveiller le pied des murs et les angles exposés à la pluie', 'Reprendre les enduits fissurés pour éviter que l’eau ne s’infiltre', 'Entretenir les gouttières en priorité'],
    motsCles: 'terre|pisé|torchis|bauge|adobe',
  },
  {
    id: 'brique', titre: 'Les maçonneries de brique',
    accroche: 'La brique ancienne est tendre : elle se répare au mortier de chaux, jamais au ciment.',
    principe: 'Les briques anciennes, cuites à plus basse température, sont plus poreuses que les briques modernes. Le joint doit rester plus tendre que la brique pour que ce soit lui, et non la brique, qui s’use et se remplace.',
    faire: ['Rejointoyer au mortier de chaux naturelle', 'Remplacer les briques gélives par des briques de récupération ou de même dureté', 'Nettoyer à l’eau à basse pression ou par nébulisation'],
    eviter: ['Joints ciment', 'Sablage et nettoyage haute pression', 'Hydrofuges et peintures filmogènes'],
    entretien: ['Surveiller les briques qui s’effritent sous les appuis et en pied de mur', 'Reprendre les joints creusés', 'Vérifier l’état des couronnements de murs et de cheminées'],
    motsCles: 'brique',
  },
];

/** Guides proposés selon les matériaux, le système constructif et les désordres du dossier. */
export function guidesSuggeres(d: Dossier, guides: Guide[] = GUIDES): string[] {
  const texte = [d.contexte.materiaux, d.contexte.systemeConstructif, ...d.desordres.map((x) => `${x.type} ${x.element}`)].join(' ').toLowerCase();
  return guides.filter((g) => new RegExp(g.motsCles, 'i').test(texte)).map((g) => g.id);
}

/* ───────────── Illustrations (schémas simples, couleurs de la marque) ───────────── */

const C = { pierre: '#D6C7AF', pierreF: '#BFAE92', chaux: '#F3EEE6', ciment: '#9AA093', foret: '#334B3D', terre: '#B97A5B', sauge: '#68725E', eau: '#7FA3B5', ok: '#4E7A55', ko: '#A8432F' };

function Verdict({ x, ok, label }: { x: number; ok: boolean; label: string }) {
  return (
    <g>
      <circle cx={x} cy={14} r={9} fill={ok ? C.ok : C.ko} />
      <text x={x} y={18} textAnchor="middle" fontSize="12" fill="#fff" fontFamily="Montserrat, sans-serif" fontWeight={700}>{ok ? '✓' : '✗'}</text>
      <text x={x + 14} y={18} fontSize="9" fill={C.foret} fontFamily="Montserrat, sans-serif" fontWeight={600}>{label}</text>
    </g>
  );
}

function Stones({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const rows = [];
  for (let r = 0; r < Math.floor(h / 18); r++) {
    const off = r % 2 ? 12 : 0;
    for (let c = -1; c < Math.ceil(w / 26) + 1; c++) {
      const sx = x + c * 26 + off;
      if (sx + 22 < x || sx > x + w) continue;
      rows.push(<rect key={`${r}-${c}`} x={Math.max(x, sx)} y={y + r * 18 + 2} width={Math.min(22, x + w - Math.max(x, sx))} height={14} rx={3} fill={(r + c) % 3 ? C.pierre : C.pierreF} />);
    }
  }
  return <g>{rows}</g>;
}

const Arrow = ({ x1, y1, x2, y2, color, dash }: { x1: number; y1: number; x2: number; y2: number; color: string; dash?: boolean }) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 6;
  return (
    <g stroke={color} strokeWidth={2} fill="none" strokeDasharray={dash ? '3 3' : undefined}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <path d={`M${x2 - h * Math.cos(a - 0.5)},${y2 - h * Math.sin(a - 0.5)} L${x2},${y2} L${x2 - h * Math.cos(a + 0.5)},${y2 - h * Math.sin(a + 0.5)}`} strokeDasharray="" />
    </g>
  );
};

/** Mur en coupe : maçonnerie + enduit (chaux respirante ou ciment bloquant). */
function MurCoupe({ x, ok }: { x: number; ok: boolean }) {
  return (
    <g>
      <rect x={x} y={34} width={70} height={110} fill={C.chaux} />
      <Stones x={x} y={34} w={70} h={110} />
      <rect x={x + 70} y={34} width={8} height={110} fill={ok ? '#EFE7D8' : C.ciment} stroke={ok ? C.pierre : '#7d8277'} strokeWidth={0.6} />
      <rect x={x - 20} y={144} width={140} height={10} fill="#8C7B62" />
      {[56, 82, 108].map((y) => (ok
        ? <Arrow key={y} x1={x + 52} y1={y + 10} x2={x + 104} y2={y} color={C.eau} />
        : <g key={y}><Arrow x1={x + 40} y1={y + 10} x2={x + 66} y2={y + 6} color={C.eau} /><text x={x + 82} y={y + 10} fontSize="13" fill={C.ko}>✕</text></g>))}
      {!ok && <g>{[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={x + 60 + (i % 2) * 4} cy={60 + i * 16} r={2} fill="#fff" stroke={C.sauge} strokeWidth={0.5} />)}</g>}
      <text x={x + 35} y={164} textAnchor="middle" fontSize="7" fill={C.sauge} fontFamily="Montserrat, sans-serif">{ok ? 'la vapeur s’échappe' : 'eau et sels piégés'}</text>
    </g>
  );
}

function IllHumidite() {
  return (
    <g>
      <Verdict x={14} ok label="Eau éloignée du mur" />
      <Verdict x={174} ok={false} label="Eau au pied du mur" />
      {[0, 1].map((k) => {
        const x = k * 160 + 30;
        const ok = k === 0;
        return (
          <g key={k}>
            <path d={`M${x - 10},40 L${x + 60},26 L${x + 60},36 L${x - 10},50 Z`} fill={C.terre} />
            <rect x={x} y={44} width={50} height={96} fill={C.chaux} />
            <Stones x={x} y={44} w={50} h={96} />
            <rect x={x + 50} y={128} width={80} height={12} fill={ok ? '#C8B99D' : C.ciment} />
            {ok && <><circle cx={x + 72} cy={150} r={6} fill="#fff" stroke={C.sauge} /><text x={x + 82} y={158} fontSize="6.5" fill={C.sauge} fontFamily="Montserrat, sans-serif">drain</text></>}
            <path d={`M${x + 56},40 L${x + 64},40 L${x + 64},126`} stroke={C.sauge} strokeWidth={3} fill="none" />
            {ok ? <Arrow x1={x + 64} y1={124} x2={x + 110} y2={124} color={C.eau} /> : <Arrow x1={x + 64} y1={122} x2={x + 56} y2={132} color={C.eau} />}
            {!ok && [0, 1, 2].map((i) => <Arrow key={i} x1={x + 12 + i * 14} y1={140} x2={x + 12 + i * 14} y2={104} color={C.eau} dash />)}
            <rect x={x - 20} y={140} width={150} height={20} fill="#8C7B62" opacity={0.5} />
          </g>
        );
      })}
    </g>
  );
}

function IllBois() {
  return (
    <g>
      <Verdict x={14} ok label="About ventilé" />
      <Verdict x={174} ok={false} label="About scellé" />
      {[0, 1].map((k) => {
        const x = k * 160 + 20;
        const ok = k === 0;
        return (
          <g key={k}>
            <rect x={x} y={36} width={60} height={120} fill={C.chaux} />
            <Stones x={x} y={36} w={60} h={120} />
            <rect x={x + 22} y={82} width={38} height={26} fill={ok ? C.chaux : C.ciment} />
            <rect x={x + 28} y={86} width={110} height={18} rx={2} fill="#B88A5A" stroke="#8A6239" />
            {!ok && <><circle cx={x + 36} cy={95} r={6} fill="#5b4632" opacity={0.6} /><circle cx={x + 44} cy={92} r={3} fill="#5b4632" opacity={0.6} /></>}
            {ok && [0, 1].map((i) => <Arrow key={i} x1={x + 26} y1={92 + i * 10} x2={x + 4} y2={80 + i * 30} color={C.eau} />)}
            <text x={x + 70} y={126} fontSize="7" fill={C.sauge} fontFamily="Montserrat, sans-serif">{ok ? 'vide d’air' : 'pourriture'}</text>
          </g>
        );
      })}
    </g>
  );
}

function IllToiture() {
  return (
    <g>
      <Verdict x={14} ok label="Gouttière entretenue" />
      <Verdict x={174} ok={false} label="Gouttière bouchée" />
      {[0, 1].map((k) => {
        const x = k * 160 + 26;
        const ok = k === 0;
        return (
          <g key={k}>
            <path d={`M${x - 6},40 L${x + 76},70 L${x + 76},78 L${x - 6},48 Z`} fill={C.terre} />
            <rect x={x} y={56} width={52} height={100} fill={C.chaux} />
            <Stones x={x} y={56} w={52} h={100} />
            <path d={`M${x + 70},74 q6,8 12,0`} stroke={C.sauge} strokeWidth={3} fill="none" />
            {ok
              ? <><path d={`M${x + 82},76 L${x + 82},150 L${x + 120},150`} stroke={C.sauge} strokeWidth={3} fill="none" /><Arrow x1={x + 100} y1={150} x2={x + 128} y2={150} color={C.eau} /></>
              : <>{[0, 1, 2].map((i) => <Arrow key={i} x1={x + 74 + i * 4} y1={80} x2={x + 56 + i * 2} y2={110 + i * 12} color={C.eau} />)}<rect x={x + 44} y={96} width={10} height={44} fill={C.eau} opacity={0.35} /></>}
          </g>
        );
      })}
    </g>
  );
}

function IllIsolation() {
  return (
    <g>
      <Verdict x={14} ok label="Isolant perspirant" />
      <Verdict x={174} ok={false} label="Isolant étanche" />
      {[0, 1].map((k) => {
        const x = k * 160 + 30;
        const ok = k === 0;
        return (
          <g key={k}>
            <rect x={x} y={36} width={60} height={116} fill={C.chaux} />
            <Stones x={x} y={36} w={60} h={116} />
            <rect x={x + 60} y={36} width={24} height={116} fill={ok ? '#C9A15A' : '#E8EEF2'} stroke={ok ? '#a8843f' : '#b9c6cf'} />
            {ok ? [0, 1, 2, 3].map((i) => <line key={i} x1={x + 62} x2={x + 82} y1={48 + i * 28} y2={56 + i * 28} stroke="#a8843f" />) : <rect x={x + 84} y={36} width={3} height={116} fill={C.ko} />}
            {ok
              ? [60, 100].map((y) => <Arrow key={y} x1={x + 100} y1={y} x2={x + 10} y2={y + 6} color={C.eau} />)
              : <>{[60, 100].map((y) => <Arrow key={y} x1={x + 40} y1={y} x2={x + 58} y2={y} color={C.eau} />)}<rect x={x + 54} y={52} width={8} height={70} fill={C.eau} opacity={0.4} /></>}
            <text x={x + 44} y={164} textAnchor="middle" fontSize="7" fill={C.sauge} fontFamily="Montserrat, sans-serif">{ok ? 'fibre de bois, chanvre' : 'condensation'}</text>
          </g>
        );
      })}
    </g>
  );
}

function IllMenuiserie() {
  return (
    <g>
      <Verdict x={14} ok label="Appui avec larmier" />
      <Verdict x={174} ok={false} label="Appui plat" />
      {[0, 1].map((k) => {
        const x = k * 160 + 30;
        const ok = k === 0;
        return (
          <g key={k}>
            <rect x={x} y={36} width={90} height={120} fill={C.chaux} />
            <Stones x={x} y={36} w={90} h={120} />
            <rect x={x + 22} y={44} width={46} height={58} fill="#E8EEF2" stroke="#8A6239" strokeWidth={4} />
            {ok ? <path d={`M${x + 14},104 L${x + 80},104 L${x + 84},110 L${x + 84},114 L${x + 80},114 L${x + 14},110 Z`} fill={C.pierreF} /> : <rect x={x + 14} y={104} width={66} height={8} fill={C.ciment} />}
            {ok ? <Arrow x1={x + 60} y1={102} x2={x + 92} y2={126} color={C.eau} /> : <Arrow x1={x + 60} y1={102} x2={x + 40} y2={130} color={C.eau} />}
          </g>
        );
      })}
    </g>
  );
}

function IllTerre() {
  return (
    <g>
      <Verdict x={14} ok label="Bottes et chapeau" />
      <Verdict x={174} ok={false} label="Pied enterré, ciment" />
      {[0, 1].map((k) => {
        const x = k * 160 + 30;
        const ok = k === 0;
        return (
          <g key={k}>
            <path d={`M${x - (ok ? 24 : 4)},40 L${x + 80},40 L${x + 80},48 L${x - (ok ? 24 : 4)},48 Z`} fill={C.terre} />
            <rect x={x} y={48} width={70} height={ok ? 74 : 98} fill="#C9A77E" />
            {[0, 1, 2, 3].map((i) => <line key={i} x1={x} x2={x + 70} y1={66 + i * 18} y2={66 + i * 18} stroke="#ad8b62" />)}
            {ok && <Stones x={x} y={122} w={70} h={30} />}
            {!ok && <rect x={x + 70} y={48} width={6} height={98} fill={C.ciment} />}
            <rect x={x - 20} y={ok ? 150 : 132} width={130} height={ok ? 10 : 28} fill="#8C7B62" opacity={0.6} />
            {!ok && [0, 1, 2].map((i) => <Arrow key={i} x1={x + 14 + i * 20} y1={146} x2={x + 14 + i * 20} y2={118} color={C.eau} dash />)}
          </g>
        );
      })}
    </g>
  );
}

function IllBrique() {
  return (
    <g>
      <Verdict x={14} ok label="Joint chaux tendre" />
      <Verdict x={174} ok={false} label="Joint ciment dur" />
      {[0, 1].map((k) => {
        const x = k * 160 + 24;
        const ok = k === 0;
        const bricks = [];
        for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
          const bx = x + c * 30 + (r % 2 ? 15 : 0);
          if (bx > x + 110) continue;
          const worn = !ok && (r + c) % 3 === 0;
          bricks.push(<rect key={`${r}-${c}`} x={bx} y={40 + r * 18} width={worn ? 24 : 27} height={14} rx={1} fill={worn ? '#c47d5f' : '#B4654A'} />);
        }
        return (
          <g key={k}>
            <rect x={x - 2} y={38} width={140} height={110} fill={ok ? '#EFE7D8' : C.ciment} />
            {bricks}
          </g>
        );
      })}
    </g>
  );
}

const ILLUS: Record<string, () => JSX.Element> = {
  'chaux-ciment': () => (<g><Verdict x={14} ok label="Enduit à la chaux" /><Verdict x={174} ok={false} label="Enduit au ciment" /><MurCoupe x={30} ok /><MurCoupe x={190} ok={false} /></g>),
  humidite: IllHumidite, bois: IllBois, 'eaux-pluviales': IllToiture, isolation: IllIsolation, menuiseries: IllMenuiserie, terre: IllTerre, brique: IllBrique,
};

export function GuideIllustration({ id }: { id: string }) {
  const Ill = ILLUS[id];
  if (!Ill) return null;
  return (
    <svg viewBox="0 0 330 170" style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Schéma à faire et à éviter">
      <rect x={0} y={0} width={330} height={170} fill="#FBF9F5" rx={6} />
      <line x1={165} y1={8} x2={165} y2={164} stroke={C.pierre} strokeDasharray="3 3" />
      <Ill />
    </svg>
  );
}

/** Page de guide pour le rapport (A4). */
export function GuidePage({ g }: { g: Guide }) {
  const col = (titre: string, items: string[], color: string, mark: string) => (
    <div className="keep">
      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '8pt', letterSpacing: '.08em', textTransform: 'uppercase', color, marginBottom: '2mm' }}>{titre}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((t, i) => (
          <li key={i} style={{ display: 'flex', gap: '2mm', marginBottom: '1.6mm', fontSize: '8.8pt', lineHeight: 1.35 }}>
            <span style={{ color, fontWeight: 700 }}>{mark}</span><span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div>
      <div className="eyebrow" style={{ color: '#B97A5B' }}>Guide de bonnes pratiques</div>
      <h2 style={{ marginBottom: '2mm' }}>{g.titre}</h2>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '14pt', color: '#334B3D', margin: '0 0 4mm', lineHeight: 1.25 }}>{g.accroche}</p>
      <div className="keep" style={{ margin: '0 0 5mm' }}><GuideIllustration id={g.id} /></div>
      <p style={{ marginBottom: '5mm' }}>{g.principe}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm' }}>
        {col('À faire', g.faire, C.ok, '✓')}
        {col('À éviter', g.eviter, C.ko, '✗')}
      </div>
      <div className="boxed keep" style={{ marginTop: '5mm', background: '#F1F2EE', borderColor: '#68725E' }}>
        {col('Entretien au fil des saisons', g.entretien, C.foret, '•')}
      </div>
    </div>
  );
}
