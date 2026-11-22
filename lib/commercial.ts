import { TYPE_EVENEMENT, type EntrepriseInfo, type Evenement, type OptionCommerciale, type Prestation } from './business';
import { uid } from './factory';
import type { Devis, Dossier, Facture, LigneCommerciale } from './types';

/* ───────────── Montants ───────────── */

export const totalLignes = (l: LigneCommerciale[]) => Math.round(l.reduce((a, x) => a + x.quantite * x.puHT, 0) * 100) / 100;

export function totaux(lignes: LigneCommerciale[], ent: EntrepriseInfo) {
  const ht = totalLignes(lignes);
  const taux = ent.regimeTva === 'assujetti' ? ent.tauxTva : 0;
  const tva = Math.round(ht * taux) / 100;
  return { ht, taux, tva, ttc: Math.round((ht + tva) * 100) / 100 };
}

export const eur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

/* ───────────── Numérotation continue (tous dossiers confondus) ───────────── */

export function nextNumeroDoc(all: Dossier[], prefix: 'DEV' | 'FAC', year = new Date().getFullYear()): string {
  const p = `${prefix}-${year}-`;
  const nums = all.flatMap((d): string[] => (prefix === 'DEV' ? (d.commercial?.devis ?? []).map((x) => x.numero) : (d.commercial?.factures ?? []).map((x) => x.numero)))
    .filter((n) => n?.startsWith(p))
    .map((n) => parseInt(n.slice(p.length), 10) || 0);
  return p + String(Math.max(0, ...nums) + 1).padStart(3, '0');
}

const addDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const today = () => new Date().toISOString().slice(0, 10);

/* ───────────── Création ───────────── */

export function newDevis(all: Dossier[], dossier: Dossier, prestations: Prestation[]): Devis {
  const p = prestations.find((x) => x.id === dossier.type) ?? prestations.find((x) => x.type === dossier.type);
  return {
    id: uid(),
    numero: nextNumeroDoc(all, 'DEV'),
    date: today(),
    validiteJours: 30,
    lignes: p ? [{ id: uid(), libelle: `${p.libelle} — ${p.detail}`, quantite: 1, unite: p.unite, puHT: p.prixConseille }] : [],
    statut: 'brouillon',
    acomptePct: 30,
    notes: '',
  };
}

export const ligneOption = (o: OptionCommerciale): LigneCommerciale => ({ id: uid(), libelle: `${o.libelle} — ${o.detail}`, quantite: 1, unite: o.unite, puHT: o.prixConseille });

export function factureDepuisDevis(devis: Devis, nature: Facture['nature'], dejaFacture: Facture[], ent: EntrepriseInfo): Facture {
  const date = today();
  let lignes: LigneCommerciale[];
  if (nature === 'acompte') {
    const montant = Math.round(totalLignes(devis.lignes) * devis.acomptePct) / 100;
    lignes = [{ id: uid(), libelle: `Acompte de ${devis.acomptePct} % sur le devis ${devis.numero}`, quantite: 1, unite: 'forfait', puHT: montant }];
  } else {
    lignes = devis.lignes.map((l) => ({ ...l, id: uid() }));
    if (nature === 'solde') {
      dejaFacture.filter((f) => f.devisId === devis.id && f.nature === 'acompte' && f.statut !== 'brouillon').forEach((f) => {
        lignes.push({ id: uid(), libelle: `Acompte déjà facturé (facture ${f.numero})`, quantite: 1, unite: 'forfait', puHT: -totalLignes(f.lignes) });
      });
    }
  }
  return { id: uid(), numero: '', date, echeance: addDays(date, ent.delaiPaiementJours), nature, devisId: devis.id, lignes, statut: 'brouillon' };
}

/* ───────────── Avancement du projet ───────────── */

export const ETAPES = ['Prospect', 'Devis envoyé', 'Devis accepté', 'Visite réalisée', 'Rapport remis', 'Facturé', 'Payé'] as const;
export type Etape = (typeof ETAPES)[number];

