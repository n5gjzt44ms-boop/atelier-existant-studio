'use client';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { correspond } from '@/lib/catalogue';
import { PRIORITY } from '@/lib/constants';
import { fileToPhoto } from '@/lib/image';
import type { Photo, Priority } from '@/lib/types';
import { setCibleSurvolee } from '@/lib/paste';
import { appliquer, verifierTexte, type Correction } from '@/lib/orthographe';

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="label-caps">{label}</span>
        {hint && <span className="text-[11px] text-charbon/45">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input spellCheck={!props.type || props.type === 'text'} lang="fr" {...props} className={`field ${props.className ?? ''}`} />;
}

/** Zone de texte qui grandit avec son contenu — confortable sur tablette. */
export function TextArea({ value, onChange, rows = 3, ...rest }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 2 + 'px';
  }, [value]);
  const [corr, setCorr] = useState<Correction[] | null>(null);
  const [etat, setEtat] = useState<{ busy?: boolean; err?: string }>({});
  const editable = !rest.readOnly && !rest.disabled;
  async function verifier() {
    setEtat({ busy: true });
    try { setCorr(await verifierTexte(value)); setEtat({}); } catch (e) { setEtat({ err: (e as Error).message }); }
  }
  function choisir(i: number, sug: string) {
    const c = corr![i];
    const delta = sug.length - c.length;
    onChange(appliquer(value, c, sug));
    setCorr(corr!.filter((_, j) => j !== i).map((x) => (x.offset > c.offset ? { ...x, offset: x.offset + delta } : x)));
  }
  return (
    <div className="relative">
      <textarea ref={ref} rows={rows} value={value} spellCheck lang="fr" onChange={(e) => { onChange(e.target.value); if (corr) setCorr(null); }} {...rest} className={`field resize-none leading-relaxed ${rest.className ?? ''}`} />
      {editable && value.trim().length > 12 && (
        <button type="button" onClick={verifier} disabled={etat.busy} title="Vérifier l’orthographe et la grammaire"
          className="absolute bottom-1.5 right-2 rounded bg-white/90 px-1.5 text-[11px] text-sauge hover:text-foret">{etat.busy ? '…' : 'Orthographe ✓'}</button>
      )}
      {etat.err && <p className="mt-1 text-[12px] text-terre">{etat.err}</p>}
      {corr && (
        <div className="mt-1.5 rounded-md border border-pierre-100 bg-white p-2 text-[12.5px]">
          {corr.length === 0 ? <p className="text-sauge">Aucune faute détectée.</p> : (
            <ul className="space-y-1.5">
              {corr.map((c, i) => (
                <li key={`${c.offset}-${i}`}>
                  <span className="rounded bg-terre-50 px-1 text-terre line-through decoration-terre/50">{c.extrait || '…'}</span>
                  {c.suggestions.map((sg) => <button key={sg} type="button" onClick={() => choisir(i, sg)} className="ml-1.5 rounded border border-sauge px-1.5 text-sauge hover:bg-sauge hover:text-white">{sg || '(supprimer)'}</button>)}
                  <span className="ml-1.5 text-charbon/55">{c.message}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="mt-1 text-[11px] text-charbon/50" onClick={() => setCorr(null)}>Fermer</button>
        </div>
      )}
    </div>
  );
}

export function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className="field appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%2368725E' stroke-width='1.5'/%3E%3C/svg%3E")` }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/** Champ texte avec suggestions (pathologies, éléments, lots) mais saisie libre. */
/**
 * Liste déroulante avec saisie : un clic ouvre toute la liste (le filtre s’applique en tapant).
 * Si le texte n’existe pas encore et que onCreate est fourni, propose de l’ajouter à la bibliothèque.
 */
export function Combo({ value, onChange, options, placeholder, onCreate, createLabel, hint, groupe, ordreGroupes, className, mots }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
  onCreate?: (v: string) => void; createLabel?: string; hint?: (o: string) => string | undefined;
  /** Rubrique de chaque option : la liste est alors rangée par rubrique, puis par ordre alphabétique */
  groupe?: (o: string) => string | undefined; ordreGroupes?: readonly string[]; className?: string;
  /** Texte supplémentaire parcouru par la recherche (anciens noms, textes, synonymes) */
  mots?: (o: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [filtre, setFiltre] = useState(false); // filtrer seulement après une frappe
  const [actif, setActif] = useState(0);
  const [navigue, setNavigue] = useState(false); // l'utilisateur a choisi une ligne au clavier
  const listRef = useRef<HTMLUListElement>(null);
  const n = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const tri = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' });
  const rangG = (g?: string) => { const i = g ? (ordreGroupes ?? []).indexOf(g) : -1; return i < 0 ? 999 : i; };
  const uniques = Array.from(new Set(options.filter((o) => o.trim())));
  if (groupe) uniques.sort((a, b) => rangG(groupe(a)) - rangG(groupe(b)) || tri(groupe(a) ?? '', groupe(b) ?? '') || tri(a, b));
  // D'abord les noms qui contiennent le texte tapé, puis ceux que retrouvent les mots, synonymes et textes
  const stricts = filtre && value.trim() ? uniques.filter((o) => n(o).includes(n(value.trim()))) : uniques;
  const visibles = filtre && value.trim() ? [...stricts, ...uniques.filter((o) => !stricts.includes(o) && correspond(`${o} ${mots?.(o) ?? ''}`, value))] : uniques;
  const nouveau = onCreate && value.trim() && !uniques.some((o) => n(o) === n(value.trim()));
  const total = visibles.length + (nouveau ? 1 : 0);
  // Aucun nom ne contient le texte tapé : Entrée crée la nouvelle entrée (les entrées proches restent cliquables)
  const creationParDefaut = !!nouveau && !stricts.length && !navigue;
  const choisir = (o: string) => { onChange(o); setOpen(false); setFiltre(false); };
  const creer = () => { onCreate!(value.trim()); setOpen(false); setFiltre(false); };
  useEffect(() => { listRef.current?.querySelectorAll('[role=option]')[actif]?.scrollIntoView({ block: 'nearest' }); }, [actif]);
  return (
    <div className={`relative ${className ?? ''}`}>
      <input value={value} placeholder={placeholder} spellCheck lang="fr" role="combobox" aria-expanded={open} autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setFiltre(true); setOpen(true); setActif(0); setNavigue(false); }}
        onFocus={() => { setOpen(true); setFiltre(false); }}
        onClick={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setNavigue(true); setActif((a) => Math.min(total - 1, a + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setNavigue(true); setActif((a) => Math.max(0, a - 1)); }
          else if (e.key === 'Enter' && open && total) { e.preventDefault(); if (creationParDefaut) creer(); else if (actif < visibles.length) choisir(visibles[actif]); else if (nouveau) creer(); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        className="field pr-9" />
      <button type="button" tabIndex={-1} aria-label="Ouvrir la liste" onMouseDown={(e) => { e.preventDefault(); setOpen(!open); setFiltre(false); }}
        className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-charbon/45 hover:text-foret">▾</button>
      {open && total > 0 && (
        <ul ref={listRef} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-pierre-100 bg-white py-1 text-[14px] shadow-lg">
          {visibles.map((o, i) => (<Fragment key={o}>
            {groupe && (i === 0 || groupe(visibles[i - 1]) !== groupe(o)) && (
              <li role="presentation" className="sticky top-0 bg-ivoire px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-charbon/55">{groupe(o) ?? 'Autres'}</li>
            )}
            <li role="option" aria-selected={o === value} onMouseDown={(e) => { e.preventDefault(); choisir(o); }} onMouseEnter={() => setActif(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-2 px-3 py-1.5 ${i === actif && !creationParDefaut ? 'bg-ivoire' : ''} ${o === value ? 'font-medium text-foret' : ''}`}>
              <span>{o}</span>{hint?.(o) && <span className="shrink-0 text-[11px] text-charbon/45">{hint(o)}</span>}
            </li>
          </Fragment>))}
          {nouveau && (
            <li role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); creer(); }} onMouseEnter={() => setActif(visibles.length)}
              className={`cursor-pointer border-t border-pierre-100 px-3 py-2 text-sauge ${actif === visibles.length || creationParDefaut ? 'bg-sauge-50' : ''}`}>
              + {createLabel ?? 'Ajouter'} « {value.trim()} »{creationParDefaut && visibles.length > 0 ? <span className="ml-1 text-[11px] text-charbon/45">(Entrée) — ou choisissez une entrée proche ci-dessus</span> : null}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Plusieurs corps d'état : pastilles supprimables + liste pour en ajouter (ou en créer). */
