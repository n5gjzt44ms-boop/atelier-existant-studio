'use client';
import { useState } from 'react';
import { eur } from '@/lib/commercial';
import { uid } from '@/lib/factory';
import type { LigneCommerciale } from '@/lib/types';

/** Ajoute une remise (pourcentage ou montant) sous forme de ligne négative : remise amicale, fidélité… */
export default function Remise({ lignes, onChange }: { lignes: LigneCommerciale[]; onChange: (l: LigneCommerciale[]) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [mode, setMode] = useState<'pct' | 'eur'>('pct');
  const [val, setVal] = useState(10);
  const [libelle, setLibelle] = useState('Remise amicale');
  const base = lignes.filter((l) => l.puHT > 0).reduce((a, l) => a + l.quantite * l.puHT, 0);
  const montant = Math.round((mode === 'pct' ? (base * val) / 100 : val) * 100) / 100;
  if (!ouvert) return <button type="button" className="btn-quiet text-[13px]" onClick={() => setOuvert(true)}>+ Remise (ami, fidélité…)</button>;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-ivoire p-2 text-[13px]">
      <select value={libelle} onChange={(e) => setLibelle(e.target.value)} className="field w-auto py-1.5 text-[13px]">
        {['Remise amicale', 'Remise de fidélité', 'Remise commerciale', 'Remise missions groupées', 'Geste commercial'].map((x) => <option key={x}>{x}</option>)}
      </select>
      <input inputMode="decimal" value={val} onChange={(e) => setVal(Number(e.target.value.replace(',', '.')) || 0)} className="field w-20 py-1.5" aria-label="Valeur de la remise" />
      <select value={mode} onChange={(e) => setMode(e.target.value as 'pct' | 'eur')} className="field w-auto py-1.5"><option value="pct">%</option><option value="eur">€</option></select>
      <span className="text-charbon/60">soit − {eur(montant)}</span>
      <button type="button" className="btn-primary min-h-[34px] text-[12px]" disabled={montant <= 0} onClick={() => { onChange([...lignes, { id: uid(), libelle: mode === 'pct' ? `${libelle} (${val} %)` : libelle, quantite: 1, unite: 'forfait', puHT: -montant }]); setOuvert(false); }}>Ajouter</button>
      <button type="button" className="btn-quiet text-[12px]" onClick={() => setOuvert(false)}>Annuler</button>
    </div>
  );
}
