'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLibrary } from './LibraryProvider';
import { correspond } from '@/lib/catalogue';

export interface GroupeTextes { titre: string; items: { label: string; texte: string }[] }

/**
 * Sélecteur de textes types : recherche, favoris (★) en tête, puis les plus utilisés.
 * Remplace la liste déroulante simple pour être utilisable avec de longues listes.
 */
export default function PhrasePicker({ listKey, items, onPick, label, align = 'right', groupes = [] }: {
  listKey: string; items: string[]; onPick: (t: string) => void; label: string; align?: 'left' | 'right';
  /** Textes de toute la bibliothèque (désordres types, préconisations), rangés par catégorie */
  groupes?: GroupeTextes[];
}) {
  const { toggleFavori, isFavori, usageOf, noteUse } = useLibrary();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    setTimeout(() => search.current?.focus(), 0);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtered = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return items.filter((t) => words.every((w) => norm(t).includes(w)) || correspond(t, q));
  }, [items, q]);
  const groupesFiltres = useMemo(() => groupes.map((g) => ({ ...g, items: g.items.filter((i) => correspond(`${g.titre} ${i.label} ${i.texte}`, q)) })).filter((g) => g.items.length), [groupes, q]);

  if (!items.length && !groupes.length) return null;

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex items-center gap-1 rounded-md border border-pierre bg-ivoire px-2 py-1 text-[12px] text-foret hover:border-sauge">
        {label} <span aria-hidden className="text-[10px]">▾</span>
      </button>
      {open && (
        <div className={`absolute z-40 mt-1 w-[min(440px,85vw)] rounded-lg border border-pierre bg-white shadow-xl ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <div className="border-b border-pierre-100 p-2">
            <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans la liste…" className="field py-1.5 text-[14px]" />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && groupesFiltres.length === 0 && <li className="px-3 py-3 text-[13px] text-charbon/50">Aucun texte ne correspond.</li>}
            {filtered.length > 0 && groupes.length > 0 && <li role="presentation" className="sticky top-0 bg-ivoire px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-charbon/55">Ma liste</li>}
            {filtered.map((t) => {
              const fav = isFavori(listKey, t);
              const n = usageOf(listKey, t);
              return (
                <li key={t} className="group flex items-start gap-1 px-1 hover:bg-ivoire">
                  <button type="button" title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={() => toggleFavori(listKey, t)}
                    className={`mt-1 shrink-0 px-1.5 text-[14px] ${fav ? 'text-terre' : 'text-pierre group-hover:text-sauge'}`}>{fav ? '★' : '☆'}</button>
                  <button type="button" className="flex-1 py-1.5 pr-2 text-left text-[13px] leading-snug text-charbon"
                    onClick={() => { onPick(t); noteUse(listKey, t); setOpen(false); setQ(''); }}>
                    {t}
                    {n > 0 && <span className="ml-1.5 whitespace-nowrap text-[11px] text-charbon/40">· {n}×</span>}
                  </button>
                </li>
              );
            })}
            {groupesFiltres.map((g) => (
              <li key={g.titre}>
                <p className="sticky top-0 bg-ivoire px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-charbon/55">{g.titre}</p>
                <ul>
                  {g.items.map((i, k) => (
                    <li key={k}>
                      <button type="button" className="w-full px-3 py-1.5 text-left text-[13px] leading-snug hover:bg-ivoire" title={i.texte}
                        onClick={() => { onPick(i.texte); setOpen(false); setQ(''); }}>
                        <span className="font-medium text-foret">{i.label}</span>
                        <span className="line-clamp-2 block text-[12px] text-charbon/65">{i.texte}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="border-t border-pierre-100 px-3 py-1.5 text-[11px] text-charbon/45">★ favoris en tête · les textes les plus utilisés remontent automatiquement</p>
        </div>
      )}
    </div>
  );
}
