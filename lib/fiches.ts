/**
 * Fiches désordres : numérotation (par zone, puis du moins urgent au plus urgent), complément
 * automatique depuis la bibliothèque, propositions d'amélioration et apprentissage de la bibliothèque
 * à partir des fiches relues.
 */
import type { Desordre, Dossier, Priority, Zone } from './types';
import type { DesordreTemplate } from './templates';
import type { PreconisationType } from './preconisations';
import { estAncienLot, metiersDe, ressemblance, sansAccent } from './catalogue';
import { DEFAULT_PHASE, PRIORITY } from './constants';
import { lotsDe } from './factory';

/* ───────────── Numérotation ───────────── */
/** Ordre de lecture : P3 (à moyen terme) d'abord, P1 (urgent) en dernier, pour ne pas inquiéter d'emblée. */
const RANG_URGENCE: Record<Priority, number> = { P3: 0, P2: 1, P1: 2 };
const numeroDe = (n: string) => parseInt(n.replace(/\D/g, ''), 10) || 0;

/** Classe les fiches par zone (ordre des zones du dossier), puis du moins urgent au plus urgent, et les renumérote D-001, D-002… */
export function renumeroter(d: Dossier): Dossier {
  const rangZone = (c: string) => { const i = d.zones.findIndex((z) => z.code === c); return i < 0 ? 9999 : i; };
  const tries = [...d.desordres].sort((a, b) =>
    Number(!!a.general) - Number(!!b.general) || rangZone(a.zoneCode) - rangZone(b.zoneCode) || RANG_URGENCE[a.priorite] - RANG_URGENCE[b.priorite] || numeroDe(a.numero) - numeroDe(b.numero));
  let change = tries.some((x, i) => x !== d.desordres[i]);
  const renum = tries.map((x, i) => {
    const numero = 'D-' + String(i + 1).padStart(3, '0');
    if (x.numero === numero) return x;
    change = true;
    return { ...x, numero };
  });
  return change ? { ...d, desordres: renum } : d;
}

/* ───────────── Hypothèse à vérifier ───────────── */
export const A_VERIFIER = 'Hypothèse à vérifier par investigation spécifique.';
/** Retire de l'analyse l'ancienne phrase automatique (la mention est désormais gérée par la case à cocher). */
export const sansMentionVerif = (t: string) => t.replace(/\s*Hypothèse à vérifier par investigation spécifique\.?/g, '').trim();
export const PRECISIONS_VERIF = [
  'la nature du liant (ciment ou chaux) reste à confirmer par une analyse de mortier',
  'la présence de ciment reste à confirmer par une analyse de mortier',
  'l’origine du désordre reste à confirmer par des investigations complémentaires',
  'l’état des éléments dissimulés reste à confirmer par des sondages',
  'l’activité des fissures reste à confirmer par un suivi (fissuromètres)',
  'la présence d’une infestation active reste à confirmer par un diagnostiqueur agréé',
  'l’état des appuis et des ancrages reste à confirmer après purge des revêtements',
];
/** Phrase affichée dans le livrable sous l'analyse. */
export const phraseVerif = (d: Pick<Desordre, 'aVerifier' | 'aVerifierPrecision'>) =>
  !d.aVerifier ? '' : d.aVerifierPrecision?.trim() ? `Hypothèse à vérifier : ${d.aVerifierPrecision.trim().replace(/\.$/, '')}.` : A_VERIFIER;

/* ───────────── Bibliothèque ↔ fiches ───────────── */
const egal = (a: string, b: string) => sansAccent(a).trim() === sansAccent(b).trim();
/** Désordre type correspondant à une fiche : même nom, ancien nom fusionné, ou nom très proche. */
export function modeleDe(lib: { desordres: DesordreTemplate[] }, type: string): { t: DesordreTemplate; exact: boolean } | null {
  if (!type.trim()) return null;
  const exact = lib.desordres.find((x) => egal(x.type, type) || (x.alias ?? []).some((a) => egal(a, type)));
  if (exact) return { t: exact, exact: true };
  let best: DesordreTemplate | null = null, s = 0;
  for (const x of lib.desordres) { const r = ressemblance(x.type, type); if (r > s) { s = r; best = x; } }
  return best && s >= 0.6 ? { t: best, exact: false } : null;
}

const vide = (t: string | undefined) => !t || !t.trim() || t.trim() === '—';

