'use client';
import type { Dossier } from './types';

/**
 * Export PDF — deux moteurs, même rendu HTML/CSS (ReportPreview) :
 *
 * 1. Serveur (recommandé en production) : POST /api/pdf → Puppeteer ouvre
 *    la page /print, y injecte le dossier, attend `data-report-ready`
 *    puis génère un PDF A4 vectoriel (textes sélectionnables, polices embarquées).
 *
 * 2. Navigateur (repli, ou déploiement statique) : impression native
 *    avec la feuille de style @page A4 → « Enregistrer au format PDF ».
 *
 * Les deux s'appuient sur les règles @page / .report-page de globals.css,
 * donc le PDF est identique à l'aperçu.
 */
export type ExportResult = 'server' | 'needs-print';

export async function exportPdf(dossier: Dossier): Promise<ExportResult> {
  if (process.env.NEXT_PUBLIC_STATIC === '1') return 'needs-print'; // site statique : pas de serveur PDF
  try {
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dossier),
    });
    if (res.ok && res.headers.get('content-type')?.includes('pdf')) {
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${dossier.numero}_${slug(dossier.meta.bien.commune || 'rapport')}_v${dossier.version}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      return 'server';
    }
  } catch { /* pas de serveur PDF : repli sur l'impression */ }
  return 'needs-print';
}

/**
 * Ouvre la boîte d'impression du navigateur. Le Studio monte au préalable
 * un exemplaire du rapport réservé à l'impression (classe print:block).
 * Renvoie false si l'impression est bloquée (ex. aperçu dans un cadre sandboxé).
 */
export function openPrintDialog(title: string): boolean {
  const prev = document.title;
  document.title = title;
  let opened = false;
  const onBefore = () => (opened = true);
  window.addEventListener('beforeprint', onBefore);
  try { window.print(); } catch { /* refusé */ }
  window.removeEventListener('beforeprint', onBefore);
  document.title = prev;
  return opened;
}

export function downloadJson(dossier: Dossier | Dossier[], name?: string) {
  const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name ?? (Array.isArray(dossier) ? 'dossiers.json' : `${dossier.numero}.json`);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
