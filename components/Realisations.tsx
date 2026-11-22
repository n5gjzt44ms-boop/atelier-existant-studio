'use client';
import type { EntrepriseInfo, Realisation } from '@/lib/business';
import { DELIVERABLES } from '@/lib/constants';
import type { Dossier } from '@/lib/types';
import { useLibrary } from './LibraryProvider';
import { ASSET_BASE } from './ReportPreview';
import { Field, Input, TextArea } from './ui';

/** Résumé proposé automatiquement pour une réalisation. */
function resume(d: Dossier): string {
  const c = d.contexte;
  const bat = [c.typologie, c.datation].filter(Boolean).join(', ');
  const n = d.desordres.length;
  const urg = d.desordres.filter((x) => x.priorite === 'P1').length;
  const familles = Array.from(new Set(d.desordres.map((x) => x.type))).slice(0, 3).join(', ').toLowerCase();
  return [
    `${DELIVERABLES[d.type].titre} d’un bâtiment${bat ? ` (${bat.toLowerCase()})` : ''}${d.meta.bien.commune ? ` à ${d.meta.bien.commune}` : ''}.`,
    n ? `${n} désordre${n > 1 ? 's' : ''} relevé${n > 1 ? 's' : ''}${urg ? `, dont ${urg} urgent${urg > 1 ? 's' : ''}` : ''}${familles ? ` : ${familles}` : ''}.` : '',
    d.conclusion.bilan ? d.conclusion.bilan.split(/(?<=[.!?])\s/)[0] : '',
  ].filter(Boolean).join(' ');
}

const nomR = (d: Dossier, r: Realisation) => r.titre || `${d.contexte.typologie || 'Bâtiment ancien'}${d.meta.bien.commune ? ` — ${d.meta.bien.commune}` : ''}`;

