'use client';
import { useMemo, useRef, useState } from 'react';
import { computeScenarios, countByPriority, fmtDate, fmtRange } from '@/lib/calc';
import { BRAND, DELIVERABLES, STATUS_LABEL } from '@/lib/constants';
import type { DeliverableType, Dossier, Status } from '@/lib/types';
import { PriorityDot } from './ui';
import { lireSauvegarde, telechargerSauvegarde } from '@/lib/storage';
import { normalizeLibrary, type Library } from '@/lib/library';
import { useLibrary } from './LibraryProvider';
import { cloudEnabled } from '@/lib/supabase';
import { etapeOf } from '@/lib/commercial';

const STATUS_STYLE: Record<Status, string> = {
  brouillon: 'border-pierre text-charbon/60',
  revision: 'border-terre text-terre',
  finalise: 'border-sauge bg-sauge text-white',
  envoye: 'border-foret bg-foret text-white',
};

export default function Dashboard({ dossiers, onOpen, onCreate, onDelete, onUpdate, onLoadSample, onImport, localToTransfer, onTransfer, filtre, setFiltre, creating, setCreating, onDevisClient, onOpenProspect }: {
  dossiers: Dossier[]; onOpen: (id: string) => void; onCreate: (t: DeliverableType) => void; onDelete: (id: string) => void; onUpdate: (d: Dossier) => void;
  onLoadSample: () => void;
  onImport: (list: Dossier[]) => number; localToTransfer: number; onTransfer: () => void;
  filtre?: 'prospects' | 'archives'; setFiltre: (f?: 'prospects' | 'archives') => void; creating: boolean; setCreating: (b: boolean) => void;
  onDevisClient: () => void; onOpenProspect: (id: string) => void;
}) {
  const archives = filtre === 'archives';
  const prospects = filtre === 'prospects';
  const affaireCount = (d: Dossier) => (d.affaireId ? dossiers.filter((x) => (x.affaireId ?? x.id) === d.affaireId).length : 0);
  const hasInvoice = (d: Dossier) => (d.commercial?.factures ?? []).some((f) => f.statut !== 'brouillon');
  const [toast, setToast] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(null), 4000); };
  const { lib, setLib } = useLibrary();
  // Bibliothèque trouvée dans une sauvegarde complète : on demande avant de remplacer la bibliothèque actuelle
  const [biblioImport, setBiblioImport] = useState<unknown>(null);
  async function importFile(f: File | undefined) {
    if (!f) return;
    try {
      const { dossiers: list, bibliotheque } = await lireSauvegarde(f);
      const n = list.length ? onImport(list) : 0;
      flash(`${n} dossier${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''}${bibliotheque ? ' — ce fichier contient aussi une bibliothèque' : ''}.`);
      if (bibliotheque) setBiblioImport(bibliotheque);
    }
    catch (e) { flash((e as Error).message || 'Fichier illisible.'); }
  }
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [q, setQ] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...dossiers]
      .filter((d) => (prospects ? !!d.prospect && !d.archive : archives ? !!d.archive : !d.archive && !d.prospect))
      .filter((d) => status === 'all' || d.status === status)
      .filter((d) => !s || [d.numero, d.meta.client.nom, d.meta.bien.commune, d.meta.bien.adresse, DELIVERABLES[d.type].titre].join(' ').toLowerCase().includes(s))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [dossiers, status, q, archives, prospects]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[36px] font-semibold leading-none text-foret">{prospects ? 'Devis en préparation' : archives ? 'Archives' : 'Dossiers'}</h1>
            <p className="mt-2 text-[14px] text-charbon/60">{prospects ? 'Propositions commerciales envoyées ou à envoyer : leur validation crée le dossier.' : `${BRAND.manifeste}.`}</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un client, une commune, un n°…" className="field min-w-0 flex-1 sm:w-72" />
            <button type="button" className="btn-primary" onClick={onDevisClient}>Nouveau devis client</button>
            <button type="button" className="btn-ghost" onClick={() => setCreating(true)}>Nouveau dossier</button>
            <button type="button" className="btn-ghost" onClick={() => fileInput.current?.click()}>Importer</button>
            <button type="button" className="btn-ghost" disabled={!dossiers.length} title="Un seul fichier avec tous les dossiers (photos comprises) et votre bibliothèque : à garder en sécurité, ou à importer sur une autre adresse"
              onClick={() => telechargerSauvegarde(dossiers, lib)}>Sauvegarde complète</button>
            <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </div>

        {biblioImport != null && (
          <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 border-sauge/50 bg-sauge-50 p-4">
            <p className="text-[14px]">Ce fichier contient aussi votre bibliothèque (désordres, préconisations, phrases, prix). La restaurer ici ? Elle remplacera la bibliothèque actuelle de cette adresse.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={() => setBiblioImport(null)}>Garder l’actuelle</button>
              <button type="button" className="btn-primary" onClick={() => { setLib(normalizeLibrary(biblioImport as Library)); setBiblioImport(null); flash('Bibliothèque restaurée.'); }}>Restaurer la bibliothèque</button>
            </div>
          </div>
        )}
        {localToTransfer > 0 && (
          <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 border-terre/50 bg-terre-50 p-4">
            <p className="text-[14px]">{localToTransfer} dossier{localToTransfer > 1 ? 's ont été créés' : ' a été créé'} sur cet appareil avant le passage en ligne.</p>
            <button type="button" className="btn-primary" onClick={() => { onTransfer(); flash('Dossiers envoyés en ligne.'); }}>Les envoyer en ligne</button>
          </div>
        )}
        {!cloudEnabled && (
          <p className="mb-5 text-[13px] text-charbon/60">Mode local : les dossiers et les photos sont enregistrés dans ce navigateur uniquement (pas de synchronisation avec la tablette). Pour passer en ligne, cliquez sur « Mode local · passer en ligne » en haut à droite.</p>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          {(['all', 'brouillon', 'revision', 'finalise', 'envoye'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={`min-h-[38px] rounded-full border px-4 text-[13px] ${status === s ? 'border-foret bg-foret text-ivoire' : 'border-pierre bg-white text-charbon/70'}`}>
              {s === 'all' ? 'Tous' : STATUS_LABEL[s]}
            </button>
          ))}
          <span className="ml-auto" />
          <button type="button" onClick={() => setFiltre(prospects ? undefined : 'prospects')} className={`min-h-[38px] rounded-full border px-4 text-[13px] ${prospects ? 'border-terre bg-terre text-white' : 'border-pierre bg-white text-charbon/60'}`}>
            Devis en préparation <span className="opacity-60">{dossiers.filter((d) => d.prospect && !d.archive).length}</span>
          </button>
          <button type="button" onClick={() => setFiltre(archives ? undefined : 'archives')} className={`min-h-[38px] rounded-full border px-4 text-[13px] ${archives ? 'border-terre bg-terre text-white' : 'border-pierre bg-white text-charbon/60'}`}>
            Archives <span className="opacity-60">{dossiers.filter((d) => d.archive).length}</span>
          </button>
        </div>

        {list.length === 0 ? (
          <div className="card px-6 py-16 text-center">
            <p className="font-serif text-xl text-foret">{dossiers.length ? 'Aucun dossier ne correspond' : 'Aucun dossier pour l’instant'}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button type="button" className="btn-primary" onClick={() => setCreating(true)}>Créer un dossier</button>
              {dossiers.length === 0 && <button type="button" className="btn-ghost" onClick={onLoadSample}>Charger le dossier d’exemple</button>}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((d) => {
              const c = countByPriority(d.desordres);
              const b = computeScenarios(d)[1];
              return (
                <article key={d.id} className="card group flex flex-col overflow-hidden transition hover:border-sauge">
                  <button type="button" onClick={() => (d.prospect ? onOpenProspect(d.id) : onOpen(d.id))} className="flex flex-1 flex-col text-left">
                    <div className="relative aspect-[16/7] bg-pierre-50">
                      {d.meta.photoCouverture
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={d.meta.photoCouverture.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        : <StoneMotif />}
                      <span className={`absolute right-3 top-3 rounded-full border bg-white px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[d.status]}`}>{STATUS_LABEL[d.status]}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="label-caps">{d.numero} · {DELIVERABLES[d.type].court}</p>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded-full bg-sauge-100 px-2 py-0.5 text-[11px] text-foret">{d.prospect ? 'Devis en préparation' : etapeOf(d)}</span>
                        {affaireCount(d) > 1 && <span className="rounded-full bg-terre-50 px-2 py-0.5 text-[11px] text-terre">{affaireCount(d)} missions pour ce bien</span>}
                      </span>
                      <p className="mt-1 font-serif text-[20px] font-semibold leading-tight text-foret">{d.meta.bien.commune || 'Sans titre'}</p>
                      <p className="mt-0.5 text-[13px] text-charbon/60">{[d.meta.client.nom, d.meta.bien.adresse].filter(Boolean).join(' · ') || 'Client et adresse à renseigner'}</p>
                      <div className="mt-auto flex items-center gap-3 pt-4 text-[12px] text-charbon/65">
                        {(['P1', 'P2', 'P3'] as const).map((p) => <span key={p} className="flex items-center gap-1"><PriorityDot p={p} size={8} />{c[p]}</span>)}
                        <span className="ml-auto whitespace-nowrap tabular-nums">{d.desordres.length && b.ttc.haut ? `Travaux : ${fmtRange(b.ttc)}` : fmtDate(d.meta.dateVisite)}</span>
                      </div>
                    </div>
                  </button>
                  <div className="flex justify-between border-t border-pierre-100 px-4 py-1.5 text-[12px] text-charbon/45">
                    <span>Modifié le {fmtDate(d.updatedAt)}</span>
                    {d.archive
                      ? <button type="button" className="hover:text-foret" onClick={() => onUpdate({ ...d, archive: false })}>Désarchiver</button>
                      : hasInvoice(d)
                        ? <button type="button" className="hover:text-foret" title="Un dossier facturé ne peut pas être supprimé (conservation des factures)" onClick={() => { onUpdate({ ...d, archive: true }); flash('Dossier archivé (les factures sont conservées).'); }}>Archiver</button>
                        : confirmId === d.id
                          ? <span className="flex gap-3"><button type="button" className="text-p1" onClick={() => onDelete(d.id)}>Confirmer</button><button type="button" onClick={() => setConfirmId(null)}>Annuler</button><button type="button" onClick={() => { onUpdate({ ...d, archive: true }); setConfirmId(null); }}>Archiver plutôt</button></span>
                          : <button type="button" className="hover:text-p1" onClick={() => setConfirmId(d.id)}>Supprimer</button>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md bg-foret px-4 py-2.5 text-[14px] text-ivoire shadow-lg">{toast}</div>}

      {creating && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-charbon/30 p-4" onClick={() => setCreating(false)}>
          <div className="card w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-2xl font-semibold text-foret">Quel livrable rédiger ?</p>
            <p className="mt-1 text-[14px] text-charbon/60">Le numéro de dossier est attribué automatiquement. Le type peut être changé ensuite.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(Object.keys(DELIVERABLES) as DeliverableType[]).map((t) => (
                <button key={t} type="button" onClick={() => { setCreating(false); onCreate(t); }} className="rounded-lg border border-pierre-100 p-4 text-left transition hover:border-sauge hover:bg-ivoire">
                  <span className="font-label text-[11px] font-semibold tracking-wider text-terre">{DELIVERABLES[t].num}</span>
                  <p className="font-serif text-lg font-semibold leading-tight text-foret">{DELIVERABLES[t].titre}</p>
                  <p className="mt-1 text-[13px] italic text-charbon/60">{DELIVERABLES[t].question}</p>
                  <p className="mt-2 text-[13px] text-charbon/75">{DELIVERABLES[t].description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Motif de pierres reprenant le logo, en l'absence de photo. */
function StoneMotif() {
  return (
    <svg viewBox="0 0 320 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="140" fill="#F3EEE6" />
      <g opacity=".75">
        <path d="M120 30 L196 30 L214 40 L122 44 Z" fill="#B97A5B" />
        <path d="M112 52 L200 48 L190 82 L108 86 Z" fill="#D6C7AF" />
        <path d="M196 74 L222 68 L224 84 L186 86 Z" fill="#C9A15A" />
        <path d="M110 96 L178 88 L186 112 L106 116 Z" fill="#BDB8AE" />
      </g>
    </svg>
  );
}
