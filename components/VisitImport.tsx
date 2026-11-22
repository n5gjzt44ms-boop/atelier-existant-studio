'use client';
import { alpha } from '@/lib/classement';
import { useMemo, useRef, useState } from 'react';
import { PRIORITY } from '@/lib/constants';
import { captureTime } from '@/lib/exif';
import { applyTemplate, newDesordre, uid, withPrix } from '@/lib/factory';
import { fileToPhoto } from '@/lib/image';
import { CATEGORIES_DESORDRE, categorieDesordre } from '@/lib/catalogue';
import type { Desordre, Dossier, Photo, Visite } from '@/lib/types';
import { useLibrary } from './LibraryProvider';

/**
 * Import des photos de visite :
 *  1. lecture de l'heure de prise de vue de chaque photo → ordre de visite ;
 *  2. regroupement en « sujets » (photos prises à quelques secondes d'intervalle) ;
 *  3. pour chaque sujet : zone + type de désordre (ou vue générale / ignorer) ;
 *  4. création des fiches, pré-rédigées par la bibliothèque de désordres types.
 */

interface Shot { id: string; name: string; time: number; photo: Photo }
interface Group { id: string; shots: Shot[]; zone: string; kind: string } // kind : type de désordre | '' | 'vue' | 'ignorer'

const KIND_VUE = 'vue';
const KIND_IGNORE = 'ignorer';

function groupShots(shots: Shot[], gapSec: number, zone: string, kind = KIND_VUE): Group[] {
  const groups: Group[] = [];
  for (const s of shots) {
    const last = groups[groups.length - 1];
    const prev = last?.shots[last.shots.length - 1];
    if (last && prev && s.time - prev.time <= gapSec * 1000 && last.shots.length < 4) last.shots.push(s);
    else groups.push({ id: uid(), shots: [s], zone, kind });
  }
  return groups;
}

