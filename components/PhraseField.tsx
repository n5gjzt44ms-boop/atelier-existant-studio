'use client';
import { useMemo, useState } from 'react';
import type { PhraseKey } from '@/lib/library';
import { useLibrary } from './LibraryProvider';
import { TextArea } from './ui';
import PhrasePicker, { type GroupeTextes } from './PhrasePicker';
import { CATEGORIES_DESORDRE, CATEGORIES_PRECO, categorieDesordre, categoriePreco } from '@/lib/catalogue';
import { sansMentionVerif } from '@/lib/fiches';

/**
 * Champ de texte avec liste déroulante de textes types (bibliothèque).
 *  - « replace » : le texte choisi remplace le contenu (datation, typologie, météo…)
 *  - « append »  : le texte choisi s'ajoute à la suite (paragraphes)
 * Le bouton « + Ma liste » enregistre le texte saisi pour le réutiliser.
 */
export default function PhraseField({
  label, hint, value, onChange, phraseKey, mode = 'append', multiline = true, placeholder, rows = 3,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; phraseKey: PhraseKey;
  mode?: 'append' | 'replace'; multiline?: boolean; placeholder?: string; rows?: number;
}) {
  const { phrases, addPhrase, lib } = useLibrary();
  const list = phrases(phraseKey);
  // Toute la bibliothèque : les textes des désordres types (et des préconisations), rangés par catégorie
  const groupes = useMemo((): GroupeTextes[] => {
    const champ = phraseKey === 'constat' || phraseKey === 'analyse' || phraseKey === 'investigations' || phraseKey === 'preconisation' ? phraseKey : null;
    if (!champ) return [];
    const map = new Map<string, GroupeTextes['items']>();
    const ajouter = (g: string, label: string, texte: string) => { const t = (champ === 'analyse' ? sansMentionVerif(texte) : texte).trim(); if (!t || t === '—') return; if (!map.has(g)) map.set(g, []); map.get(g)!.push({ label, texte: t }); };
    if (champ === 'preconisation') for (const p of lib.preconisations) ajouter(`Préconisations · ${categoriePreco(p)}`, p.titre, p.texte);
    for (const t of lib.desordres) ajouter(`Désordres types · ${categorieDesordre(t)}`, t.type, t[champ]);
    const ordre = [...CATEGORIES_PRECO.map((c) => `Préconisations · ${c}`), ...CATEGORIES_DESORDRE.map((c) => `Désordres types · ${c}`)];
    return [...map.entries()].sort((a, b) => ordre.indexOf(a[0]) - ordre.indexOf(b[0])).map(([titre, items]) => ({ titre, items: items.sort((x, y) => x.label.localeCompare(y.label, 'fr')) }));
  }, [lib, phraseKey]);
  const [saved, setSaved] = useState(false);
  const canSave = value.trim().length > 0 && !list.includes(value.trim());

  function pick(t: string) {
    if (!t) return;
    if (mode === 'replace' || !value.trim()) onChange(t);
    else onChange(value.replace(/\s*$/, '') + (/[.!?…:]$/.test(value.trim()) ? ' ' : '. ') + t);
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="label-caps">{label}{hint && <span className="ml-2 normal-case tracking-normal text-charbon/45">{hint}</span>}</span>
        <span className="flex min-w-0 items-center gap-2">
          <PhrasePicker listKey={phraseKey} items={list} groupes={groupes} onPick={pick} label={mode === 'replace' ? 'Choisir dans ma liste' : 'Textes types'} />
          {canSave && (
            <button type="button" title="Enregistrer ce texte dans ma liste déroulante"
              onClick={() => { addPhrase(phraseKey, value); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
              className="whitespace-nowrap text-[12px] text-sauge hover:text-foret">
              + Ma liste
            </button>
          )}
          {saved && <span className="text-[12px] text-sauge">Ajouté</span>}
        </span>
      </div>
      {multiline
        ? <TextArea rows={rows} value={value} onChange={onChange} placeholder={placeholder} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field" />}
    </div>
  );
}
