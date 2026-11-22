'use client';
import { useMemo, useState } from 'react';
import { TYPE_EVENEMENT } from '@/lib/business';
import { fmtDate } from '@/lib/calc';
import { DELIVERABLES, STATUS_LABEL } from '@/lib/constants';
import { agendaComplet } from '@/lib/agenda';
import { dateRenduOf, ETAPES, estParticulier, etapeOf, eur, today, totalLignes } from '@/lib/commercial';
import { uid } from '@/lib/factory';
import type { Dossier, Photo, Status, VersionLivrable } from '@/lib/types';
import { useLibrary } from './LibraryProvider';
import ReportPreview from './ReportPreview';
import type { Affaire } from './steps';

export type EtapeRedaction = { key: string; label: string; fait: boolean | null };

/** Avancement de chaque étape de rédaction (true fait, false à faire, null facultatif). */
export function avancement(d: Dossier, steps: { key: string; label: string }[]): EtapeRedaction[] {
  const photos = d.zones.some((z) => (z.photos ?? []).length) || d.desordres.some((x) => x.photoEnsemble);
  const regle: Record<string, boolean | null> = {
    projet: !!(d.meta.client.nom && d.meta.bien.adresse && d.meta.dateVisite),
    contexte: !!(d.contexte.datation || d.contexte.typologie),
    zones: d.zones.length > 0,
    photos,
    desordres: d.desordres.length > 0 && !d.desordres.some((x) => x.aRelire),
    vigilance: (d.vigilance ?? []).length > 0,
    preconisations: d.desordres.length > 0 && d.desordres.every((x) => (x.solutions ?? []).length || x.preconisation.trim()),
    synthese: !!(d.conclusion.bilan && d.conclusion.conclusion),
    annuaire: d.annuaire.length > 0,
    consultation: (d.consultation?.lots ?? []).length > 0,
    mesures: null,
  };
  return steps.map((s) => ({ ...s, fait: regle[s.key] ?? null }));
}

