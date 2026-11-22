import { computeScenarios, fmtDate, fmtRange, roadmap, sortDesordres, totalsByPriority, type Range } from './calc';
import { A_EVITER, FAMILLE_GUIDE, PHASE_GUIDE, PRIORITY, REGLE_OR } from './constants';
import { TEMPLATES } from './templates';
import type { Desordre, Dossier, Priority } from './types';

/**
 * Rédaction automatique de la synthèse : un texte suivi qui reprend tout le
 * dossier (bâtiment, constats, causes, urgences, étapes, budget, souhaits,
 * erreurs à éviter, entretien) pour guider le client pendant sa restauration.
 */

export type BlockStyle = 'retenir' | 'cartes' | 'urgent' | 'etapes' | 'priorites' | 'avant' | 'budget' | 'objectifs' | 'eviter' | 'entretien' | 'citation';
export interface Block { titre: string; paragraphes: string[]; puces?: string[]; apres?: string[]; sous?: Block[]; style?: BlockStyle; chiffres?: { valeur: string; libelle: string }[] }

/** Préconisation résumée : texte de la fiche, ou solution recommandée (Diagnostic structurel). */
export function precoOf(d: Desordre): string {
  if (d.preconisation.trim()) return d.preconisation;
  const s = d.solutions?.find((x) => x.recommandee) ?? d.solutions?.[0];
  if (!s) return '';
  return (d.solutions!.length > 1 ? `${s.titre} (${d.solutions!.length} solutions proposées, voir la partie Préconisations). ` : `${s.titre}. `) + s.texte;
}

