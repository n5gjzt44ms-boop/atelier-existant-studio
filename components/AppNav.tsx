'use client';
import { useEffect, useRef, useState } from 'react';
import { CATEGORIES_CONTACT, type CategorieContact } from '@/lib/business';
import { cloudEnabled } from '@/lib/supabase';
import type { SyncState } from '@/lib/storage';
import type { Dossier } from '@/lib/types';
import ConnexionDialog from './ConnexionDialog';
import type { GestionTab } from './Gestion';
import type { OngletRelation } from './RelationClient';
import { GROUPES_BIBLIO } from './LibraryEditor';
import { ASSET_BASE } from './ReportPreview';

export type Vue =
  | { k: 'accueil' }
  | { k: 'dossiers'; filtre?: 'prospects' | 'archives' }
  | { k: 'organisation'; tab: GestionTab }
  | { k: 'relation'; tab: OngletRelation; cat?: CategorieContact; mail?: { modele?: string; dossierId?: string } }
  | { k: 'bibliotheque'; groupe?: string; section?: string }
  | { k: 'devis'; id?: string; piste?: string };

interface Item { label: string; vue?: Vue; action?: () => void; sep?: boolean; hint?: string }

/** Barre du haut : tous les onglets, avec menus déroulants. */
export default function AppNav({ vue, go, onNewDossier, userEmail, onSignOut, sync, actif, dossiers, onOpen }: {
  vue: Vue | null; go: (v: Vue) => void; onNewDossier: () => void; userEmail?: string; onSignOut?: () => void; sync?: SyncState; actif?: string;
  dossiers?: Dossier[]; onOpen?: (id: string) => void;
}) {
  // Dossiers commencés mais pas finalisés (brouillon ou en révision, hors devis en préparation et archives)
  const enCours = (dossiers ?? []).filter((d) => !d.archive && !d.prospect && (d.status === 'brouillon' || d.status === 'revision'));
  const recent = [...enCours].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const ancien = [...enCours].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const court = (d: Dossier) => `${d.numero} · ${d.meta.client.nom || d.meta.titreMission || 'sans client'}`;
  const jourFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const raccourcis: Item[] = onOpen && recent ? [
    { label: `↻ Reprendre : ${court(recent)}`, action: () => onOpen(recent.id), hint: `en cours le plus récent · modifié le ${jourFr(recent.updatedAt)}` },
    ...(ancien && ancien.id !== recent.id ? [{ label: `⏳ ${court(ancien)}`, action: () => onOpen(ancien.id), hint: `en cours le plus ancien · commencé le ${jourFr(ancien.createdAt)}` }] : []),
    { label: '', sep: true },
  ] : [];
  const [open, setOpen] = useState<string | null>(null);
  const [connexion, setConnexion] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const menus: { id: string; label: string; items?: Item[]; vue?: Vue }[] = [
    { id: 'accueil', label: 'Accueil', vue: { k: 'accueil' } },
    { id: 'dossiers', label: 'Dossiers', items: [
      ...raccourcis,
      { label: 'Tous les dossiers', vue: { k: 'dossiers' } },
      { label: 'Devis en préparation', vue: { k: 'dossiers', filtre: 'prospects' } },
      { label: 'Archives', vue: { k: 'dossiers', filtre: 'archives' } },
      { label: '', sep: true },
      { label: '+ Nouveau devis client', vue: { k: 'devis' }, hint: 'présentation, offre, questionnaire' },
      { label: '+ Nouveau dossier', action: onNewDossier },
    ] },
    { id: 'organisation', label: 'Organisation', items: [
      { label: 'Résumé de l’activité', vue: { k: 'organisation', tab: 'pilotage' }, hint: 'chiffre d’affaires, avancement des dossiers' },
      { label: 'Agenda', vue: { k: 'organisation', tab: 'agenda' } },
      { label: 'Devis', vue: { k: 'organisation', tab: 'devis' } },
      { label: 'Factures et livre des recettes', vue: { k: 'organisation', tab: 'factures' } },
      { label: 'Développement de l’entreprise', vue: { k: 'organisation', tab: 'developpement' }, hint: 'objectifs, plan d’actions, idées' },
      { label: 'Mon entreprise', vue: { k: 'organisation', tab: 'entreprise' } },
    ] },
    { id: 'relation', label: 'Relation client', items: [
      { label: 'Tous les contacts', vue: { k: 'relation', tab: 'contacts' } },
      ...(Object.keys(CATEGORIES_CONTACT) as CategorieContact[]).map((c) => ({ label: `  ${CATEGORIES_CONTACT[c]}`, vue: { k: 'relation', tab: 'contacts', cat: c } as Vue })),
      { label: '', sep: true },
      { label: 'Prospection', vue: { k: 'relation', tab: 'prospection' }, hint: 'recherche de clients, prescripteurs' },
      { label: 'Modèles de mails', vue: { k: 'relation', tab: 'mails' } },
      { label: 'Supports de communication', vue: { k: 'relation', tab: 'supports' } },
      { label: 'Nos réalisations', vue: { k: 'relation', tab: 'realisations' } },
    ] },
    { id: 'bibliotheque', label: 'Bibliothèque', items: GROUPES_BIBLIO.map((g) => ({ label: g.titre, vue: { k: 'bibliotheque', groupe: g.id } as Vue })) },
  ];
  const current = actif ?? vue?.k;

  return (
    <div ref={ref} className="relative z-30 flex flex-wrap items-center gap-x-1 gap-y-1 border-b border-pierre-100 bg-white px-3 py-1.5 print:hidden">
      <button type="button" onClick={() => go({ k: 'accueil' })} className="mr-2 flex items-center gap-2" aria-label="Accueil">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ASSET_BASE}logo-mark.png`} alt="" className="h-8 w-auto" />
        <span className="hidden text-left leading-none lg:block">
          <span className="block font-serif text-[15px] font-semibold tracking-[0.1em] text-charbon">ATELIER DE L’EXISTANT</span>
          <span className="font-label text-[9px] tracking-[0.2em] text-sauge">STUDIO</span>
        </span>
      </button>
      <nav className="flex flex-wrap items-center gap-0.5">
        {menus.map((m) => (
          <div key={m.id} className="relative">
            <button type="button"
              onClick={() => (m.vue ? (go(m.vue), setOpen(null)) : setOpen(open === m.id ? null : m.id))}
              className={`min-h-[38px] rounded-md px-3 text-[13.5px] ${current === m.id ? 'bg-foret text-ivoire' : 'text-charbon/75 hover:bg-ivoire'}`}>
              {m.label}{m.items ? <span className="ml-1 text-[10px] opacity-60">▾</span> : null}
            </button>
            {open === m.id && m.items && (
              <div className="absolute left-0 top-full mt-1 w-80 rounded-lg border border-pierre-100 bg-white p-1.5 shadow-lg">
                {m.items.map((it, i) => it.sep
                  ? <div key={i} className="my-1 border-t border-pierre-100" />
                  : (
                    <button key={i} type="button" onClick={() => { setOpen(null); if (it.action) it.action(); else if (it.vue) go(it.vue); }}
                      className="block w-full rounded-md px-3 py-2 text-left text-[13.5px] hover:bg-ivoire">
                      {it.label}{it.hint && <span className="block text-[11px] text-charbon/50">{it.hint}</span>}
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2 text-[12px]">
        {userEmail && <span className={`hidden md:inline ${sync === 'error' ? 'text-p1' : 'text-charbon/55'}`}>{userEmail} · {sync === 'error' ? 'échec de synchronisation' : sync === 'saving' ? 'enregistrement…' : 'synchronisé'}</span>}
        <button type="button" onClick={() => setConnexion(true)} className={`btn-quiet text-[12px] ${cloudEnabled ? '' : 'text-terre'}`}>{cloudEnabled ? 'En ligne' : 'Mode local · passer en ligne'}</button>
        {onSignOut && <button type="button" className="btn-quiet text-[12px]" onClick={onSignOut}>Déconnexion</button>}
      </div>
      {connexion && <ConnexionDialog onClose={() => setConnexion(false)} />}
    </div>
  );
}
