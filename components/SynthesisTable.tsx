'use client';
import { computeScenarios, countByPriority, fmtRange, sortDesordres, totalsByLot, totalsByPriority } from '@/lib/calc';
import { PRIORITY } from '@/lib/constants';
import { lotsDe } from '@/lib/factory';
import type { Dossier, Priority } from '@/lib/types';
import { PriorityBadge, PriorityDot } from './ui';

/**
 * Agrégation automatique des fiches désordres :
 *  - tableau matriciel hiérarchisé (P1 → P3)
 *  - totaux par priorité et par lot
 *  - scénarios budgétaires A / B / C (aléas + TVA)
 *
 * `variant="editor"` : rendu interface (Tailwind) avec réglages aléas/TVA.
 * `variant="report"` : rendu livrable (classes .report de globals.css).
 * `part` permet au rapport d'afficher la matrice et les scénarios sur des pages distinctes.
 */
interface Props {
  dossier: Dossier;
  variant?: 'editor' | 'report';
  part?: 'all' | 'matrix' | 'scenarios';
  onFinancesChange?: (f: Dossier['finances']) => void;
  onOpenDesordre?: (id: string) => void;
}

export default function SynthesisTable({ dossier, variant = 'editor', part = 'all', onFinancesChange, onOpenDesordre }: Props) {
  const list = sortDesordres(dossier.desordres);
  const zoneName = (code: string) => dossier.zones.find((z) => z.code === code)?.nom ?? '';
  const byP = totalsByPriority(list);
  const count = countByPriority(list);
  const lots = totalsByLot(list);
  const scenarios = computeScenarios(dossier);
  const prios = Object.keys(PRIORITY) as Priority[];

  /* ─────────────── Rendu livrable ─────────────── */
  if (variant === 'report') {
    return (
      <>
        {part !== 'scenarios' && (
          <>
            <table>
              <thead>
                <tr><th>Numéro</th><th>Localisation</th><th>Désordre</th><th>Priorité</th><th>Lot</th><th className="num">Estimation hors taxes</th></tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id} className="keep">
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{d.numero}</td>
                    <td>{d.zoneCode}<br /><span style={{ color: '#68725E' }}>{zoneName(d.zoneCode)}</span></td>
                    <td>{d.type}<br /><span style={{ color: '#68725E' }}>{d.element}</span></td>
                    <td><ReportPrio p={d.priorite} /></td>
                    <td>{lotsDe(d).join(', ') || '—'}</td>
                    <td className="num">{fmtRange({ bas: d.chiffrage.bas ?? 0, haut: d.chiffrage.haut ?? d.chiffrage.bas ?? 0 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {prios.map((p) => (
                  <tr key={p}>
                    <td colSpan={5} style={{ borderBottom: 'none', paddingTop: '1.2mm', paddingBottom: '1.2mm' }}><ReportPrio p={p} /> &nbsp;{count[p]} désordre{count[p] > 1 ? 's' : ''}</td>
                    <td className="num" style={{ borderBottom: 'none', paddingTop: '1.2mm', paddingBottom: '1.2mm' }}>{fmtRange(byP[p])}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
            {lots.length > 0 && (
              <>
                <h3>Répartition par lot</h3>
                <table>
                  <thead><tr><th>Lot / corps d’état</th><th className="num">Désordres</th><th className="num">Estimation hors taxes</th></tr></thead>
                  <tbody>{lots.map((l) => <tr key={l.lot}><td>{l.lot}</td><td className="num">{l.count}</td><td className="num">{fmtRange(l.range)}</td></tr>)}</tbody>
                </table>
              </>
            )}
          </>
        )}

        {part !== 'matrix' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4mm', margin: '2mm 0 6mm' }}>
              {scenarios.map((s) => (
                <div key={s.code} className="boxed keep" style={{ borderColor: s.code === 'B' ? '#68725E' : '#D6C7AF' }}>
                  <div className="eyebrow">Scénario {s.code}</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '14pt', fontWeight: 600, color: '#334B3D', margin: '1mm 0 3mm', lineHeight: 1.1 }}>{s.titre}</div>
                  <div style={{ fontSize: '7pt', color: '#68725E' }}>Total toutes taxes comprises</div>
                  <div style={{ fontSize: '11pt', fontWeight: 600 }}>{fmtRange(s.ttc)}</div>
                </div>
              ))}
            </div>
            <table>
              <thead>
                <tr><th></th>{scenarios.map((s) => <th key={s.code} className="num">Scénario {s.code}</th>)}</tr>
              </thead>
              <tbody>
                <Row label="Travaux hors taxes" values={scenarios.map((s) => fmtRange(s.ht))} />
                <Row label={`Provision pour aléas (${dossier.finances.aleasPct} %)`} values={scenarios.map((s) => fmtRange(s.aleas))} />
                <Row label="Total hors taxes" values={scenarios.map((s) => fmtRange(s.totalHT))} strong />
                <Row label={`Taxe sur la valeur ajoutée (${dossier.finances.tvaPct.toLocaleString('fr-FR')} %)`} values={scenarios.map((s) => fmtRange(s.tva))} />
                <Row label="Total toutes taxes comprises" values={scenarios.map((s) => fmtRange(s.ttc))} strong />
              </tbody>
            </table>
            <p style={{ fontSize: '7.5pt', color: '#68725E', marginTop: '3mm' }}>
              Ordres de grandeur indicatifs établis sans métré précis ; ils ne valent pas devis d’entreprises. Honoraires d’études et investigations complémentaires non inclus sauf mention.
            </p>
          </>
        )}
      </>
    );
  }

  /* ─────────────── Rendu éditeur ─────────────── */
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {prios.map((p) => (
          <div key={p} className="card p-4" style={{ borderTop: `3px solid ${PRIORITY[p].color}` }}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-label text-xs font-semibold" style={{ color: PRIORITY[p].color }}><PriorityDot p={p} /> {PRIORITY[p].court}</span>
              <span className="font-serif text-2xl font-semibold text-foret">{count[p]}</span>
            </div>
            <p className="mt-2 whitespace-nowrap text-[15px] font-medium tabular-nums">{fmtRange(byP[p])}</p>
            <p className="text-[11px] text-charbon/50">hors taxes, hors aléas</p>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-[14px]">
          <thead>
            <tr className="border-b border-sauge/60 text-left">
              {['Numéro', 'Zone', 'Désordre', 'Priorité', 'Étape', 'Estimation'].map((h, i) => (
                <th key={h} className={`label-caps px-3 py-3 ${i === 5 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-charbon/50">Aucune fiche désordre pour l’instant.</td></tr>}
            {list.map((d) => (
              <tr key={d.id} onClick={() => onOpenDesordre?.(d.id)} className="cursor-pointer border-b border-pierre-100 last:border-0 hover:bg-ivoire">
                <td className="whitespace-nowrap px-3 py-3 font-semibold text-foret">{d.numero}</td>
                <td className="whitespace-nowrap px-3 py-3">{d.zoneCode || <span className="text-terre">À localiser</span>}</td>
                <td className="px-3 py-3">{d.type}<span className="block text-[12px] text-charbon/55">{d.element}</span></td>
                <td className="px-3 py-3"><PriorityBadge p={d.priorite} /></td>
                <td className="px-3 py-3 text-charbon/70">{d.phase}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{fmtRange({ bas: d.chiffrage.bas ?? 0, haut: d.chiffrage.haut ?? d.chiffrage.bas ?? 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-serif text-xl font-semibold text-foret">Scénarios budgétaires</h3>
          {onFinancesChange && (
            <div className="flex items-center gap-4 text-[13px]">
              <label className="flex items-center gap-2">Aléas
                <input type="number" min={0} max={40} value={dossier.finances.aleasPct} onChange={(e) => onFinancesChange({ ...dossier.finances, aleasPct: Number(e.target.value) || 0 })} className="field w-20 py-1.5" /> %
              </label>
              <label className="flex items-center gap-2">TVA
                <select value={dossier.finances.tvaPct} onChange={(e) => onFinancesChange({ ...dossier.finances, tvaPct: Number(e.target.value) })} className="field w-24 py-1.5">
                  <option value={5.5}>5,5 %</option><option value={10}>10 %</option><option value={20}>20 %</option>
                </select>
              </label>
            </div>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {scenarios.map((s) => (
            <div key={s.code} className={`card p-5 ${s.code === 'B' ? 'border-sauge' : ''}`}>
              <p className="label-caps">Scénario {s.code}</p>
              <p className="mt-1 font-serif text-xl font-semibold text-foret">{s.titre}</p>
              <dl className="mt-4 space-y-1.5 text-[13px]">
                <Line k="Travaux hors taxes" v={fmtRange(s.ht)} />
                <Line k={`Aléas ${dossier.finances.aleasPct} %`} v={fmtRange(s.aleas)} />
                <Line k={`TVA ${dossier.finances.tvaPct.toLocaleString('fr-FR')} %`} v={fmtRange(s.tva)} />
              </dl>
              <div className="mt-3 border-t border-pierre-100 pt-3">
                <p className="text-[11px] text-charbon/55">Total toutes taxes comprises</p>
                <p className="whitespace-nowrap text-lg font-semibold tabular-nums text-charbon">{fmtRange(s.ttc)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportPrio({ p }: { p: Priority }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1.2mm', color: PRIORITY[p].color, fontWeight: 600, whiteSpace: 'nowrap' }}>
      <span style={{ width: '2.2mm', height: '2.2mm', borderRadius: '50%', background: PRIORITY[p].color, display: 'inline-block' }} />{PRIORITY[p].court}
    </span>
  );
}

function Row({ label, values, strong }: { label: string; values: string[]; strong?: boolean }) {
  return (
    <tr style={strong ? { fontWeight: 600 } : undefined}>
      <td>{label}</td>
      {values.map((v, i) => <td key={i} className="num">{v}</td>)}
    </tr>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-charbon/60">{k}</dt><dd className="whitespace-nowrap tabular-nums">{v}</dd></div>;
}