/** Page d'accueil d'un dossier : client, contact, avancement du livrable, agenda, tâches, missions. */
export default function DossierAccueil({ dossier, update, etapes, goStep, setStatut, affaire, onMail }: {
  dossier: Dossier; update: (d: Dossier) => void; etapes: EtapeRedaction[]; goStep: (k: string) => void;
  setStatut: (s: Status) => void; affaire?: Affaire; onMail?: (modele?: string) => void;
}) {
  const { lib, setLib } = useLibrary();
  const m = dossier.meta;
  const t = today();
  const faits = etapes.filter((e) => e.fait === true).length;
  const comptees = etapes.filter((e) => e.fait !== null).length;
  const pct = comptees ? Math.round((faits / comptees) * 100) : 0;
  const prochaine = etapes.find((e) => e.fait === false);
  const evts = useMemo(() => agendaComplet(lib, [dossier]).filter((e) => e.dossierId === dossier.id && e.date >= addDays(t, -7)).slice(0, 8), [lib, dossier, t]);
  const taches = lib.taches.filter((x) => x.dossierId === dossier.id && !x.fait);
  const [tache, setTache] = useState('');
  const c = dossier.commercial ?? { devis: [], factures: [] };
  const accepte = c.devis.find((x) => x.statut === 'accepte');
  const factureTotal = c.factures.filter((f) => f.statut !== 'brouillon').reduce((a, f) => a + totalLignes(f.lignes), 0);
  const paye = c.factures.filter((f) => f.statut === 'payee').reduce((a, f) => a + totalLignes(f.lignes), 0);
  const acomptePaye = c.factures.some((f) => f.nature === 'acompte' && f.statut === 'payee');
  const etape = etapeOf(dossier);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps">{dossier.numero} · {DELIVERABLES[dossier.type].num} {DELIVERABLES[dossier.type].titre}</p>
          <h1 className="font-serif text-[32px] font-semibold leading-tight text-foret">{m.client.nom || 'Client à renseigner'}</h1>
          <p className="text-[14px] text-charbon/65">{[m.bien.adresse, m.bien.codePostal, m.bien.commune].filter(Boolean).join(' ') || 'Adresse du bien à renseigner'}</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => goStep(prochaine?.key ?? 'projet')}>{prochaine ? `Continuer : ${prochaine.label}` : 'Relire le livrable'} →</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* Livrable en cours */}
          <div className="card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <p className="flex-1 font-serif text-xl font-semibold text-foret">Livrable en cours</p>
              <select value={dossier.status} onChange={(e) => setStatut(e.target.value as Status)} className="field w-auto py-1.5 text-[13px]" aria-label="Statut du livrable">
                {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="mb-1 h-2.5 overflow-hidden rounded-full bg-pierre-50"><div className="h-full bg-sauge" style={{ width: `${pct}%` }} /></div>
            <p className="mb-3 text-[13px] text-charbon/60">{pct} % des étapes renseignées
              {(dossier.status === 'brouillon' || dossier.status === 'revision') && <> · rendu prévu le <b>{fmtDate(dateRenduOf(dossier))}</b></>}
              {dossier.status === 'finalise' && <> · <b className="text-terre">à envoyer au client sous deux jours</b></>}
              {dossier.status === 'envoye' && dossier.dates?.envoye && <> · envoyé le {fmtDate(dossier.dates.envoye)}</>}
            </p>
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {etapes.map((e, i) => (
                <li key={e.key}>
                  <button type="button" onClick={() => goStep(e.key)} className="flex w-full items-center gap-2 rounded-md border border-pierre-100 px-3 py-2 text-left text-[13.5px] hover:border-sauge">
                    <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${e.fait ? 'bg-sauge text-white' : e.fait === false ? 'border border-terre text-terre' : 'border border-pierre text-charbon/40'}`}>{e.fait ? '✓' : i + 1}</span>
                    <span className="flex-1">{e.label}</span>
                    <span className="text-[11px] text-charbon/45">{e.fait ? 'fait' : e.fait === false ? 'à faire' : 'facultatif'}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] text-charbon/55">Passer le statut à « Envoyé au client » range la version dans le classeur (Livrables envoyés) et programme les rappels : bonne réception, témoignage, accompagnement, photos des réalisations.</p>
          </div>

          {/* Suivi commercial */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-serif text-xl font-semibold text-foret">Suivi de l’affaire</p>
              <button type="button" className="btn-quiet text-[13px]" onClick={() => goStep('commercial')}>Devis et factures →</button>
            </div>
            <ol className="mb-3 flex flex-wrap gap-1">
              {ETAPES.map((e, i) => <li key={e} className={`rounded-full px-3 py-1 text-[12px] ${e === etape ? 'bg-foret text-ivoire' : ETAPES.indexOf(etape) >= i ? 'bg-sauge-100 text-foret' : 'bg-pierre-50 text-charbon/45'}`}>{e}</li>)}
            </ol>
            <div className="grid gap-2 text-[14px] sm:grid-cols-3">
              <p>Devis : <b>{accepte ? `${accepte.numero}, ${eur(totalLignes(accepte.lignes))}` : c.devis.length ? `${c.devis.length} en cours` : 'aucun'}</b></p>
              <p>Facturé : <b>{eur(factureTotal)}</b></p>
              <p>Encaissé : <b>{eur(paye)}</b></p>
            </div>
            {estParticulier(dossier) && accepte && accepte.acomptePct > 0 && (
              <p className={`mt-2 text-[13px] ${acomptePaye ? 'text-sauge' : 'text-terre'}`}>{acomptePaye ? 'Acompte reçu : la visite peut avoir lieu.' : `Client particulier : acompte de ${accepte.acomptePct} % à encaisser avant la visite.`}</p>
            )}
          </div>

          {affaire && affaire.missions.length > 1 && (
            <div className="card p-5">
              <p className="mb-2 font-serif text-xl font-semibold text-foret">Missions pour ce bien</p>
              <ul className="space-y-1 text-[14px]">
                {affaire.missions.map((x) => (
                  <li key={x.id} className="flex items-center gap-2 border-b border-pierre-50 py-1.5">
                    <span className="flex-1">{DELIVERABLES[x.type].num} — {DELIVERABLES[x.type].titre} <span className="text-[12px] text-charbon/55">{STATUS_LABEL[x.status]}</span></span>
                    {x.id === dossier.id ? <span className="text-[12px] text-sauge">ouvert</span> : <button type="button" className="btn-quiet text-[13px]" onClick={() => affaire.onOpen(x.id)}>Ouvrir →</button>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <p className="label-caps mb-2">Contact</p>
            <p className="font-medium">{m.client.nom || '—'}</p>
            <p className="text-[12px] text-charbon/55">{(m.client.type ?? 'particulier') === 'particulier' ? 'Particulier' : 'Professionnel'}{m.client.qualite ? ` · ${m.client.qualite}` : ''}</p>
            {m.client.telephone && <a className="mt-2 block text-[14px] text-foret underline" href={`tel:${m.client.telephone.replace(/\s/g, '')}`}>{m.client.telephone}</a>}
            {m.client.email && <a className="block break-all text-[14px] text-foret underline" href={`mailto:${m.client.email}`}>{m.client.email}</a>}
            {m.client.adresse && <p className="mt-1 text-[13px] text-charbon/65">{m.client.adresse}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {onMail && <button type="button" className="btn-ghost min-h-[34px] text-[12px]" onClick={() => onMail()}>Préparer un mail</button>}
              <button type="button" className="btn-quiet text-[12px]" onClick={() => goStep('projet')}>Modifier</button>
            </div>
          </div>

          <div className="card p-4">
            <p className="label-caps mb-2">Agenda du dossier</p>
            {evts.length === 0 && <p className="text-[13px] text-charbon/55">Rien de prévu.</p>}
            <ul className="space-y-1.5">
              {evts.map((e) => (
                <li key={e.id} className="border-l-4 pl-2 text-[13px]" style={{ borderColor: e.color }}>
                  <span className={`block text-[11px] ${e.date < t ? 'text-p1' : 'text-charbon/55'}`}>{fmtDate(e.date)}{e.heure ? ` à ${e.heure}` : ''} · {e.libelleType}</span>{e.titre.replace(/ — [^—]+$/, '')}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-4">
            <p className="label-caps mb-2">À faire pour ce dossier</p>
            <form className="mb-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!tache.trim()) return; setLib({ ...lib, taches: [...lib.taches, { id: uid(), texte: tache.trim(), fait: false, dossierId: dossier.id, categorie: 'autre' }] }); setTache(''); }}>
              <input value={tache} onChange={(e) => setTache(e.target.value)} placeholder="Nouvelle tâche…" className="field py-1.5 text-[13px]" />
              <button type="submit" className="btn-primary min-h-[34px] px-3">+</button>
            </form>
            <ul className="space-y-1">
              {taches.map((x) => (
                <li key={x.id} className="flex items-start gap-2 text-[13px]">
                  <input type="checkbox" className="mt-0.5" onChange={() => setLib({ ...lib, taches: lib.taches.map((y) => (y.id === x.id ? { ...y, fait: true } : y)) })} />
                  <span className="flex-1">{x.texte}{x.date ? <span className="block text-[11px] text-charbon/50">{fmtDate(x.date)} · {TYPE_EVENEMENT[x.categorie ?? 'autre'].label}</span> : null}</span>
                </li>
              ))}
            </ul>
          </div>

          {(dossier.classeur?.echanges ?? []).length > 0 && (
            <div className="card p-4">
              <p className="label-caps mb-2">Derniers échanges</p>
              <ul className="space-y-1.5 text-[13px]">
                {[...dossier.classeur!.echanges].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map((e) => <li key={e.id}><span className="text-[11px] text-charbon/55">{fmtDate(e.date)}</span><br />{e.objet || 'Sans objet'}</li>)}
              </ul>
              <button type="button" className="btn-quiet mt-1 text-[12px]" onClick={() => goStep('classeur')}>Tout le classeur →</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

const addDays = (iso: string, n: number) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

/* ───────────── Versions envoyées ───────────── */

/** Copie légère du dossier : les photos sont référencées par identifiant (pas de doublon des images). */
export function instantane(d: Dossier): string {
  const strip = (p: Photo | null | undefined) => (p ? { ...p, src: p.src.startsWith('data:') || p.path ? '' : p.src } : p);
  const copie: Dossier = {
    ...d,
    classeur: undefined,
    meta: { ...d.meta, photoCouverture: strip(d.meta.photoCouverture) ?? null },
    contexte: { ...d.contexte, vues: d.contexte.vues.map((v) => strip(v)!) },
    zones: d.zones.map((z) => ({ ...z, photos: (z.photos ?? []).map((p) => strip(p)!) })),
    desordres: d.desordres.map((x) => ({ ...x, photoEnsemble: strip(x.photoEnsemble) ?? null, photoDetail: strip(x.photoDetail) ?? null, autresPhotos: (x.autresPhotos ?? []).map((p) => strip(p)!) })),
    plansZones: d.plansZones?.map((p) => ({ ...p, image: strip(p.image) ?? null })),
  };
  return JSON.stringify(copie);
}

/** Recharge une version en reprenant les images du dossier actuel (même identifiant). */
function rehydrate(v: VersionLivrable, actuel: Dossier): Dossier {
  const srcs = new Map<string, string>();
  const add = (p?: Photo | null) => { if (p?.id && p.src) srcs.set(p.id, p.src); };
  add(actuel.meta.photoCouverture); actuel.contexte.vues.forEach(add); actuel.zones.forEach((z) => (z.photos ?? []).forEach(add));
  actuel.desordres.forEach((x) => { add(x.photoEnsemble); add(x.photoDetail); (x.autresPhotos ?? []).forEach(add); });
  (actuel.plansZones ?? []).forEach((p) => add(p.image));
  const fix = (p: Photo | null | undefined) => (p ? { ...p, src: p.src || (p.id ? srcs.get(p.id) ?? '' : '') } : p);
  const d = JSON.parse(v.snapshot) as Dossier;
  return {
    ...d,
    meta: { ...d.meta, photoCouverture: fix(d.meta.photoCouverture) ?? null },
    contexte: { ...d.contexte, vues: d.contexte.vues.map((x) => fix(x)!) },
    zones: d.zones.map((z) => ({ ...z, photos: (z.photos ?? []).map((p) => fix(p)!) })),
    desordres: d.desordres.map((x) => ({ ...x, photoEnsemble: fix(x.photoEnsemble) ?? null, photoDetail: fix(x.photoDetail) ?? null, autresPhotos: (x.autresPhotos ?? []).map((p) => fix(p)!) })),
    plansZones: d.plansZones?.map((p) => ({ ...p, image: fix(p.image) ?? null })),
  };
}

export function StepEnvois({ dossier, update, onPrint, affaire }: { dossier: Dossier; update: (d: Dossier) => void; onPrint: (d: Dossier) => void; affaire?: Affaire }) {
  const versions = [...(dossier.classeur?.versions ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const [vue, setVue] = useState<Dossier | null>(null);
  const autres = (affaire?.missions ?? []).filter((x) => x.id !== dossier.id && (x.status === 'envoye' || x.status === 'finalise'));
  return (
    <div className="space-y-6">
      <div>
        <p className="label-caps">Gestion du dossier · non publié</p>
        <h2 className="font-serif text-[28px] font-semibold text-foret">Livrables envoyés</h2>
        <p className="text-[14px] text-charbon/60">Chaque fois que le statut passe à « Envoyé au client », la version envoyée est archivée ici, telle qu’elle était.</p>
      </div>
      {versions.length === 0 && <p className="card p-6 text-[14px] text-charbon/60">Aucune version envoyée pour l’instant.</p>}
      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.id} className="card flex flex-wrap items-center gap-3 p-4">
            <span className="flex-1"><b>{v.titre}</b> <span className="text-[13px] text-charbon/60">· {v.revision} · envoyé le {fmtDate(v.date)}</span></span>
            <button type="button" className="btn-ghost min-h-[36px] text-[13px]" onClick={() => setVue(rehydrate(v, dossier))}>Consulter</button>
            <button type="button" className="btn-ghost min-h-[36px] text-[13px]" onClick={() => onPrint(rehydrate(v, dossier))}>Imprimer / PDF</button>
            <button type="button" className="btn-quiet text-[12px] text-terre" onClick={() => update({ ...dossier, classeur: { echanges: [], documents: [], ...dossier.classeur, versions: (dossier.classeur?.versions ?? []).filter((x) => x.id !== v.id) } })}>Supprimer</button>
          </li>
        ))}
      </ul>
      {autres.length > 0 && (
        <div className="card p-4">
          <p className="label-caps mb-2">Livrables des autres missions de ce bien</p>
          <ul className="space-y-1 text-[14px]">{autres.map((x) => <li key={x.id} className="flex items-center gap-2"><span className="flex-1">{DELIVERABLES[x.type].titre} — {STATUS_LABEL[x.status]}</span><button type="button" className="btn-quiet text-[13px]" onClick={() => affaire!.onOpen(x.id)}>Ouvrir →</button></li>)}</ul>
        </div>
      )}
      {vue && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-charbon/40" onClick={() => setVue(null)}>
          <div className="flex items-center justify-between bg-white px-4 py-2" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium">Version archivée — lecture seule</p>
            <button type="button" className="btn-primary" onClick={() => setVue(null)}>Fermer</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#EEEAE2] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-fit origin-top" style={{ transform: 'scale(0.8)' }}><ReportPreview dossier={vue} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

export const nouvelleVersion = (d: Dossier): VersionLivrable => ({ id: uid(), date: today(), titre: DELIVERABLES[d.type].titre, revision: `Indice ${d.version || "1"}`, snapshot: instantane(d) });