const hhmm = (t: number) => (t ? new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—');

export default function VisitImport({ dossier, onDone, onClose, lockZone }: { dossier: Dossier; onDone: (d: Dossier, created: number, classees: number) => void; onClose: () => void; lockZone?: string }) {
  const { lib, noteUse } = useLibrary();
  const templates = lib.desordres;
  const tpl = (type: string) => templates.find((x) => x.type === type);
  const visites = dossier.visites ?? [];
  const [visiteId, setVisiteId] = useState<string>('new');
  const [newVisite, setNewVisite] = useState<Visite>({ id: uid(), date: '', libelle: visites.length ? `Visite ${visites.length + 1}` : 'Visite initiale' });
  const [coverId, setCoverId] = useState<string | null>(null);
  const [stage, setStage] = useState<'choose' | 'processing' | 'review'>('choose');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [failed, setFailed] = useState<string[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [gap, setGap] = useState(40);
  const [groups, setGroups] = useState<Group[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const firstZone = lockZone ?? dossier.zones[0]?.code ?? '';

  async function handleFiles(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|heic|webp)$/i.test(f.name));
    if (!files.length) return;
    setStage('processing');
    setProgress({ done: 0, total: files.length });
    const out: Shot[] = [];
    const bad: string[] = [];
    let i = 0;
    const worker = async () => {
      while (i < files.length) {
        const f = files[i++];
        try {
          const [time, photo] = await Promise.all([captureTime(f), fileToPhoto(f)]);
          out.push({ id: photo.id ?? uid(), name: f.name, time, photo });
        } catch {
          bad.push(f.name);
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    out.sort((a, b) => a.time - b.time || a.name.localeCompare(b.name, 'fr', { numeric: true }));
    setShots(out);
    setFailed(bad);
    const gs = groupShots(out, gap, firstZone);
    setGroups(gs);
    const firstTime = out.find((x) => x.time)?.time;
    // Date de la visite = jour de prise de vue des photos (jamais une date inventée)
    const date = firstTime ? new Date(firstTime - new Date(firstTime).getTimezoneOffset() * 60000).toISOString().slice(0, 10) : dossier.meta.dateVisite || '';
    const existante = visites.find((v) => v.date && v.date === date);
    if (existante) setVisiteId(existante.id);
    setNewVisite((v) => ({ ...v, date, libelle: date ? `Visite du ${new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : v.libelle }));
    // Couverture proposée : première photo prise en extérieur (vue d'ensemble de l'édifice)
    if (!dossier.meta.photoCouverture && out.length) {
      const ext = gs.find((g) => /^(EXT|FAC)/.test(g.zone));
      setCoverId((ext ?? gs[0]).shots[0].id);
    }
    setStage('review');
  }

  /* ─── Édition des groupes ─── */
  const update = (id: string, patch: Partial<Group>) => setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  function setZone(idx: number, zone: string) {
    // La zone se propage aux sujets suivants jusqu'au prochain changement de zone
    setGroups((gs) => {
      const old = gs[idx].zone;
      return gs.map((g, j) => (j === idx || (j > idx && gs.slice(idx + 1, j + 1).every((x) => x.zone === old)) ? { ...g, zone } : g));
    });
  }

  function mergeWithPrevious(idx: number) {
    setGroups((gs) => {
      if (idx === 0) return gs;
      const next = [...gs];
      next[idx - 1] = { ...next[idx - 1], shots: [...next[idx - 1].shots, ...next[idx].shots] };
      next.splice(idx, 1);
      return next;
    });
  }

  function splitAt(idx: number, shotIdx: number) {
    setGroups((gs) => {
      const g = gs[idx];
      const next = [...gs];
      next.splice(idx, 1, { ...g, shots: g.shots.slice(0, shotIdx) }, { ...g, id: uid(), shots: g.shots.slice(shotIdx), kind: '' });
      return next;
    });
  }

  function makeFirst(idx: number, shotIdx: number) {
    setGroups((gs) => gs.map((g, j) => (j === idx ? { ...g, shots: [g.shots[shotIdx], ...g.shots.filter((_, k) => k !== shotIdx)] } : g)));
  }

  function removeShot(idx: number, shotIdx: number) {
    setGroups((gs) => gs.map((g, j) => (j === idx ? { ...g, shots: g.shots.filter((_, k) => k !== shotIdx) } : g)).filter((g) => g.shots.length));
  }

  function regroup(sec: number) {
    setGap(sec);
    setGroups(groupShots(shots, sec, firstZone));
  }

  const counts = useMemo(() => ({
    fiches: groups.filter((g) => g.kind !== KIND_VUE && g.kind !== KIND_IGNORE).length,
    redigees: groups.filter((g) => tpl(g.kind)).length,
    vues: groups.filter((g) => g.kind === KIND_VUE).length,
  }), [groups]);

  /* ─── Création des fiches ─── */
  function create() {
    const visite: Visite = visiteId === 'new' ? newVisite : visites.find((v) => v.id === visiteId) ?? newVisite;
    let desordres: Desordre[] = [...dossier.desordres];
    let zonesOut = dossier.zones.map((z) => ({ ...z, photos: [...(z.photos ?? [])] }));
    const vues = [...dossier.contexte.vues];
    let cover = dossier.meta.photoCouverture;
    let created = 0;
    let classees = 0;
    for (const g of groups) {
      if (g.kind === KIND_IGNORE) continue;
      const photos = g.shots.map((s) => ({ ...s.photo, visiteId: visite.id, prise: s.time || undefined }));
      g.shots.forEach((s, k) => { if (s.id === coverId) cover = photos[k]; });
      classees += photos.length;
      if (g.kind === KIND_VUE) {
        const z = zonesOut.find((x) => x.code === g.zone);
        if (z) z.photos = [...(z.photos ?? []), ...photos];
        else vues.push(...photos);
        continue;
      }
      const t = tpl(g.kind);
      let d = newDesordre(desordres, g.zone, t?.priorite ?? 'P2');
      d = { ...d, photoEnsemble: photos[0] ?? null, photoDetail: photos[1] ?? null, autresPhotos: photos.slice(2) };
      d = t ? withPrix(applyTemplate(d, t), lib.prix.find((x) => x.id === t.prixId)) : { ...d, type: 'À qualifier', element: '', aRelire: true };
      if (t) noteUse('desordre', t.type);
      desordres = [...desordres, d];
      created++;
    }
    zonesOut = zonesOut.map((z) => z);
    const visitesOut = visiteId === 'new' ? [...visites, newVisite] : visites;
    const firstDate = [...visitesOut].sort((x, y) => x.date.localeCompare(y.date))[0]?.date;
    onDone({
      ...dossier,
      desordres,
      zones: zonesOut,
      visites: visitesOut,
      meta: { ...dossier.meta, photoCouverture: cover, dateVisite: firstDate || dossier.meta.dateVisite },
      contexte: { ...dossier.contexte, vues },
    }, created, classees);
  }

  const zoneOptions = dossier.zones.map((z) => ({ value: z.code, label: `${z.code} · ${z.nom || 'sans nom'}` }));

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-ivoire">
      <header className="flex flex-wrap items-center gap-3 border-b border-pierre-100 bg-white px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-xl font-semibold text-foret">{lockZone ? `Photos de la zone ${lockZone} · ${dossier.zones.find((z) => z.code === lockZone)?.nom ?? ''}` : 'Importer les photos d’une visite'}</p>
          <p className="text-[12px] text-charbon/55">{dossier.numero} · les photos sont remises dans l’ordre de prise de vue</p>
        </div>
        {stage === 'review' && (
          <button type="button" className="btn-primary" disabled={!counts.fiches && !counts.vues} onClick={create}>
            Classer{counts.fiches ? ` et créer ${counts.fiches} fiche${counts.fiches > 1 ? 's' : ''}` : ' les photos'}
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {stage === 'choose' && (
          <div className="mx-auto max-w-2xl px-4 py-10">
            <div
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => input.current?.click()}
              role="button" tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
              className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-6 py-16 text-center transition ${over ? 'border-sauge bg-sauge-50' : 'border-pierre bg-white hover:border-sauge'}`}>
              <svg viewBox="0 0 24 24" className="mb-3 h-10 w-10 text-sauge" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6l1.5-2h5L16 6" /></svg>
              <p className="font-serif text-2xl text-foret">Déposez toutes les photos de la visite</p>
              <p className="mt-2 text-[14px] text-charbon/65">ou touchez pour les sélectionner (sélection multiple)</p>
              <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </div>
            <ol className="mt-8 space-y-2 text-[14px] text-charbon/75" data-x="1">
              <li><b className="text-terre">1.</b> Les photos sont classées dans l’ordre où vous les avez prises.</li>
              <li><b className="text-terre">2.</b> Les photos prises à quelques secondes d’intervalle forment une série : pour un désordre, la première devient la vue d’ensemble, la deuxième le détail.</li>
              <li><b className="text-terre">3.</b> Chaque série est classée dans sa zone ; si elle montre un désordre, choisissez son type : la fiche est pré-rédigée, vous la corrigez ensuite.</li>
            </ol>
            <p className="mt-6 text-[12px] text-charbon/50">Astuce sur le terrain : une photo d’ensemble puis une photo de détail, et une petite pause avant le désordre suivant.</p>
          </div>
        )}

        {stage === 'processing' && (
          <div className="mx-auto max-w-md px-4 py-24 text-center">
            <p className="font-serif text-2xl text-foret">Préparation des photos…</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-pierre-100">
              <div className="h-full bg-sauge transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
            </div>
            <p className="mt-2 text-[13px] text-charbon/60">{progress.done} / {progress.total}</p>
          </div>
        )}

        {stage === 'review' && (
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
            <div className="card mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 p-4 text-[13px]">
              <div className="flex w-full flex-wrap items-center gap-2">
                <span className="label-caps">Visite</span>
                <select value={visiteId} onChange={(e) => setVisiteId(e.target.value)} className="field w-auto py-1.5">
                  <option value="new">Nouvelle visite</option>
                  {visites.map((v) => <option key={v.id} value={v.id}>{v.libelle} — {v.date}</option>)}
                </select>
                {visiteId === 'new' && (
                  <>
                    <input type="date" value={newVisite.date} onChange={(e) => setNewVisite({ ...newVisite, date: e.target.value })} className="field w-auto py-1.5" aria-label="Date de la visite" />
                    <input value={newVisite.libelle} onChange={(e) => setNewVisite({ ...newVisite, libelle: e.target.value })} className="field w-48 py-1.5" aria-label="Nom de la visite" />
                  </>
                )}
              </div>
              <span><b className="text-foret">{shots.length}</b> photos · <b className="text-foret">{groups.length}</b> séries</span>
              <label className="flex items-center gap-2">
                Nouveau sujet après
                <select value={gap} onChange={(e) => regroup(Number(e.target.value))} className="field w-auto py-1.5">
                  {[15, 25, 40, 60, 90, 180].map((s) => <option key={s} value={s}>{s < 60 ? `${s} s` : `${s / 60} min`}</option>)}
                </select>
                sans photo
              </label>
              <span className="text-charbon/55">{counts.vues} série{counts.vues > 1 ? 's' : ''} classée{counts.vues > 1 ? 's' : ''} dans les zones · {counts.fiches} désordre{counts.fiches > 1 ? 's' : ''}</span>
              {failed.length > 0 && <span className="w-full text-p1">{failed.length} photo{failed.length > 1 ? 's' : ''} illisible{failed.length > 1 ? 's' : ''} ({failed.slice(0, 3).join(', ')}{failed.length > 3 ? '…' : ''}) — format HEIC ? Réglez l’appareil photo sur « Le plus compatible » (JPEG).</span>}
            </div>
            <p className="mb-4 text-[12px] text-charbon/55">Par défaut, chaque série de photos est simplement classée dans sa zone. Choisissez un type de désordre pour créer une fiche pré-rédigée. {lockZone ? '' : 'Changer la zone d’une série l’applique aussi aux suivantes, jusqu’au prochain changement : réglez-la à chaque nouvelle pièce.'} ☆ désigne la photo de couverture (vue d’ensemble de l’édifice).</p>

            <ol className="space-y-3">
              {groups.map((g, idx) => {
                const t = tpl(g.kind);
                const zoneChanged = idx === 0 || groups[idx - 1].zone !== g.zone;
                return (
                  <li key={g.id}>
                    {zoneChanged && !lockZone && <p className="label-caps mb-2 mt-4 text-terre">{dossier.zones.find((z) => z.code === g.zone)?.nom || g.zone || 'Sans zone'}</p>}
                    <div className={`card p-3 sm:p-4 ${g.kind === KIND_IGNORE ? 'opacity-50' : ''}`}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[13px] text-charbon/60">Série {idx + 1} · {hhmm(g.shots[0]?.time)}</span>
                        <div className="flex gap-1">
                          {idx > 0 && <button type="button" className="btn-quiet min-h-[32px] text-[12px]" onClick={() => mergeWithPrevious(idx)}>↑ Fusionner avec le précédent</button>}
                        </div>
                      </div>
                      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                        {g.shots.map((s, k) => (
                          <figure key={s.id} className="relative w-32 shrink-0 sm:w-36">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={s.photo.src} alt={s.name} className="aspect-[4/3] w-full rounded object-cover" />
                            <figcaption className="mt-1 flex items-center justify-between text-[11px] text-charbon/60">
                              <span>{g.kind === KIND_VUE || g.kind === KIND_IGNORE ? `Photo ${k + 1}` : k === 0 ? 'Ensemble' : k === 1 ? 'Détail' : 'Complément'}</span>
                              <span className="flex gap-1.5">
                                <button type="button" title="Photo de couverture (vue d’ensemble de l’édifice)" onClick={() => setCoverId(coverId === s.id ? null : s.id)} className={coverId === s.id ? 'text-terre' : 'hover:text-terre'}>{coverId === s.id ? '★' : '☆'}</button>
                                {k > 0 && <button type="button" title="Mettre en vue d’ensemble" onClick={() => makeFirst(idx, k)} className="hover:text-foret">⇤</button>}
                                {k > 0 && <button type="button" title="Nouveau sujet à partir de cette photo" onClick={() => splitAt(idx, k)} className="hover:text-foret">✂</button>}
                                <button type="button" title="Retirer la photo" onClick={() => removeShot(idx, k)} className="hover:text-p1">×</button>
                              </span>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                        <select value={g.zone} disabled={!!lockZone} onChange={(e) => setZone(idx, e.target.value)} className="field py-2 text-[14px]" aria-label="Zone">
                          <option value="">— Zone —</option>
                          {zoneOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <select value={g.kind} onChange={(e) => update(g.id, { kind: e.target.value })} className="field py-2 text-[14px]" aria-label="Type de désordre">
                          <option value={KIND_VUE}>Photos de la zone (pas de désordre)</option>
                          <option value={KIND_IGNORE}>Ignorer ces photos</option>
                          {CATEGORIES_DESORDRE.filter((c) => templates.some((x) => categorieDesordre(x) === c)).map((c) => (
                            <optgroup key={c} label={`Désordre — ${c}`}>
                              {templates.filter((x) => categorieDesordre(x) === c).sort((a, b) => alpha(a.type, b.type)).map((x) => <option key={x.type} value={x.type}>{x.type} ({PRIORITY[x.priorite].court.toLowerCase()})</option>)}
                            </optgroup>
                          ))}
                          <option value="">Désordre à qualifier (fiche vide)</option>
                        </select>
                      </div>
                      {t && (
                        <p className="mt-2 text-[12px] leading-snug text-charbon/60">
                          <span style={{ color: PRIORITY[t.priorite].color }} className="font-semibold">{PRIORITY[t.priorite].court}</span> · {t.lot || 'lot à définir'} — {t.preconisation.split(/(?<=\.)\s/)[0]}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 flex justify-end">
              <button type="button" className="btn-primary" disabled={!counts.fiches && !counts.vues} onClick={create}>Classer{counts.fiches ? ` et créer ${counts.fiches} fiche${counts.fiches > 1 ? 's' : ''}` : ' les photos'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