const NOMBRES = ['aucun', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze'];
const nb = (n: number, fem = false) => (n === 1 && fem ? 'une' : NOMBRES[n] ?? String(n));
const pl = (n: number, s: string, p = s + 's') => (n > 1 ? p : s);
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const firstSentence = (s: string) => (s.split(/(?<=[.!?])\s/)[0] ?? '').trim();
const clean = (s: string) => s.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
const joinFr = (l: string[]) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}`);

export function familleOf(d: Desordre): string {
  if (d.famille) return d.famille;
  const t = TEMPLATES.find((x) => x.type === d.type);
  if (t) return t.famille;
  if (/eau|humid|infiltr|capill|condens|sel|salp|gel/i.test(d.type)) return 'Eau & humidité';
  if (/fissur|tasse|linteau|plancher|bomb|struct/i.test(d.type)) return 'Fissures & structure';
  if (/joint|enduit|pierre/i.test(d.type)) return 'Pierre & enduits';
  if (/bois|xylo|champi|mérule|charpente/i.test(d.type)) return 'Bois';
  return 'Autres';
}

export function buildSynthesis(dossier: Dossier, opts: { budget?: boolean; etapes?: boolean } = {}): Block[] {
  const avecBudget = opts.budget ?? true;
  const avecEtapes = opts.etapes ?? true;
  const { meta, contexte } = dossier;
  const list = sortDesordres(dossier.desordres);
  const zoneName = (c: string) => dossier.zones.find((z) => z.code === c)?.nom || c;
  const where = (d: Desordre) => (d.zoneCode ? lower(zoneName(d.zoneCode)) : 'zone à préciser');
  const blocks: Block[] = [];
  const byP = (p: Priority) => list.filter((d) => d.priorite === p);
  const totals = totalsByPriority(list);

  /* 1. Ce qu'il faut retenir */
  const retenir: string[] = [];
  const adresse = [meta.bien.adresse, meta.bien.commune].filter(Boolean).join(', ');
  const presentation: string[] = [];
  if (contexte.typologie.trim()) presentation.push(`Le bâtiment étudié${adresse ? `, situé ${adresse},` : ''} est de type « ${lower(contexte.typologie.trim().replace(/\.$/, ''))} ».`);
  else if (adresse) presentation.push(`Le bâtiment étudié est situé ${adresse}.`);
  if (contexte.datation.trim()) presentation.push(`Sa période de construction est estimée ainsi : ${lower(clean(contexte.datation))}.`);
  if (contexte.systemeConstructif.trim()) presentation.push(`Ses principaux éléments constructifs sont les suivants : ${lower(contexte.systemeConstructif.trim().replace(/\.$/, ''))}.`);
  if (presentation.length) retenir.push(presentation.join(' '));
  const visites = dossier.visites ?? [];
  const zonesTouchees = new Set(list.map((d) => d.zoneCode).filter(Boolean)).size;
  if (list.length) {
    const parts = (['P1', 'P2', 'P3'] as Priority[]).map((p) => {
      const n = byP(p).length;
      if (!n) return '';
      return p === 'P1' ? `${nb(n)} ${pl(n, 'est urgent', 'sont urgents')}` : p === 'P2' ? `${nb(n)} ${pl(n, 'est à programmer', 'sont à programmer')}` : `${nb(n)} ${pl(n, 'relève', 'relèvent')} de la surveillance ou de l’entretien`;
    }).filter(Boolean);
    retenir.push(`${visites.length > 1 ? `Les ${nb(visites.length, true)} visites ont permis` : `La visite${meta.dateVisite ? ` du ${fmtDate(meta.dateVisite)}` : ''} a permis`} de relever ${nb(list.length)} ${pl(list.length, 'désordre')}${zonesTouchees ? `, répartis dans ${nb(zonesTouchees, true)} ${pl(zonesTouchees, 'zone')}` : ''} : ${joinFr(parts)}.`);
  } else {
    retenir.push('Aucun désordre n’a été relevé à ce stade du diagnostic.');
  }
  const familles = Object.entries(list.reduce<Record<string, number>>((acc, d) => { const f = familleOf(d); acc[f] = (acc[f] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  if (familles.length && familles[0][0] !== 'Autres') {
    const [f, n] = familles[0];
    const lib: Record<string, string> = { 'Eau & humidité': 'à l’eau et à l’humidité', 'Fissures & structure': 'aux mouvements de la structure', 'Pierre & enduits': 'à l’état des maçonneries et des enduits', Bois: 'à l’état des bois de structure' };
    retenir.push(`${n > list.length / 2 ? 'La majorité' : 'Une part importante'} des désordres est liée ${lib[f] ?? lower(f)}. ${f === 'Eau & humidité' ? 'C’est une bonne nouvelle : en traitant l’eau à sa source, on arrête la plupart des dégradations.' : ''}`.trim());
  }
  if (dossier.conclusion.bilan.trim()) retenir.push(dossier.conclusion.bilan.trim());
  const chiffres = [
    { valeur: String(list.length), libelle: pl(list.length, 'désordre relevé', 'désordres relevés') },
    { valeur: String(byP('P1').length), libelle: pl(byP('P1').length, 'urgence', 'urgences') },
    { valeur: String(zonesTouchees || dossier.zones.length), libelle: pl(zonesTouchees || dossier.zones.length, 'zone concernée', 'zones concernées') },
  ];
  if (avecBudget && list.length) {
    const sc0 = computeScenarios(dossier)[1];
    if (sc0.ttc.haut > 0) chiffres.push({ valeur: fmtRange(sc0.ttc).replace(' – ', ' à '), libelle: 'programme recommandé, toutes taxes comprises' });
  }
  blocks.push({ titre: 'Ce qu’il faut retenir', paragraphes: retenir, style: 'retenir', chiffres: list.length ? chiffres : undefined });

  if (!list.length) return blocks;

  /* 2. Origine des désordres */
  const origines: Block[] = familles.filter(([f]) => FAMILLE_GUIDE[f]).map(([f]) => ({
    titre: FAMILLE_GUIDE[f].titre,
    paragraphes: [FAMILLE_GUIDE[f].texte, 'Dans votre bâtiment, cela concerne :'],
    puces: list.filter((d) => familleOf(d) === f).map((d) => `${d.type} (${where(d)}, fiche ${d.numero})`),
  }));
  if (origines.length) blocks.push({ titre: 'Comprendre l’origine des désordres', paragraphes: ['Les désordres d’un bâtiment ancien ont presque toujours une cause commune. Les comprendre permet de traiter la source plutôt que les symptômes.'], sous: origines, style: 'cartes' });

  /* 3. Urgences */
  const urgents = byP('P1');
  blocks.push({
    titre: 'Ce qui doit être fait rapidement',
    paragraphes: urgents.length
      ? [`${nb(urgents.length, false).replace(/^./, (c) => c.toUpperCase())} ${pl(urgents.length, 'désordre demande', 'désordres demandent')} une intervention rapide, car ${pl(urgents.length, 'il met', 'ils mettent')} en jeu la sécurité ou ${pl(urgents.length, 'aggrave', 'aggravent')} chaque mois l’état du bâtiment.${avecBudget && totals.P1.haut > 0 ? ` Le budget correspondant est estimé ${totals.P1.bas === totals.P1.haut ? `à ${fmtRange(totals.P1)}` : `entre ${fmtRange(totals.P1).replace(' – ', ' et ')}`} hors taxes.` : ''}`]
      : ['Aucun désordre ne nécessite d’intervention d’urgence. Les travaux peuvent être planifiés sereinement, en respectant l’ordre décrit ci-après.'],
    puces: urgents.map((d) => `${d.type} — ${where(d)} : ${lower(firstSentence(precoOf(d)) || 'intervention à définir')}`),
    style: 'urgent',
  });

  /* 4. Feuille de route */
  const humid = familles.some(([f]) => f === 'Eau & humidité');
  const plan = new Map(dossier.planning.map((p) => [p.phase, p]));
  const etapes = roadmap(list).filter((ph) => ph.items.length || (ph.phase === 3 && humid));
  const etapeBlocks: Block[] = etapes.map((ph, i) => {
    const r: Range = ph.items.reduce((a, d) => ({ bas: a.bas + (d.chiffrage.bas ?? 0), haut: a.haut + (d.chiffrage.haut ?? d.chiffrage.bas ?? 0) }), { bas: 0, haut: 0 });
    const lots = [...new Set(ph.items.map((d) => d.lot).filter(Boolean))];
    const duree = plan.get(ph.phase)?.duree;
    const infos = [
      avecBudget && r.haut > 0 ? `Budget indicatif de l’étape : ${fmtRange(r).replace(' – ', ' à ')} hors taxes.` : '',
      duree ? `Durée indicative : ${duree} ${pl(duree, 'semaine')}.` : '',
      lots.length ? `Corps de métier : ${joinFr(lots.map(lower))}.` : '',
    ].filter(Boolean).join(' ');
    return {
      titre: `Étape ${i + 1} — ${ph.titre}`,
      paragraphes: [PHASE_GUIDE[ph.phase], ...(infos ? [infos] : [])],
      puces: ph.items.map((d) => `${d.type} (${where(d)}) : ${lower(firstSentence(precoOf(d)) || 'à définir')}`),
    };
  });
  if (avecEtapes) blocks.push({
    style: 'etapes',
    titre: 'Votre feuille de route, étape par étape',
    paragraphes: ['Dans un bâtiment ancien, l’ordre des travaux compte autant que les travaux eux-mêmes : refaire un enduit avant d’avoir arrêté l’eau, ou isoler un mur encore humide, revient à payer deux fois. Voici l’ordre que nous vous recommandons.'],
    sous: etapeBlocks,
  });

  if (!avecEtapes) {
    const groupes: [Priority, string, string][] = [
      ['P1', 'D’abord : sécuriser et arrêter l’eau', 'Ces interventions conditionnent toutes les autres.'],
      ['P2', 'Ensuite : traiter les causes et consolider', 'À programmer une fois les urgences réglées et le bâti asséché.'],
      ['P3', 'Enfin : surveiller et entretenir', 'Sans urgence, mais à ne pas oublier.'],
    ];
    blocks.push({
      style: 'priorites',
      titre: 'Par où commencer',
      paragraphes: ['Dans un bâtiment ancien, l’ordre des interventions compte autant que les interventions elles-mêmes : on arrête l’eau, on laisse sécher, on consolide, puis seulement on finit. Pour chaque désordre, les fiches détaillent les différentes solutions possibles.'],
      sous: groupes.filter(([p]) => byP(p).length).map(([p, titre, texte]) => ({
        titre, paragraphes: [texte],
        puces: byP(p).map((d) => `${d.type} (${where(d)}) : ${lower(firstSentence(precoOf(d)) || 'solutions à étudier')}`),
      })),
    });
  }

  /* 5. Avant les travaux */
  const inv = list.filter((d) => d.investigations.trim());
  if (inv.length) {
    blocks.push({
      titre: 'Avant de lancer les travaux',
      style: 'avant',
      paragraphes: ['Certaines causes ne peuvent pas être confirmées par une simple observation. Les vérifications suivantes coûtent peu au regard des travaux et évitent de mauvaises décisions :'],
      puces: inv.map((d) => `${d.type} (${where(d)}) : ${lower(firstSentence(d.investigations))}`),
    });
  }

  /* 6. Budget */
  const sc = computeScenarios(dossier);
  const budgetSouhait = dossier.souhaits.find((s) => /budget/i.test(s.rubrique));
  if (avecBudget && sc[2].ht.haut > 0) {
    blocks.push({
      style: 'budget',
      titre: 'Quel budget prévoir ?',
      paragraphes: [
        `Les montants ci-dessous comprennent une provision pour aléas de ${dossier.finances.aleasPct} % et la taxe sur la valeur ajoutée à ${dossier.finances.tvaPct.toLocaleString('fr-FR')} %. Ce sont des ordres de grandeur, à confirmer par des devis d’entreprises.`,
        `Pour traiter uniquement les urgences (scénario A), prévoyez entre ${fmtRange(sc[0].ttc).replace(' – ', ' et ')}. Le programme de conservation durable (scénario B), que nous recommandons, représente entre ${fmtRange(sc[1].ttc).replace(' – ', ' et ')} : il traite les causes et protège durablement le bâtiment. La restauration complète (scénario C), finitions comprises, se situe entre ${fmtRange(sc[2].ttc).replace(' – ', ' et ')}.`,
        ...(budgetSouhait?.besoin ? [`Vous nous avez indiqué l’objectif suivant : « ${budgetSouhait.besoin} ». Si l’enveloppe ne permet pas de tout engager, les étapes peuvent être étalées dans le temps, à condition de respecter leur ordre.`] : []),
      ],
    });
  }

  /* 7. Souhaits */
  const autres = dossier.souhaits.filter((s) => s.besoin.trim() && s !== budgetSouhait);
  if (autres.length) {
    blocks.push({
      style: 'objectifs',
      titre: 'Vos objectifs',
      paragraphes: ['Vous nous avez fait part des objectifs suivants. La feuille de route en tient compte : les aménagements interviennent une fois le bâti assaini et consolidé, pour qu’ils durent.'],
      puces: autres.map((s) => `${s.besoin} (${s.importance === 'essentiel' ? 'essentiel' : s.importance === 'souhaite' ? 'souhaité' : 'optionnel'})`),
    });
  }

  /* 8. À éviter */
  const eviter = [...new Set([...familles.flatMap(([f]) => A_EVITER[f] ?? []), ...A_EVITER.tous])];
  blocks.push({
    style: 'eviter',
    titre: 'Les erreurs à éviter',
    paragraphes: ['Les solutions modernes ne sont pas toujours adaptées au bâti ancien. Pour votre bâtiment, nous vous déconseillons en particulier de :'],
    puces: eviter.map((t) => lower(t)),
    apres: [`La règle à garder en tête : ${lower(REGLE_OR)}`],
  });

  /* 9. Entretien */
  const surveiller = byP('P3');
  const temoins = list.some((d) => /témoin|saugnac/i.test(d.investigations + d.preconisation));
  blocks.push({
    style: 'entretien',
    titre: 'Entretien et surveillance',
    paragraphes: ['Un bâtiment ancien bien entretenu dure des siècles. Quelques gestes simples prolongent l’effet des travaux :'],
    puces: [
      'nettoyer gouttières et chéneaux au moins deux fois par an, et après les tempêtes.',
      'vérifier la couverture et les solins à la sortie de l’hiver.',
      'aérer régulièrement les caves et les pièces humides.',
      ...(temoins ? ['relever les témoins posés sur les fissures tous les trois mois et noter leur évolution.'] : []),
      ...surveiller.map((d) => `${d.type} (${where(d)}) : ${lower(firstSentence(precoOf(d)) || 'à surveiller.')}`),
    ],
  });

  /* 10. Mot de l'expert */
  if (dossier.conclusion.conclusion.trim()) blocks.push({ style: 'citation', titre: 'Le mot de l’expert', paragraphes: dossier.conclusion.conclusion.split(/\n+/).filter(Boolean) });

  return blocks;
}

export const PRIORITY_WORDS = (p: Priority) => PRIORITY[p].court;
