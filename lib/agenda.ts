import { TYPE_EVENEMENT } from './business';
import { agendaItems, type AgendaItem } from './commercial';
import type { Library } from './library';
import type { Dossier } from './types';

/** Agenda complet : rendez-vous, échéances des dossiers, rappels automatiques, actions de prospection et tâches datées. */
export function agendaComplet(lib: Library, dossiers: Dossier[]): AgendaItem[] {
  const out = agendaItems(lib.agenda, dossiers, lib.rappelsFaits);
  for (const p of lib.pistes) {
    if (p.dateAction && p.prochaineAction && !['gagne', 'perdu'].includes(p.statut)) {
      out.push({ id: `pi-${p.id}`, date: p.dateAction, titre: `${p.prochaineAction} — ${p.nom}`, type: 'prospection', auto: true, color: TYPE_EVENEMENT.prospection.color, libelleType: 'Prospection' });
    }
  }
  for (const t of lib.taches) {
    if (t.date && !t.fait) {
      const ty = t.categorie ?? 'autre';
      out.push({ id: `ta-${t.id}`, date: t.date, titre: t.texte, type: ty, dossierId: t.dossierId, auto: true, color: TYPE_EVENEMENT[ty].color, libelleType: `À faire · ${TYPE_EVENEMENT[ty].label}` });
    }
  }
  for (const a of lib.developpement.actions) {
    if (a.echeance && !a.fait) out.push({ id: `dev-${a.id}`, date: a.echeance, titre: a.titre, type: a.categorie, auto: true, color: TYPE_EVENEMENT[a.categorie].color, libelleType: `Développement · ${TYPE_EVENEMENT[a.categorie].label}` });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.heure ?? '').localeCompare(b.heure ?? ''));
}

/** Types proposés pour les rendez-vous, tâches et actions. */
export const TYPES_SAISIE = ['rdv', 'visite', 'rendu', 'relance', 'mail', 'prospection', 'administratif', 'comptabilite', 'communication', 'developpement', 'formation', 'autre'] as const;