export function etapeOf(d: Dossier): Etape {
  const c = d.commercial ?? { devis: [], factures: [] };
  const emises = c.factures.filter((f) => f.statut !== 'brouillon');
  const accepte = c.devis.find((x) => x.statut === 'accepte');
  if (emises.length) {
    const paye = emises.filter((f) => f.statut === 'payee').reduce((a, f) => a + totalLignes(f.lignes), 0);
    const du = accepte ? totalLignes(accepte.lignes) : emises.reduce((a, f) => a + totalLignes(f.lignes), 0);
    if (emises.every((f) => f.statut === 'payee') && paye >= du - 0.01) return 'Payé';
    return 'Facturé';
  }
  if (d.status === 'finalise' || d.status === 'envoye') return 'Rapport remis';
  if ((d.visites?.length ?? 0) > 0 || d.desordres.length > 0) return 'Visite réalisée';
  if (accepte) return 'Devis accepté';
  if (c.devis.some((x) => x.statut === 'envoye')) return 'Devis envoyé';
  return 'Prospect';
}

export const enRetard = (f: Facture) => f.statut === 'emise' && f.echeance < today();

/* ───────────── Agenda : événements saisis + événements tirés des dossiers ───────────── */

export interface AgendaItem extends Evenement { auto?: boolean; color: string; libelleType: string; mail?: string }
export const estRappel = (e: AgendaItem) => e.id.startsWith("rap-") || e.id.startsWith("env-");

/** Le client est-il un particulier (acompte avant visite, droit de rétractation) ? */
export const estParticulier = (d: Dossier) => (d.meta.client.type ?? 'particulier') === 'particulier';

/** Date de rendu : celle fixée, sinon deux semaines après la création du dossier. */
export const dateRenduOf = (d: Dossier) => d.commercial?.dateRendu || addDays(d.createdAt.slice(0, 10), 14);

/**
 * Agenda : rendez-vous saisis + échéances tirées des dossiers + rappels automatiques
 * (bonne réception, paiement, photos des réalisations, accompagnement complémentaire…).
 * Un rappel marqué « fait » (identifiant dans `faits`) disparaît.
 */
