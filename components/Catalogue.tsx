'use client';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { categorieDesordre, categoriePreco, correspond, motsDesordre, motsPreco } from '@/lib/catalogue';
import { FAMILLES, type DesordreTemplate } from '@/lib/templates';
import type { PreconisationType } from '@/lib/preconisations';

export interface ItemCatalogue {
  id: string;
  titre: string;
  /** Rangement principal (ouvrage pour les désordres, nature d'intervention pour les préconisations) */
  groupe: string;
  /** Rangement secondaire (famille de pathologie) */
  nature?: string;
  info?: string;
  /** Texte parcouru par la recherche (titre, anciens noms, textes, corps d'état…) */
  mots: string;
  propose?: boolean;
}

/**
 * Sélecteur de bibliothèque : toute la bibliothèque est accessible (pas seulement les favoris),
 * rangée par catégorie puis par ordre alphabétique ; la recherche porte sur les titres, les anciens
 * noms, les textes et les synonymes de terrain (« humidité » trouve « remontées capillaires »).
 */
export default function Catalogue({ items, ordre, label, onPick, titrePropose, className = '', cleRangement }: {
  items: ItemCatalogue[]; ordre: readonly string[]; label: string; onPick: (id: string) => void;
  titrePropose?: string; className?: string; cleRangement?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [actif, setActif] = useState(0);
  const [parNature, setParNature] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const liste = useRef<HTMLUListElement>(null);
  const avecNature = items.some((i) => i.nature);

  useEffect(() => { if (cleRangement) try { setParNature(localStorage.getItem(cleRangement) === 'nature'); } catch { /* rien */ } }, [cleRangement]);
  useEffect(() => {
    if (!open) return;
    const fermer = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fermer);
    setTimeout(() => champ.current?.focus(), 0);
    return () => document.removeEventListener('mousedown', fermer);
  }, [open]);

  const tri = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' });
  const lignes = useMemo(() => {
    const g = (i: ItemCatalogue) => (parNature && i.nature ? i.nature : i.groupe);
    const rang = (x: string) => { const k = ordre.indexOf(x); return k < 0 ? 999 : k; };
    const trouves = items.filter((i) => correspond(`${i.titre} ${i.mots}`, q));
    // Les titres qui contiennent la recherche passent devant les correspondances dans le texte
    const dansTitre = (i: ItemCatalogue) => (q.trim() && correspond(i.titre, q) ? 0 : 1);
    const out: { item: ItemCatalogue; groupe: string }[] = [];
    if (!q.trim()) trouves.filter((i) => i.propose).sort((a, b) => tri(a.titre, b.titre)).forEach((item) => out.push({ item, groupe: titrePropose ?? 'Proposés' }));
    [...trouves].sort((a, b) => (q.trim() ? dansTitre(a) - dansTitre(b) : 0) || rang(g(a)) - rang(g(b)) || tri(g(a), g(b)) || tri(a.titre, b.titre))
      .forEach((item) => out.push({ item, groupe: q.trim() && dansTitre(item) === 0 ? 'Titres correspondants' : g(item) }));
    return out;
  }, [items, q, parNature, ordre, titrePropose]);

  useEffect(() => { setActif(0); }, [q]);
  useEffect(() => { liste.current?.querySelectorAll('[role=option]')[actif]?.scrollIntoView({ block: 'nearest' }); }, [actif]);
  const choisir = (id: string) => { onPick(id); setOpen(false); setQ(''); };

  return (
    <div ref={box} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="field flex w-full items-center justify-between gap-2 py-1.5 text-left text-[13px]">
        <span className="truncate">{label}</span><span aria-hidden className="text-charbon/45">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 z-40 mt-1 w-[min(560px,92vw)] rounded-lg border border-pierre bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-pierre-100 p-2">
            <input ref={champ} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher : mot, ouvrage, corps d’état, texte…" className="field py-1.5 text-[14px]" aria-label="Rechercher dans la bibliothèque"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActif((a) => Math.min(lignes.length - 1, a + 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActif((a) => Math.max(0, a - 1)); }
                else if (e.key === 'Enter' && lignes[actif]) { e.preventDefault(); choisir(lignes[actif].item.id); }
                else if (e.key === 'Escape') setOpen(false);
              }} />
            {avecNature && (
              <button type="button" className="whitespace-nowrap rounded border border-pierre px-2 py-1 text-[11px] text-foret hover:border-sauge"
                title="Changer le rangement de la liste"
                onClick={() => { const v = !parNature; setParNature(v); if (cleRangement) try { localStorage.setItem(cleRangement, v ? 'nature' : 'ouvrage'); } catch { /* rien */ } }}>
                {parNature ? 'Ranger par ouvrage' : 'Ranger par nature'}
              </button>
            )}
          </div>
          <ul ref={liste} role="listbox" className="max-h-80 overflow-y-auto py-1">
            {lignes.length === 0 && <li className="px-3 py-3 text-[13px] text-charbon/50">Rien ne correspond à « {q} ».</li>}
            {lignes.map(({ item, groupe }, i) => (
              <Fragment key={`${groupe}-${item.id}`}>
                {(i === 0 || lignes[i - 1].groupe !== groupe) && (
                  <li role="presentation" className="sticky top-0 flex justify-between bg-ivoire px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-charbon/55">
                    <span>{groupe}</span><span className="font-normal">{lignes.filter((l) => l.groupe === groupe).length}</span>
                  </li>
                )}
                <li role="option" aria-selected={i === actif} onMouseEnter={() => setActif(i)} onMouseDown={(e) => { e.preventDefault(); choisir(item.id); }}
                  className={`cursor-pointer px-3 py-1.5 text-[13px] ${i === actif ? 'bg-sauge-50' : ''}`}>
                  <span className="text-charbon">{item.titre}</span>
                  {item.info && <span className="ml-2 text-[11px] text-charbon/45">{item.info}</span>}
                </li>
              </Fragment>
            ))}
          </ul>
          <p className="border-t border-pierre-100 px-3 py-1.5 text-[11px] text-charbon/45">{items.length} entrées dans votre bibliothèque · flèches + Entrée pour choisir</p>
        </div>
      )}
    </div>
  );
}

const fam = (f: string) => f.replace(' & ', ' et ');
export const ORDRE_NATURES = FAMILLES.map(fam);
export const itemsDesordres = (l: DesordreTemplate[], proposes: string[] = []): ItemCatalogue[] => l.map((t) => ({
  id: t.type, titre: t.type, groupe: categorieDesordre(t), nature: fam(t.famille), info: [t.element, fam(t.famille)].filter(Boolean).join(' · '),
  mots: motsDesordre(t), propose: proposes.includes(t.type),
}));
export const itemsPrecos = (l: PreconisationType[], pourType?: string): ItemCatalogue[] => l.map((p) => ({
  id: p.id, titre: p.titre, groupe: categoriePreco(p), nature: fam(p.famille), info: (p.lots?.length ? p.lots : [p.lot]).filter(Boolean).join(', '),
  mots: motsPreco(p), propose: !!pourType && !!p.pour?.some((t) => t === pourType),
}));
