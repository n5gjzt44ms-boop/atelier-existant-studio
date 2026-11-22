import { Q_LABELS } from './business';
import type { Dossier, Questionnaire } from './types';

export const ZONES_PERIMETRE = ['Cave et sous-sol', 'Cheminée', 'Façade', 'Pignon', 'Charpente et couverture', 'Combles', 'Plancher', 'Mur de soutènement', 'Mur de clôture', 'Dépendance', 'Escalier', 'Voûte'];

export type Perimetre = { etendue: 'complet' | 'partiel' | 'zone'; detail: string };

/** Phrase du rapport décrivant le périmètre de la mission. */
export function phrasePerimetre(p?: Perimetre): string {
  if (!p) return '';
  if (p.etendue === 'complet') return 'La mission porte sur l’ensemble du bâtiment, de l’extérieur vers l’intérieur et des fondations visibles à la couverture.';
  const d = p.detail.trim();
  if (p.etendue === 'zone') return `La mission est limitée à une seule partie de l’ouvrage${d ? ` : ${d.toLowerCase()}` : ''}. Les autres parties du bâtiment n’ont pas été examinées.`;
  return `La mission porte sur une partie du bâtiment${d ? ` : ${d.toLowerCase()}` : ''}. Les autres parties n’ont été observées que pour comprendre le fonctionnement de l’ensemble.`;
}

const vide = (s: string) => !s || !s.trim();

/**
 * Remplit la rédaction à partir du questionnaire : périmètre, typologie, accès,
 * contexte de la demande, documents et informations transmises par le client.
 * Ne remplace jamais un champ déjà rédigé : complète seulement.
 */
export function appliquerQuestionnaire(d: Dossier, q: Questionnaire): { d: Dossier; remplis: string[] } {
  const remplis: string[] = [];
  const meta = { ...d.meta };
  const contexte = { ...d.contexte };
  meta.perimetre = { etendue: q.etendue, detail: q.zonesConcernees };
  remplis.push('périmètre de la mission');
  if (q.besoin.trim() && !meta.objetMission.includes(q.besoin.trim())) {
    meta.objetMission = `${meta.objetMission.trim()}\n\nLa demande s’inscrit dans le contexte suivant : ${q.besoin.trim().replace(/\.$/, '')}.`.trim();
    remplis.push('objet de la mission');
  }
  if (vide(contexte.typologie)) {
    const t = Q_LABELS.typeBatiment[q.typeBatiment];
    const extra = [q.niveaux ? `${q.niveaux} niveau${q.niveaux > 1 ? 'x' : ''}` : '', q.surface ? `environ ${q.surface.toLocaleString('fr-FR')} m² de plancher` : ''].filter(Boolean).join(', ');
    contexte.typologie = `${t}${extra ? ` (${extra})` : ''}`;
    remplis.push('typologie');
  }
  if (vide(meta.conditionsAcces) && q.acces !== 'facile') { meta.conditionsAcces = Q_LABELS.acces[q.acces]; remplis.push('conditions d’accès'); }
  const infos = [q.documents.trim() ? `Documents transmis par le client : ${q.documents.trim()}.` : '', q.notes.trim() ? `Informations données par le client : ${q.notes.trim()}` : '', `État signalé avant la visite : ${Q_LABELS.etat[q.etat].toLowerCase()}, ${Q_LABELS.desordres[q.desordres].toLowerCase()}.`].filter(Boolean).join('\n');
  if (infos && !contexte.historique.includes(infos.split('\n')[0])) {
    contexte.historique = [contexte.historique.trim(), infos].filter(Boolean).join('\n\n');
    remplis.push('historique et informations du client');
  }
  if (q.etendue !== 'complet' && q.zonesConcernees.trim() && vide(meta.limitesVisite)) {
    meta.limitesVisite = 'Seules les parties prévues au périmètre de la mission ont été examinées.';
    remplis.push('parties non visitées');
  }
  return { d: { ...d, meta, contexte, commercial: { devis: [], factures: [], ...d.commercial, questionnaire: q } }, remplis };
}
