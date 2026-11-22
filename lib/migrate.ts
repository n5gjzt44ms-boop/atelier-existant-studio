import { DELIVERABLES, LEGACY_TYPES } from './constants';
import type { DeliverableType, Dossier } from './types';
import { metiersDe, versMetier } from './catalogue';

/** Met à niveau un dossier enregistré avec une version précédente de l'application. */
export function normalizeDossier(d: Dossier): Dossier {
  const type: DeliverableType = (DELIVERABLES as Record<string, unknown>)[d.type] ? d.type : LEGACY_TYPES[d.type as string] ?? 'conseil';
  return {
    ...d,
    type,
    meta: { ...d.meta, titreMission: DELIVERABLES[type].titre },
    visites: d.visites ?? [],
    commercial: d.commercial ?? { devis: [], factures: [] },
    consultation: d.consultation ? { ...d.consultation, lots: (d.consultation.lots ?? []).map((l) => ({ ...l, lot: versMetier(l.lot, l.description) })) } : { lots: [], offres: [], analyse: '' },
    // Corps d'état : des métiers (« Façadier », « Couvreur-zingueur »…) plutôt que des ouvrages
    desordres: (d.desordres ?? []).map((x) => metiersDe(x, `${x.type} ${x.preconisation}`)),
    annuaire: (d.annuaire ?? []).map((e) => ({ ...e, lot: versMetier(e.lot) })),
  };
}