export function agendaItems(manuels: Evenement[], dossiers: Dossier[], faits: string[] = []): AgendaItem[] {
  const out: AgendaItem[] = manuels.map((e) => ({ ...e, color: TYPE_EVENEMENT[e.type]?.color ?? TYPE_EVENEMENT.autre.color, libelleType: TYPE_EVENEMENT[e.type]?.label ?? 'Autre' }));
  const ev = (o: Omit<AgendaItem, 'color' | 'libelleType' | 'auto'> & { label?: string; color?: string }) => {
    if (faits.includes(o.id)) return;
    out.push({ ...o, auto: true, color: o.color ?? TYPE_EVENEMENT[o.type].color, libelleType: o.label ?? TYPE_EVENEMENT[o.type].label });
  };
  for (const d of dossiers.filter((x) => !x.archive)) {
    const nom = d.meta.client.nom || d.meta.bien.commune || d.numero;
    const lieu = [d.meta.bien.adresse, d.meta.bien.commune].filter(Boolean).join(', ');
    const visites = (d.visites ?? []).filter((v) => v.date).map((v) => ({ id: `v-${v.id}`, date: v.date, titre: `${v.libelle} — ${nom}` }));
    if (!visites.length && d.meta.dateVisite && !d.prospect) visites.push({ id: `v0-${d.id}`, date: d.meta.dateVisite, titre: `Visite — ${nom}` });
    for (const v of visites) out.push({ ...v, type: 'visite', dossierId: d.id, lieu, auto: true, color: TYPE_EVENEMENT.visite.color, libelleType: 'Visite' });

    // Livrable : rendu, envoi, rappels après envoi
    if (!d.prospect) {
      if (d.status === 'brouillon' || d.status === 'revision') {
        ev({ id: `r-${d.id}`, date: dateRenduOf(d), titre: `Rendu du rapport — ${nom}`, type: 'rendu', dossierId: d.id, label: 'Date de rendu' });
      } else if (d.status === 'finalise') {
        ev({ id: `env-${d.id}`, date: addDays(d.dates?.finalise ?? d.updatedAt.slice(0, 10), 2), titre: `Envoyer le rapport au client — ${nom}`, type: 'mail', dossierId: d.id, mail: 'envoi-rapport', label: 'Envoi du rapport (2 jours max.)' });
      } else if (d.status === 'envoye' && d.dates?.envoye) {
        const e = d.dates.envoye;
        ev({ id: `rap-recu-${d.id}`, date: addDays(e, 3), titre: `Vérifier la bonne réception du rapport — ${nom}`, type: 'relance', dossierId: d.id, mail: 'bonne-reception', label: 'Rappel : bonne réception' });
        if (d.type !== 'accompagnement') ev({ id: `rap-acc-${d.id}`, date: addDays(e, 30), titre: `Proposer un accompagnement pour les travaux — ${nom}`, type: 'mail', dossierId: d.id, mail: 'accompagnement', label: 'Rappel : accompagnement' });
        ev({ id: `rap-photos-${d.id}`, date: addDays(e, 180), titre: `Demander des photos des travaux réalisés — ${nom}`, type: 'mail', dossierId: d.id, mail: 'suivi', label: 'Rappel : photos des réalisations' });
        ev({ id: `rap-avis-${d.id}`, date: addDays(e, 15), titre: `Demander un avis ou un témoignage — ${nom}`, type: 'mail', dossierId: d.id, mail: 'avis-client', label: 'Rappel : témoignage' });
      }
    }

    // Devis et factures
    const c = d.commercial ?? { devis: [], factures: [] };
    for (const x of c.devis) {
      if (x.statut !== 'envoye') continue;
      ev({ id: `rap-dev-${x.id}`, date: addDays(x.date, 10), titre: `Relancer le devis ${x.numero} — ${nom}`, type: 'relance', dossierId: d.id, mail: 'relance-devis', label: 'Rappel : relance du devis' });
      ev({ id: `d-${x.id}`, date: addDays(x.date, x.validiteJours), titre: `Fin de validité du devis ${x.numero} — ${nom}`, type: 'relance', dossierId: d.id, label: TYPE_EVENEMENT.devis.label, color: TYPE_EVENEMENT.devis.color });
    }
    for (const f of c.factures) {
      if (f.statut !== 'emise') continue;
      out.push({ id: `f-${f.id}`, date: f.echeance, titre: `Échéance facture ${f.numero} — ${nom}`, type: 'relance', dossierId: d.id, auto: true, color: TYPE_EVENEMENT.facture.color, libelleType: TYPE_EVENEMENT.facture.label });
      ev({ id: `rap-pay-${f.id}`, date: addDays(f.echeance, 1), titre: `Relancer le paiement de la facture ${f.numero} — ${nom}`, type: 'relance', dossierId: d.id, mail: 'relance-facture', label: 'Rappel : paiement' });
    }
    // Particulier : acompte à recevoir avant la visite
    const accepte = c.devis.find((x) => x.statut === 'accepte');
    const acomptePaye = c.factures.some((f) => f.nature === 'acompte' && f.statut === 'payee');
    const prochaine = visites.map((v) => v.date).sort()[0];
    if (estParticulier(d) && accepte && accepte.acomptePct > 0 && !acomptePaye && prochaine) {
      ev({ id: `rap-acompte-${d.id}`, date: addDays(prochaine, -3), titre: `Acompte à encaisser avant la visite du ${prochaine.split('-').reverse().join('/')} — ${nom}`, type: 'comptabilite', dossierId: d.id, mail: 'demande-acompte', label: 'Rappel : acompte avant visite' });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.heure ?? '').localeCompare(b.heure ?? ''));
}

/** Fichier .ics importable dans Google Agenda, Outlook ou le calendrier du téléphone. */
export function toIcs(items: AgendaItem[]): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atelier de l Existant//Studio//FR', 'CALSCALE:GREGORIAN'];
  for (const e of items) {
    const d = e.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${e.id}@atelier-existant`, `DTSTAMP:${stamp}`);
    if (e.heure) {
      const [h, m] = e.heure.split(':').map(Number);
      const start = `${d}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
      const endMin = h * 60 + m + (e.dureeMin ?? 60);
      const end = `${d}T${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}${String(endMin % 60).padStart(2, '0')}00`;
      lines.push(`DTSTART;TZID=Europe/Paris:${start}`, `DTEND;TZID=Europe/Paris:${end}`);
    } else {
      const next = new Date(e.date); next.setDate(next.getDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`);
    }
    lines.push(`SUMMARY:${esc(e.titre)}`);
    if (e.lieu) lines.push(`LOCATION:${esc(e.lieu)}`);
    if (e.notes) lines.push(`DESCRIPTION:${esc(e.notes)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadText(name: string, text: string, type = 'text/calendar') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