export function LotsChips({ value, onChange, options, onCreate, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; options: string[]; onCreate?: (v: string) => void; placeholder?: string;
}) {
  const [saisie, setSaisie] = useState('');
  const ajouter = (v: string) => { const t = v.trim(); if (t && !value.includes(t)) onChange([...value, t]); setSaisie(''); };
  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((l, i) => (
            <span key={l} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] ${i === 0 ? 'border-foret bg-foret text-ivoire' : 'border-pierre bg-white text-charbon'}`} title={i === 0 ? 'Lot principal (utilisé pour le chiffrage)' : undefined}>
              {l}
              {i > 0 && <button type="button" className="text-charbon/40 hover:text-foret" title="En faire le lot principal" onClick={() => onChange([l, ...value.filter((x) => x !== l)])}>↑</button>}
              <button type="button" aria-label={`Retirer ${l}`} className={i === 0 ? 'text-ivoire/70 hover:text-white' : 'text-charbon/40 hover:text-terre'} onClick={() => onChange(value.filter((x) => x !== l))}>×</button>
            </span>
          ))}
        </div>
      )}
      <Combo value={saisie} onChange={(v) => { if (options.includes(v)) ajouter(v); else setSaisie(v); }} options={options.filter((o) => !value.includes(o))}
        placeholder={placeholder ?? (value.length ? '+ Ajouter un autre corps d’état…' : 'Choisir un ou plusieurs corps d’état…')}
        onCreate={(v) => { onCreate?.(v); ajouter(v); }} createLabel="Ajouter à mes lots" />
    </div>
  );
}

export function PriorityDot({ p, size = 10 }: { p: Priority; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: PRIORITY[p].color }} />;
}

export function PriorityBadge({ p }: { p: Priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-label text-[10px] font-semibold tracking-wider" style={{ borderColor: PRIORITY[p].color, color: PRIORITY[p].color }}>
      <PriorityDot p={p} size={7} /> {PRIORITY[p].court}
    </span>
  );
}

export function PriorityPicker({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-2">
      {(Object.keys(PRIORITY) as Priority[]).map((p) => {
        const on = value === p;
        return (
          <button key={p} type="button" role="radio" aria-checked={on} onClick={() => onChange(p)}
            className="flex min-h-[56px] flex-col items-start justify-center rounded-md border px-3 py-2 text-left transition"
            style={{ borderColor: on ? PRIORITY[p].color : '#E9E0D2', background: on ? PRIORITY[p].color + '12' : '#fff' }}>
            <span className="flex items-center gap-2 font-label text-xs font-semibold" style={{ color: PRIORITY[p].color }}>
              <PriorityDot p={p} /> {PRIORITY[p].court}
            </span>
            <span className="mt-0.5 text-[11px] leading-tight text-charbon/60">{p === 'P1' ? 'Sécurité, eau active' : p === 'P2' ? 'Durabilité, conservation' : 'Entretien, finitions'}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Dépôt photo : glisser-déposer, sélection de fichier ou appareil photo (tablette). */
export function PhotoDrop({ photo, onChange, title, hint, choix }: { photo: Photo | null; onChange: (p: Photo | null) => void; title: string; hint: string; choix?: { photo: Photo; label: string }[] }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function take(files: FileList | File[] | null) {
    const f = files ? Array.from(files)[0] : undefined;
    if (!f || !f.type.startsWith('image/')) return;
    setBusy(true);
    try { onChange(await fileToPhoto(f)); } finally { setBusy(false); }
  }
  const cible = (files: File[]) => take(files);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="label-caps">{title}</span>
        {photo && <button type="button" onClick={() => onChange(null)} className="text-[11px] text-terre hover:underline">Retirer</button>}
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setOver(false);
          const interne = e.dataTransfer.getData('application/x-photo');
          if (interne) { const p = choix?.find((c) => c.photo.id === interne)?.photo; if (p) onChange(p); return; }
          take(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        onMouseEnter={() => setCibleSurvolee(cible)} onMouseLeave={() => setCibleSurvolee(null)}
        onFocus={() => setCibleSurvolee(cible)} onBlur={() => setCibleSurvolee(null)}
        role="button" tabIndex={0} title="Cliquer pour choisir, glisser une image, ou survoler puis Ctrl+V pour coller"
        className={`relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed transition ${over ? 'border-sauge bg-sauge-50' : 'border-pierre bg-pierre-50/60 hover:border-sauge'}`}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.src} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="px-4 text-center">
            <svg viewBox="0 0 24 24" className="mx-auto mb-2 h-7 w-7 text-sauge" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6l1.5-2h5L16 6" /></svg>
            <p className="text-[13px] text-charbon/70">{busy ? 'Préparation…' : hint}</p>
            <p className="mt-1 text-[11px] text-charbon/45">Glisser, toucher pour choisir, ou Ctrl+V pour coller</p>
          </div>
        )}
        <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => take(e.target.files)} />
      </div>
      {choix && choix.length > 0 && <button type="button" onClick={() => setPicker(true)} className="mt-1.5 text-[12px] text-foret underline decoration-pierre underline-offset-2">Choisir parmi les photos importées ({choix.length})</button>}
      {photo && (
        <input value={photo.legende ?? ''} onChange={(e) => onChange({ ...photo, legende: e.target.value })} placeholder="Légende (facultatif)" className="field mt-2 py-1.5 text-[13px]" />
      )}
      {picker && choix && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-charbon/30 p-4" onClick={() => setPicker(false)}>
          <div className="card max-h-[85vh] w-full max-w-3xl overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 font-serif text-xl font-semibold text-foret">Choisir une photo importée</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {choix.map((c, i) => (
                <button key={(c.photo.id ?? '') + i} type="button" onClick={() => { onChange(c.photo); setPicker(false); }} className={`text-left ${photo?.id === c.photo.id ? 'ring-2 ring-terre' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.photo.src} alt="" className="aspect-[4/3] w-full rounded object-cover" />
                  <span className="block truncate text-[10px] text-charbon/55">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="label-caps mb-1">{eyebrow}</p>}
        <h2 className="font-serif text-[28px] font-semibold leading-tight text-foret">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export const money = (v: number | null) => (v == null ? '' : String(v));
export const parseNum = (s: string): number | null => {
  const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
};