/** Remplit les champs vides d'une fiche avec le désordre type (sans toucher à ce qui est déjà rédigé). */
export function completerFiche(d: Desordre, lib: { desordres: DesordreTemplate[]; preconisations: PreconisationType[] }, mode?: Dossier['type']): { fiche: Desordre; champs: string[] } {
  const m = modeleDe(lib, d.type);
  if (!m) return { fiche: d, champs: [] };
  const t = m.t;
  const champs: string[] = [];
  let f: Desordre = { ...d };
  const prendre = (k: 'constat' | 'analyse' | 'investigations' | 'preconisation', v: string, nom: string) => {
    if (vide(f[k]) && !vide(v)) { f = { ...f, [k]: k === 'analyse' ? sansMentionVerif(v) : v }; champs.push(nom); }
  };
  prendre('constat', t.constat, 'constat');
  if (mode !== 'avis') {
    prendre('analyse', t.analyse, 'analyse');
    // Les investigations sont facultatives : reprises seulement pour une fiche à rédiger entièrement ou une hypothèse à vérifier
    if (vide(d.constat) || d.aVerifier) prendre('investigations', t.investigations, 'investigations');
    const precos = lib.preconisations.filter((p) => p.pour?.includes(t.type));
    if (mode === 'diagnostic') {
      if (!(f.solutions ?? []).length && vide(f.preconisation)) {
        const sol = precos.length ? precos.slice(0, 3).map((p) => ({ id: Math.random().toString(36).slice(2, 10), titre: p.titre, texte: p.texte })) : t.preconisation ? [{ id: Math.random().toString(36).slice(2, 10), titre: 'Solution proposée', texte: t.preconisation }] : [];
        if (sol.length) { f = { ...f, solutions: sol }; champs.push('solutions'); }
      }
    } else prendre('preconisation', t.preconisation || precos[0]?.texte || '', 'préconisation');
  }
  if (vide(f.element) && t.element) { f = { ...f, element: t.element }; champs.push('élément'); }
  if (!lotsDe(f).length && lotsDe(t).length) { f = { ...f, lots: lotsDe(t), lot: lotsDe(t)[0] }; champs.push('corps d’état'); }
  if (!f.famille || f.famille === 'À catégoriser') f = { ...f, famille: t.famille };
  if (!m.exact) f = { ...f, type: t.type };
  if (champs.length) f = { ...f, aRelire: true, aVerifier: f.aVerifier || (/Hypothèse à vérifier/.test(t.analyse) && champs.includes('analyse')) };
  return { fiche: f, champs };
}

export interface Suggestion {
  id: string;
  texte: string;
  /** Modification proposée de la fiche (absente : simple remarque) */
  appliquer?: (d: Desordre) => Desordre;
  /** La suggestion concerne la bibliothèque (ajouter ce désordre comme modèle) */
  biblio?: boolean;
}

/** Propositions d'amélioration d'une fiche, à partir de la bibliothèque et des règles de rédaction. */
export function suggestions(d: Desordre, lib: { desordres: DesordreTemplate[]; preconisations: PreconisationType[] }, mode: Dossier['type']): Suggestion[] {
  const s: Suggestion[] = [];
  const m = modeleDe(lib, d.type);
  const t = m?.t;
  if (!d.type.trim() || d.type === 'À qualifier') s.push({ id: 'type', texte: 'Le désordre n’est pas encore nommé : choisissez un désordre type pour pré-rédiger la fiche.' });
  else if (!m) s.push({ id: 'biblio', texte: `« ${d.type} » n’est pas dans votre bibliothèque : l’y ajouter pour le retrouver dans vos prochains dossiers.`, biblio: true });
  else if (!m.exact) s.push({ id: 'proche', texte: `Ce désordre ressemble à « ${t!.type} » de votre bibliothèque : reprendre ce nom pour profiter de ses textes ?`, appliquer: (x) => ({ ...x, type: t!.type, famille: t!.famille }) });

  if (t) {
    const c = completerFiche({ ...d, type: t.type }, lib, mode);
    if (c.champs.length) s.push({ id: 'completer', texte: `Compléter les champs vides avec le désordre type : ${c.champs.join(', ')}.`, appliquer: (x) => completerFiche(x, lib, mode).fiche });
    if (!vide(d.constat) && d.constat.trim().length < 60 && t.constat.trim().length > d.constat.trim().length + 40)
      s.push({ id: 'constat-court', texte: 'Constat très court : ajouter le texte type à la suite pour le détailler.', appliquer: (x) => ({ ...x, constat: `${x.constat.trim()}\n${t.constat}`, aRelire: true }) });
    if (d.priorite !== t.priorite && RANG_URGENCE[t.priorite] > RANG_URGENCE[d.priorite])
      s.push({ id: 'priorite', texte: `Votre bibliothèque classe ce désordre « ${PRIORITY[t.priorite].label} » ; il est ici « ${PRIORITY[d.priorite].label} ». À confirmer selon la gravité observée.`, appliquer: (x) => ({ ...x, priorite: t.priorite, phase: DEFAULT_PHASE[t.priorite] }) });
    if (mode !== 'avis' && mode !== 'diagnostic') {
      const texteFiche = sansAccent(d.preconisation);
      for (const p of lib.preconisations.filter((x) => x.pour?.includes(t.type)).slice(0, 4)) {
        if (texteFiche.includes(sansAccent(p.texte.split('\n')[0]).slice(0, 40))) continue;
        s.push({ id: `preco-${p.id}`, texte: `Préconisation de votre bibliothèque pour ce désordre : « ${p.titre} ».`, appliquer: (x) => ({ ...x, preconisation: x.preconisation.trim() ? `${x.preconisation.trim()}\n${p.texte}` : p.texte, lots: Array.from(new Set([...lotsDe(x), ...lotsDe(p)])), lot: lotsDe(x)[0] ?? lotsDe(p)[0] ?? x.lot }) });
      }
    }
  }
  const trous = (d.constat + d.analyse + d.investigations + d.preconisation).split('…').length - 1;
  if (trous) s.push({ id: 'trous', texte: `Il reste ${trous} « … » à compléter (mesures, orientation, étendue).` });
  if (lotsDe(d).some(estAncienLot)) s.push({ id: 'metiers', texte: `Corps d’état à remplacer par des métiers : ${lotsDe(d).filter(estAncienLot).join(', ')}.`, appliquer: (x) => metiersDe(x, `${x.type} ${x.preconisation}`) });
  else if (!lotsDe(d).length && mode !== 'avis') s.push({ id: 'lots', texte: 'Aucun corps d’état : indiquez le ou les métiers qui interviendront.' });
  if (/\bciment|cimentaire|b[ée]ton\b/i.test(`${d.constat} ${d.analyse}`) && !d.aVerifier && mode !== 'avis')
    s.push({ id: 'ciment', texte: 'Le ciment n’est pas toujours identifiable à l’œil : marquer l’analyse « hypothèse à vérifier » (nature du liant à confirmer) ?', appliquer: (x) => ({ ...x, aVerifier: true, aVerifierPrecision: x.aVerifierPrecision || 'la nature du liant (ciment ou chaux) reste à confirmer par une analyse de mortier' }) });
  if (d.aVerifier && vide(d.investigations) && mode !== 'avis')
    s.push({ id: 'investig', texte: 'Hypothèse à vérifier sans investigation indiquée : précisez laquelle (analyse de mortier, sondage, suivi…).', appliquer: t?.investigations && !vide(t.investigations) ? (x) => ({ ...x, investigations: t.investigations }) : undefined });
  if (/Hypothèse à vérifier par investigation spécifique/.test(d.analyse))
    s.push({ id: 'mention', texte: 'La mention « Hypothèse à vérifier » est maintenant gérée par la case à cocher (en italique dans le livrable) : retirer la phrase du texte.', appliquer: (x) => ({ ...x, analyse: sansMentionVerif(x.analyse), aVerifier: true }) });
  if (!d.general && !d.photoEnsemble && !(d.autresPhotos ?? []).length) s.push({ id: 'photo', texte: 'Aucune photo : ajoutez-en une, ou cochez « Désordre général » s’il concerne tout le bâtiment.' });
  return s;
}