/** « Nos réalisations » : sélection des missions terminées mises en avant, et livret imprimable. */
export default function Realisations({ dossiers, onPrint, onOpen }: { dossiers: Dossier[]; onPrint: (node: React.ReactNode, titre: string) => void; onOpen: (id: string) => void }) {
  const { lib, setLib } = useLibrary();
  const finis = dossiers.filter((d) => !d.prospect && (d.status === 'finalise' || d.status === 'envoye'));
  const real = lib.realisations;
  const set = (l: Realisation[]) => setLib({ ...lib, realisations: l });
  const upd = (id: string, p: Partial<Realisation>) => set(real.map((r) => (r.dossierId === id ? { ...r, ...p } : r)));
  const choisies = real.filter((r) => dossiers.some((d) => d.id === r.dossierId));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[32px] font-semibold leading-none text-foret">Nos réalisations</h1>
          <p className="mt-2 text-[14px] text-charbon/60">Mettez en avant les missions terminées : un livret à imprimer ou à envoyer aux prospects et aux prescripteurs.</p>
        </div>
        <button type="button" className="btn-primary" disabled={!choisies.some((r) => r.accordClient)} onClick={() => onPrint(<LivretRealisations ent={lib.entreprise} items={choisies.filter((r) => r.accordClient).map((r) => ({ r, d: dossiers.find((d) => d.id === r.dossierId)! }))} />, `Nos réalisations — ${lib.entreprise.nom}`)}>
          Imprimer le livret ({choisies.filter((r) => r.accordClient).length})
        </button>
      </div>
      <p className="rounded-md bg-terre-50 p-3 text-[13px] text-charbon/75">Seules les réalisations avec l’accord du client sont imprimées. Cochez « anonyme » pour ne montrer que la commune, sans nom ni adresse.</p>

      {choisies.length > 0 && (
        <div className="space-y-3">
          {choisies.map((r) => {
            const d = dossiers.find((x) => x.id === r.dossierId)!;
            return (
              <div key={r.dossierId} className="card grid gap-4 p-4 md:grid-cols-[180px_1fr]">
                {d.meta.photoCouverture
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={d.meta.photoCouverture.src} alt="" className="aspect-[4/3] w-full rounded object-cover" />
                  : <div className="grid aspect-[4/3] place-items-center rounded bg-pierre-50 text-[12px] text-charbon/50">Pas de photo de couverture</div>}
                <div className="space-y-2">
                  <Field label="Titre"><Input value={r.titre} onChange={(e) => upd(r.dossierId, { titre: e.target.value })} placeholder={nomR(d, r)} /></Field>
                  <Field label="Résumé"><TextArea value={r.texte} onChange={(v) => upd(r.dossierId, { texte: v })} /></Field>
                  <div className="flex flex-wrap items-center gap-4 text-[13px]">
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={r.accordClient} onChange={(e) => upd(r.dossierId, { accordClient: e.target.checked })} /> Accord du client pour la diffusion</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={r.anonyme} onChange={(e) => upd(r.dossierId, { anonyme: e.target.checked })} /> Anonyme</label>
                    <button type="button" className="btn-quiet text-[12px]" onClick={() => upd(r.dossierId, { texte: resume(d) })}>Régénérer le résumé</button>
                    <button type="button" className="btn-quiet text-[12px]" onClick={() => onOpen(d.id)}>Ouvrir le dossier</button>
                    <button type="button" className="btn-quiet ml-auto text-[12px] text-terre" onClick={() => set(real.filter((x) => x.dossierId !== r.dossierId))}>Retirer</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card p-4">
        <p className="label-caps mb-2">Missions terminées à mettre en avant</p>
        {finis.filter((d) => !real.some((r) => r.dossierId === d.id)).length === 0 && <p className="text-[13px] text-charbon/55">Les dossiers finalisés ou envoyés apparaissent ici.</p>}
        <ul className="space-y-1">
          {finis.filter((d) => !real.some((r) => r.dossierId === d.id)).map((d) => (
            <li key={d.id} className="flex items-center gap-3 text-[14px]">
              <span className="flex-1">{DELIVERABLES[d.type].titre} — {d.meta.bien.commune || d.numero} <span className="text-[12px] text-charbon/50">{d.contexte.typologie}</span></span>
              <button type="button" className="btn-ghost min-h-[34px] text-[13px]" onClick={() => set([...real, { dossierId: d.id, titre: '', texte: resume(d), accordClient: false, anonyme: true }])}>Ajouter</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function LivretRealisations({ ent, items }: { ent: EntrepriseInfo; items: { r: Realisation; d: Dossier }[] }) {
  const pages: { r: Realisation; d: Dossier }[][] = [];
  for (let i = 0; i < items.length; i += 2) pages.push(items.slice(i, i + 2));
  return (
    <div className="report">
      <section className="report-page doc" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ASSET_BASE}logo.png`} alt={ent.nom} style={{ width: '60mm', marginBottom: '12mm' }} />
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '38pt', color: '#334B3D', lineHeight: 1 }}>Nos réalisations</div>
        <p style={{ fontSize: '11pt', color: '#68725E', marginTop: '4mm', maxWidth: '130mm' }}>{ent.presentation}</p>
        <p style={{ marginTop: 'auto', fontSize: '9pt', color: '#68725E' }}>{[ent.telephone, ent.email, ent.siteWeb].filter(Boolean).join(' · ')}</p>
      </section>
      {pages.map((pg, i) => (
        <section key={i} className="report-page doc">
          {pg.map(({ r, d }) => (
            <div key={d.id} className="keep" style={{ marginBottom: '10mm' }}>
              {d.meta.photoCouverture && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.meta.photoCouverture.src} alt="" style={{ width: '100%', height: '82mm', objectFit: 'cover', borderRadius: '1.5mm' }} />
              )}
              <div className="eyebrow" style={{ marginTop: '3mm', color: '#B97A5B' }}>{DELIVERABLES[d.type].titre}{d.meta.bien.commune ? ` · ${d.meta.bien.commune}` : ''}</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18pt', color: '#334B3D', fontWeight: 600 }}>{nomR(d, r)}</div>
              <p style={{ marginTop: '1.5mm' }}>{r.texte}</p>
              {!r.anonyme && d.meta.client.nom && <p style={{ fontSize: '8pt', color: '#68725E' }}>Pour {d.meta.client.nom}</p>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
