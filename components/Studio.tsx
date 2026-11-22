'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DELIVERABLES, STATUS_LABEL } from '@/lib/constants';
import { downloadJson, exportPdf, openPrintDialog } from '@/lib/pdf';
import { imprimerPagine } from '@/lib/pagination';
import { renumeroter } from '@/lib/fiches';
import { normalizeDossier } from '@/lib/migrate';
import { feuillesDe } from '@/lib/pagesApercu';
import type { Dossier, Status } from '@/lib/types';
import type { SyncState } from '@/lib/storage';
import ReportPreview, { ASSET_BASE } from './ReportPreview';
import LibraryEditor from './LibraryEditor';
import CommercialStep from './CommercialStep';
import ConsultationStep from './ConsultationStep';
import CommercialDoc from './CommercialDoc';
import { useLibrary } from './LibraryProvider';
import { StepAnnuaire, StepContexte, StepDesordres, StepMesures, StepPhotos, StepProjet, StepSynthese, StepZones, type Affaire } from './steps';
import { StepClasseur, StepPreconisations, StepVigilance } from './steps2';
import DossierAccueil, { avancement, nouvelleVersion, StepEnvois } from './DossierAccueil';

type StepKey = 'accueil' | 'projet' | 'contexte' | 'zones' | 'photos' | 'desordres' | 'mesures' | 'vigilance' | 'preconisations' | 'synthese' | 'annuaire' | 'consultation' | 'classeur' | 'commercial' | 'envois';
const GESTION: StepKey[] = ['commercial', 'classeur', 'envois'];
const STEP_LABEL: Record<StepKey, string> = {
  projet: 'Projet', contexte: 'Contexte', zones: 'Zones', photos: 'Photos', desordres: 'Désordres',
  mesures: 'Mesures', vigilance: 'Vigilance et études', preconisations: 'Préconisations', synthese: 'Synthèse', annuaire: 'Annuaire',
  consultation: 'Consultation', classeur: 'Classeur', commercial: 'Devis et factures', accueil: 'Vue d’ensemble', envois: 'Livrables envoyés',
};
const stepLabel = (s: StepKey, type: Dossier['type']) => (s === 'synthese' && type === 'avis' ? 'Avis général' : s === 'desordres' && type === 'avis' ? 'Relevé des désordres' : STEP_LABEL[s]);

/** Page du rapport affichée dans l'aperçu quand on change d'étape */
const STEP_ANCHOR: Record<StepKey, string[]> = {
  projet: ['cover'], contexte: ['lieu', 'contexte'], zones: ['zones', 'constatsZones', 'exterieur'], photos: ['reportage', 'constatsZones'],
  desordres: ['fiches', 'desordresListe', 'constatsZones'], mesures: ['mesures'], synthese: ['syntheseRedigee', 'preconisations', 'conclusion'], annuaire: ['annuaire'], consultation: ['consultation', 'comparatif'], commercial: ['cover'],
  vigilance: ['vigilance', 'etudes'], preconisations: ['preconisationsDiag', 'mesures'], classeur: ['cover'], accueil: ['cover'], envois: ['cover'],
};

/** Page du livrable → étape de rédaction où elle se modifie (clic dans l'aperçu). */
const ANCHOR_STEP: Record<string, StepKey> = {
  cover: 'projet', objet: 'projet', manifeste: 'projet', limites: 'projet', accompagnement: 'projet',
  lieu: 'contexte', contexte: 'contexte', souhaits: 'contexte',
  zones: 'zones', exterieur: 'zones', constatsZones: 'zones',
  reportage: 'photos', annexes: 'photos',
  fiches: 'desordres', desordresListe: 'desordres', causes: 'desordres', investigations: 'desordres', precos: 'desordres',
  mesures: 'mesures', tiers: 'mesures', vigilance: 'vigilance', etudes: 'vigilance', preconisationsDiag: 'preconisations',
  synthese: 'synthese', syntheseRedigee: 'synthese', feuille: 'synthese', planning: 'synthese', scenarios: 'synthese', conclusion: 'synthese', preconisations: 'synthese', guides: 'synthese',
  annuaire: 'annuaire', consultation: 'consultation', comparatif: 'consultation',
};