/** Désordre type tiré d'une fiche relue : les noms et codes de zone sont remplacés par « … ». */
export function ficheVersModele(d: Desordre, zone: Zone | undefined, ancien?: DesordreTemplate): DesordreTemplate {
  const general = (t: string) => {
    let r = t ?? '';
    if (zone?.code) r = r.replace(new RegExp(`\\b${zone.code.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g'), '…');
    if (zone?.nom?.trim()) r = r.replace(new RegExp(zone.nom.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '…');
    return r;
  };
  const lots = lotsDe(d);
  const preco = d.solutions?.length ? d.solutions.map((s) => s.texte).filter(Boolean).join('\n') : d.preconisation;
  return {
    ...(ancien ?? {}),
    type: d.type.trim(),
    famille: (d.famille && d.famille !== 'À catégoriser' ? d.famille : ancien?.famille ?? 'À catégoriser') as DesordreTemplate['famille'],
    element: d.element || ancien?.element || 'Mur',
    priorite: d.priorite,
    lot: lots[0] ?? ancien?.lot ?? '',
    lots: lots.length ? lots : ancien?.lots,
    unite: d.chiffrage.unite || ancien?.unite || 'forfait',
    constat: general(d.constat),
    analyse: general(sansMentionVerif(d.analyse)) + (d.aVerifier ? ` ${A_VERIFIER}` : ''),
    investigations: general(d.investigations),
    preconisation: general(preco) || ancien?.preconisation || '',
  };
}

/** Une fiche est « relue et complète » : elle peut nourrir la bibliothèque. */
export const ficheApprenable = (d: Desordre) => !d.aRelire && !!d.type.trim() && d.type !== 'À qualifier' && !vide(d.constat) && !(d.constat + d.analyse + d.preconisation).includes('…');
/** La fiche diffère-t-elle de son modèle (sinon inutile de l'enregistrer) ? */
export function ficheDiffere(d: Desordre, t: DesordreTemplate | undefined, zone?: Zone): boolean {
  if (!t) return true;
  const n = ficheVersModele(d, zone, t);
  return (['constat', 'analyse', 'investigations', 'preconisation'] as const).some((k) => sansAccent(n[k]).trim() !== sansAccent(t[k]).trim()) || n.priorite !== t.priorite || JSON.stringify(lotsDe(n)) !== JSON.stringify(lotsDe(t));
}