function stepsFor(type: Dossier['type']): StepKey[] {
  const s: StepKey[] = ['projet', 'contexte', 'zones', 'photos', 'desordres'];
  if (type === 'avis') s.push('vigilance');
  if (type === 'diagnostic') s.push('preconisations');
  s.push('synthese');
  if (type === 'conseil' || type === 'accompagnement') s.push('annuaire');
  if (type === 'accompagnement') s.push('consultation');
  return s;
}

/** Studio de rédaction : étapes à gauche, saisie au centre, livrable en direct à droite. */
const SYNC_LABEL: Record<SyncState, string> = {
  local: 'enregistré sur cet appareil',
  saving: 'enregistrement…',
  saved: 'enregistré en ligne',
  error: 'échec de l’enregistrement',
};

type PrintState = null | { kind: 'rapport' } | { kind: 'version'; d: Dossier } | { kind: 'devis' | 'facture'; id: string };

export default function Studio({ initial, onSave, onBack, sync, onRetry, allDossiers = [], topNav, affaire, onMail }: { initial: Dossier; onSave: (d: Dossier) => void; onBack: () => void; sync: SyncState; onRetry: () => void; allDossiers?: Dossier[]; topNav?: React.ReactNode; affaire?: Affaire; onMail?: (modele?: string) => void }) {
  const [dossier, setDossier] = useState(() => renumeroter(normalizeDossier(initial)));
  const [step, setStep] = useState<StepKey>('accueil');
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<'saisie' | 'apercu'>('saisie'); // écrans étroits
  // Grand écran : l'aperçu peut être rangé pour agrandir l'espace de rédaction (choix mémorisé)
  const [apercuRange, setApercuRange] = useState(false);
  useEffect(() => { try { setApercuRange(localStorage.getItem('atelier-apercu-range') === '1'); } catch { /* rien */ } }, []);
  const rangerApercu = (v: boolean) => { setApercuRange(v); try { localStorage.setItem('atelier-apercu-range', v ? '1' : '0'); } catch { /* rien */ } };
  const [printing, setPrinting] = useState<PrintState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const past = useRef<Dossier[]>([]);
  const future = useRef<Dossier[]>([]);
  const lastPush = useRef(0);
  const [, forceHist] = useState(0);

  const update = useCallback((input: Dossier) => {
    // La date du rapport suit la date du jour de rédaction, sauf si elle a été fixée à la main
    const today = new Date().toISOString().slice(0, 10);
    // Numéros des fiches : par zone, puis du moins urgent au plus urgent, toujours à partir de D-001
    const d = renumeroter(!input.meta.dateRapportFixe && input.meta.dateRapport !== today ? { ...input, meta: { ...input.meta, dateRapport: today } } : input);
    setDossier((prev) => {
      const now = Date.now();
      if (now - lastPush.current > 800) { past.current = [...past.current.slice(-99), prev]; lastPush.current = now; future.current = []; forceHist((n) => n + 1); }
      return d;
    });
  }, []);

  /** Retour en arrière / rétablir : jusqu'à 100 étapes. */
  const undo = useCallback(() => {
    setDossier((cur) => {
      const prev = past.current.pop();
      if (!prev) return cur;
      future.current = [cur, ...future.current].slice(0, 100);
      lastPush.current = 0;
      return prev;
    });
    forceHist((n) => n + 1);
  }, []);
  const redo = useCallback(() => {
    setDossier((cur) => {
      const next = future.current.shift();
      if (!next) return cur;
      past.current = [...past.current, cur];
      lastPush.current = 0;
      return next;
    });
    forceHist((n) => n + 1);
  }, []);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; } // ouvrir un dossier ne le modifie pas
    onSave(dossier);
  }, [dossier, onSave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const champ = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (champ || !(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => {
      const doc = printing.kind === 'devis' ? dossier.commercial?.devis.find((x) => x.id === printing.id) : printing.kind === 'facture' ? dossier.commercial?.factures.find((x) => x.id === printing.id) : null;
      if (printing.kind === 'rapport' || printing.kind === 'version') {
        const src = document.getElementById('rapport-impression');
        const titre = printing.kind === 'version' ? `${dossier.numero} — version envoyée` : `${dossier.numero} — ${DELIVERABLES[dossier.type].titre}`;
        (src ? imprimerPagine(src, titre, `L’Atelier de l’Existant · ${dossier.numero} · ${DELIVERABLES[dossier.type].titre}`) : Promise.resolve(false)).then((pagine) => {
          if (!pagine) openPrintDialog(titre);
          setPrinting(null);
        });
        return;
      }
      const ok = openPrintDialog(doc ? `${doc.numero || 'Facture brouillon'} — ${dossier.meta.client.nom || dossier.numero}` : `${dossier.numero} — ${DELIVERABLES[dossier.type].titre}`);
      setPrinting(null);
      if (!ok) setNotice('L’impression est bloquée dans cet aperçu intégré. Une fois l’application déployée (npm run build), le bouton génère le PDF directement.');
    }, 150);
    return () => clearTimeout(t);
  }, [printing, dossier]);

  const [confirmExport, setConfirmExport] = useState(false);
  async function handleExport(force = false) {
    const pending = dossier.desordres.filter((d) => d.aRelire).length;
    if (pending && !force) { setConfirmExport(true); return; }
    setConfirmExport(false);
    const r = await exportPdf(dossier);
    if (r === 'needs-print') setPrinting({ kind: 'rapport' });
  }

  const steps = stepsFor(dossier.type);
  const current: StepKey = steps.includes(step) || GESTION.includes(step) || step === 'accueil' ? step : 'accueil';
  const redaction = steps.includes(current);
  const idx = steps.indexOf(current);
  const etapes = avancement(dossier, steps.map((k) => ({ key: k, label: stepLabel(k, dossier.type) })));

  /** Statut du livrable : dates pour l'agenda ; « envoyé » archive la version dans le classeur. */
  const setStatut = (st: Status) => {
    const t = new Date().toISOString().slice(0, 10);
    let d: Dossier = { ...dossier, status: st, dates: { ...dossier.dates } };
    if (st === 'finalise') d.dates!.finalise = t;
    if (st === 'envoye') {
      d.dates!.envoye = t;
      const c = d.classeur ?? { echanges: [], documents: [] };
      d = { ...d, classeur: { ...c, versions: [...(c.versions ?? []), nouvelleVersion(d)] } };
      setNotice('Version archivée dans « Livrables envoyés ». Rappels programmés : bonne réception (3 jours), témoignage (15 jours), accompagnement (1 mois), photos des réalisations (6 mois).');
    }
    update(d);
  };
  /** Clic dans l'aperçu : ouvre l'étape (et la fiche, et le champ) correspondant à l'endroit cliqué. */
  const naviguer = (cible: { desordre?: string; anchor?: string; champ?: string }) => {
    const fiche = cible.desordre ?? (cible.anchor && dossier.desordres.some((d) => d.id === cible.anchor) ? cible.anchor : undefined);
    if (fiche) {
      setStep('desordres'); setOpenId(fiche); setView('saisie');
      setTimeout(() => {
        const box = document.getElementById('form-scroll');
        const el = cible.champ ? box?.querySelector<HTMLElement>(`[data-champ="${cible.champ}"]`) : null;
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.querySelector<HTMLElement>('textarea, input')?.focus({ preventScroll: true }); }
        else box?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 80);
      return;
    }
    const k = cible.anchor ? ANCHOR_STEP[cible.anchor] : undefined;
    if (!k) return;
    const s = k === 'desordres' && cible.anchor === 'precos' && steps.includes('preconisations') ? 'preconisations' : k;
    if (steps.includes(s)) goStep(s);
  };
  const goStep = (s: StepKey) => { setStep(s); setOpenId(null); setView('saisie'); document.getElementById('form-scroll')?.scrollTo({ top: 0 }); };

  return (
    <>
      <div className="flex h-[100dvh] flex-col print:hidden">
        {topNav}
        {/* Barre supérieure */}
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-pierre-100 bg-white px-4 py-2.5">
          <button type="button" onClick={onBack} className="flex items-center gap-2.5" aria-label="Retour aux dossiers">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {!topNav && <img src={`${ASSET_BASE}logo-mark.png`} alt="" className="h-8 w-auto" />}
            <span className="hidden text-left sm:block">
              <span className="block font-serif text-[15px] font-semibold leading-none tracking-wide text-charbon">Atelier de l’Existant</span>
              <span className="text-[11px] text-sauge">← Dossiers</span>
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium">{DELIVERABLES[dossier.type].titre}{dossier.meta.bien.commune ? ` — ${dossier.meta.bien.commune}` : ''}</p>
            <p className="text-[12px] text-charbon/55">
              {dossier.numero} · {DELIVERABLES[dossier.type].court} ·{' '}
              <span className={sync === 'error' ? 'text-p1' : ''}>{SYNC_LABEL[sync]}</span>
              {sync === 'error' && <button type="button" onClick={onRetry} className="ml-2 underline">Réessayer</button>}
            </p>
          </div>
          <select value={dossier.status} onChange={(e) => setStatut(e.target.value as Status)} className="field w-auto py-1.5 text-[13px]" aria-label="Statut">
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button type="button" onClick={() => setShowLibrary(true)} className="btn-quiet hidden text-[13px] md:inline-flex">Bibliothèque</button>
          <span className="inline-flex overflow-hidden rounded-md border border-pierre">
            <button type="button" onClick={undo} disabled={!past.current.length} className="px-2.5 py-1.5 text-[13px] hover:bg-ivoire disabled:opacity-35" title="Retour en arrière (Ctrl+Z)">↶ Retour</button>
            <button type="button" onClick={redo} disabled={!future.current.length} className="border-l border-pierre px-2.5 py-1.5 text-[13px] hover:bg-ivoire disabled:opacity-35" title="Rétablir (Ctrl+Maj+Z)">↷</button>
          </span>
          <button type="button" onClick={() => downloadJson(dossier)} className="btn-ghost hidden text-[13px] md:inline-flex">JSON</button>
          <button type="button" onClick={() => handleExport()} className="btn-primary">Exporter PDF</button>
        </header>

        {/* Étapes (écrans moyens) + bascule saisie / aperçu */}
        <nav className="flex items-center gap-1 overflow-x-auto border-b border-pierre-100 bg-white px-3 lg:hidden">
          <button type="button" onClick={() => goStep('accueil')} className={`min-h-[44px] whitespace-nowrap border-b-2 px-3 text-[13px] ${current === 'accueil' ? 'border-foret text-foret' : 'border-transparent text-charbon/60'}`}>Vue d’ensemble</button>
          {steps.map((s, i) => (
            <button key={s} type="button" onClick={() => goStep(s)} className={`min-h-[44px] whitespace-nowrap border-b-2 px-3 text-[13px] ${current === s && view === 'saisie' ? 'border-foret text-foret' : 'border-transparent text-charbon/60'}`}>{i + 1}. {stepLabel(s, dossier.type)}</button>
          ))}
          {GESTION.map((s) => (
            <button key={s} type="button" onClick={() => goStep(s)} className={`min-h-[44px] whitespace-nowrap border-b-2 px-3 text-[13px] ${current === s ? 'border-terre text-terre' : 'border-transparent text-charbon/60'}`}>{stepLabel(s, dossier.type)}</button>
          ))}
          <button type="button" onClick={() => setView(view === 'apercu' ? 'saisie' : 'apercu')} className={`ml-auto min-h-[44px] whitespace-nowrap border-b-2 px-3 text-[13px] xl:hidden ${view === 'apercu' ? 'border-terre text-terre' : 'border-transparent text-terre'}`}>Aperçu</button>
        </nav>

        <div className="flex min-h-0 flex-1">
          {/* Navigation latérale */}
          <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-pierre-100 bg-ivoire px-3 py-5 lg:flex">
            <button type="button" onClick={() => goStep('accueil')} className={`mb-4 flex min-h-[42px] w-full items-center gap-3 rounded-md px-2 text-left text-[14px] ${current === 'accueil' ? 'bg-white font-medium text-foret shadow-sm' : 'text-charbon/75 hover:bg-white/60'}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full border text-[12px] ${current === 'accueil' ? 'border-foret bg-foret text-ivoire' : 'border-pierre text-sauge'}`}>⌂</span>Vue d’ensemble
            </button>
            <p className="label-caps mb-2 px-2">Rédaction du livrable</p>
            <ol className="space-y-0.5">
              {steps.map((s, i) => (
                <li key={s}>
                  <button type="button" onClick={() => goStep(s)} className={`flex min-h-[42px] w-full items-center gap-3 rounded-md px-2 text-left text-[14px] ${current === s ? 'bg-white font-medium text-foret shadow-sm' : 'text-charbon/70 hover:bg-white/60'}`}>
                    <span className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] ${current === s ? 'border-foret bg-foret text-ivoire' : 'border-pierre text-sauge'}`}>{i + 1}</span>
                    {stepLabel(s, dossier.type)}
                    {s === 'desordres' && <span className="ml-auto text-[12px] text-charbon/45">{dossier.desordres.length}</span>}
                    {s !== 'desordres' && etapes[i]?.fait && <span className="ml-auto text-[11px] text-sauge">✓</span>}
                  </button>
                </li>
              ))}
            </ol>
            <p className="label-caps mb-2 mt-6 px-2">Gestion du dossier</p>
            <p className="-mt-1 mb-2 px-2 text-[11px] text-charbon/45">non publié dans le livrable</p>
            <ul className="space-y-0.5">
              {GESTION.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => goStep(s)} className={`flex min-h-[40px] w-full items-center gap-3 rounded-md px-2 text-left text-[14px] ${current === s ? 'bg-white font-medium text-terre shadow-sm' : 'text-charbon/70 hover:bg-white/60'}`}>
                    <span className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] ${current === s ? 'border-terre bg-terre text-white' : 'border-pierre text-terre'}`}>{s === 'commercial' ? '€' : s === 'classeur' ? '▤' : '✉'}</span>
                    {stepLabel(s, dossier.type)}
                    {s === 'envois' && (dossier.classeur?.versions ?? []).length > 0 && <span className="ml-auto text-[12px] text-charbon/45">{dossier.classeur!.versions!.length}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setView(view === 'apercu' ? 'saisie' : 'apercu')} className="btn-ghost mt-6 text-[13px] xl:hidden">{view === 'apercu' ? 'Retour à la saisie' : 'Voir l’aperçu'}</button>
            <p className="mt-auto px-2 text-[11px] leading-snug text-charbon/45">Sauvegarde automatique{sync === 'local' ? ' dans ce navigateur' : ' en ligne'}. Ctrl+Z pour annuler.</p>
          </aside>

          {/* Formulaire */}
          <main id="form-scroll" className={`min-w-0 flex-1 overflow-y-auto ${view === 'apercu' && redaction ? 'hidden xl:block' : ''}`}>
            <div className={`mx-auto px-4 py-7 sm:px-8 ${!redaction ? 'max-w-[1100px]' : apercuRange ? (current === 'photos' ? 'max-w-[1500px]' : 'max-w-[1100px]') : 'max-w-[760px]'}`}>
              {current === 'accueil' && <DossierAccueil dossier={dossier} update={update} etapes={etapes} goStep={(k) => goStep(k as StepKey)} setStatut={setStatut} affaire={affaire} onMail={onMail} />}
              {current === 'envois' && <StepEnvois dossier={dossier} update={update} affaire={affaire} onPrint={(d) => setPrinting({ kind: 'version', d })} />}
              {current === 'projet' && <StepProjet dossier={dossier} update={update} affaire={affaire} />}
              {current === 'contexte' && <StepContexte dossier={dossier} update={update} />}
              {current === 'zones' && <StepZones dossier={dossier} update={update} />}
              {current === 'photos' && <StepPhotos dossier={dossier} update={update} goZones={() => goStep('zones')} />}
              {current === 'desordres' && <StepDesordres dossier={dossier} update={update} openId={openId} setOpenId={setOpenId} />}
              {current === 'mesures' && <StepMesures dossier={dossier} update={update} />}
              {current === 'vigilance' && <StepVigilance dossier={dossier} update={update} />}
              {current === 'preconisations' && <StepPreconisations dossier={dossier} update={update} onOpenDesordre={(id) => { setStep('desordres'); setOpenId(id); }} />}
              {current === 'classeur' && <StepClasseur dossier={dossier} update={update} />}
              {current === 'synthese' && <StepSynthese dossier={dossier} update={update} onOpenDesordre={(id) => { setStep('desordres'); setOpenId(id); }} />}
              {current === 'annuaire' && <StepAnnuaire dossier={dossier} update={update} />}
              {current === 'consultation' && <ConsultationStep dossier={dossier} update={update} />}
              {current === 'commercial' && <CommercialStep dossier={dossier} update={update} all={allDossiers} onPrint={(kind, id) => setPrinting({ kind, id })} />}

              {redaction && <div className="mt-10 flex justify-between border-t border-pierre-100 pt-5">
                <button type="button" disabled={idx === 0} onClick={() => goStep(steps[idx - 1])} className="btn-ghost">← {idx > 0 ? stepLabel(steps[idx - 1], dossier.type) : ''}</button>
                {idx < steps.length - 1
                  ? <button type="button" onClick={() => goStep(steps[idx + 1])} className="btn-primary">{stepLabel(steps[idx + 1], dossier.type)} →</button>
                  : <button type="button" onClick={() => handleExport()} className="btn-primary">Exporter le PDF</button>}
              </div>}
            </div>
          </main>

          {/* Aperçu WYSIWYG */}
          {redaction && (view === 'apercu' || !apercuRange) && <PreviewPane dossier={dossier} anchor={current === 'desordres' && openId ? openId : STEP_ANCHOR[current]} className={view === 'apercu' ? 'flex' : 'hidden xl:flex'} onRanger={view === 'apercu' ? undefined : () => rangerApercu(true)} onNaviguer={naviguer} />}
          {redaction && apercuRange && view !== 'apercu' && (
            <button type="button" onClick={() => rangerApercu(false)} title="Afficher l’aperçu du livrable"
              className="hidden w-9 shrink-0 flex-col items-center gap-2 border-l border-pierre-100 bg-[#EEEAE2] pt-5 text-[12px] text-foret hover:bg-pierre-100 xl:flex">
              <span aria-hidden>◂</span>
              <span style={{ writingMode: 'vertical-rl' }} className="label-caps">Aperçu du livrable</span>
            </button>
          )}
        </div>
      </div>

      {printing?.kind === 'rapport' && <div id="rapport-impression" className="hidden print:block"><ReportPreview dossier={dossier} /></div>}
      {printing?.kind === 'version' && <div id="rapport-impression" className="hidden print:block"><ReportPreview dossier={printing.d} /></div>}
      {printing && (printing.kind === 'devis' || printing.kind === 'facture') && <div className="hidden print:block"><PrintCommercial dossier={dossier} kind={printing.kind} id={printing.id} /></div>}

      {showLibrary && <LibraryEditor onClose={() => setShowLibrary(false)} />}

      {confirmExport && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-charbon/30 p-4 print:hidden" onClick={() => setConfirmExport(false)}>
          <div className="card max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-xl font-semibold text-foret">Des fiches ne sont pas relues</p>
            <p className="mt-2 text-[14px] text-charbon/75">{dossier.desordres.filter((d) => d.aRelire).length} fiche(s) contiennent encore un texte pré-rédigé non relu. Le rapport doit refléter ce que vous avez réellement observé.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={() => { setConfirmExport(false); setStep('desordres'); setOpenId(null); }}>Relire les fiches</button>
              <button type="button" className="btn-ghost" onClick={() => handleExport(true)}>Exporter quand même</button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-charbon/30 p-4 print:hidden" onClick={() => setNotice(null)}>
          <div className="card max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-xl font-semibold text-foret">Export PDF</p>
            <p className="mt-2 text-[14px] text-charbon/75">{notice}</p>
            <button type="button" className="btn-primary mt-5" onClick={() => setNotice(null)}>Compris</button>
          </div>
        </div>
      )}
    </>
  );
}

function PrintCommercial({ dossier, kind, id }: { dossier: Dossier; kind: 'devis' | 'facture'; id: string }) {
  const { lib } = useLibrary();
  const doc = kind === 'devis' ? dossier.commercial?.devis.find((x) => x.id === id) : dossier.commercial?.factures.find((x) => x.id === id);
  return doc ? <CommercialDoc kind={kind} doc={doc} dossier={dossier} ent={lib.entreprise} /> : null;
}

const A4_PX = 794; // 210 mm à 96 dpi

function PreviewPane({ dossier, className, anchor, onRanger, onNaviguer }: { dossier: Dossier; className: string; anchor: string | string[]; onRanger?: () => void; onNaviguer?: (c: { desordre?: string; anchor?: string; champ?: string }) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.6);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setZoom(Math.min(1, Math.max(0.3, (el.clientWidth - 40) / A4_PX))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const key = Array.isArray(anchor) ? anchor.join('|') : anchor;
  /** Fait défiler l'aperçu jusqu'à la page de l'endroit où l'on rédige. */
  const allerALaPage = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const pane = ref.current;
    if (!pane) return;
    const target = key.split('|').map((a) => pane.querySelector<HTMLElement>(`[data-anchor="${a}"]`)).find(Boolean);
    if (!target) return;
    const top = pane.scrollTop + target.getBoundingClientRect().top - pane.getBoundingClientRect().top - 48;
    pane.scrollTo({ top, behavior });
  }, [key]);
  // Numéros de page dans l'aperçu : même découpage que le PDF (voir lib/pagesApercu)
  useEffect(() => {
    const pane = ref.current;
    if (!pane) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const numeroter = () => {
      const pages = [...pane.querySelectorAll<HTMLElement>('.report > .report-page')];
      if (!pages.length) return;
      const decoupe = pages.map(feuillesDe);
      const feuilles = decoupe.map((x) => x.n);
      const total = feuilles.reduce((a, b) => a + b, 0);
      let n = 1;
      pages.forEach((pg, i) => {
        const debut = n;
        const num = pg.querySelector('.folio-num');
        const fin = debut + feuilles[i] - 1;
        if (num) { const v = fin > debut ? `Pages ${debut}–${fin} / ${total}` : `Page ${debut} / ${total}`; if (num.textContent !== v) num.textContent = v; }
        const rep = pg.querySelector('.reperes-pages');
        if (rep) {
          const html = decoupe[i].coupures.map((y, k) => `<div class="repere-page" style="top:${y.toFixed(1)}mm"><span>Page ${debut + k + 1}</span></div>`).join('');
          if (rep.innerHTML !== html) rep.innerHTML = html;
        }
        n += feuilles[i];
      });
    };
    const plusTard = () => { clearTimeout(t); t = setTimeout(numeroter, 250); };
    const mo = new MutationObserver((muts) => { if (muts.some((m) => !(m.target as HTMLElement).closest?.('.reperes-pages, .folio-num') && !(m.target.parentElement?.closest('.reperes-pages, .folio-num')))) plusTard(); });
    mo.observe(pane, { childList: true, subtree: true, characterData: true });
    const ro = new ResizeObserver(plusTard);
    ro.observe(pane);
    pane.addEventListener('load', plusTard, true); // images qui finissent de charger
    numeroter();
    return () => { clearTimeout(t); mo.disconnect(); ro.disconnect(); pane.removeEventListener('load', plusTard, true); };
  }, []);
  const ouvert = useRef(false);
  useEffect(() => {
    // À l'ouverture : directement à la bonne page (puis de nouveau quand les images ont pris leur place)
    if (!ouvert.current) { ouvert.current = true; allerALaPage('auto'); const t = setTimeout(() => allerALaPage('auto'), 350); return () => clearTimeout(t); }
    allerALaPage();
  }, [allerALaPage]);
  return (
    <section ref={ref} className={`${className} min-w-0 flex-1 flex-col overflow-y-auto border-l border-pierre-100 bg-[#EEEAE2] xl:max-w-[46%]`} aria-label="Aperçu du livrable">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-pierre-100 bg-[#EEEAE2]/95 px-5 py-2 backdrop-blur">
        <span className="label-caps">Aperçu du livrable</span>
        <span className="flex items-center gap-3">
          <button type="button" onClick={() => allerALaPage()} className="rounded px-2 py-1 text-[12px] text-foret hover:bg-white/70" title="Afficher la page qui correspond à l’endroit où vous rédigez">↧ Page en cours</button>
          <span className="text-[11px] text-charbon/50">A4 · {Math.round(zoom * 100)} %</span>
          {onRanger && <button type="button" onClick={onRanger} className="rounded px-2 py-1 text-[12px] text-foret hover:bg-white/70" title="Ranger l’aperçu pour agrandir l’espace de rédaction">Ranger ▸</button>}
        </span>
      </div>
      <div className="report-zoom report-cliquable py-5" style={{ zoom }} title="Cliquer sur un passage pour le modifier"
        onClick={(e) => {
          const el = e.target as HTMLElement;
          onNaviguer?.({
            desordre: el.closest('[data-desordre]')?.getAttribute('data-desordre') ?? undefined,
            anchor: el.closest('[data-anchor]')?.getAttribute('data-anchor') ?? undefined,
            champ: el.closest('[data-champ]')?.getAttribute('data-champ') ?? undefined,
          });
        }}>
        <ReportPreview dossier={dossier} />
      </div>
    </section>
  );
}
