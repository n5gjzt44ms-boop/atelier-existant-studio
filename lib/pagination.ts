'use client';
/**
 * Impression paginée du rapport (numéros de page dans tous les navigateurs).
 *
 * Chrome sait écrire « page 3 / 36 » en pied de page grâce aux règles @page,
 * mais Safari et Firefox les ignorent. On découpe donc le rapport en pages A4
 * dans la page elle-même (bibliothèque libre paged.js), avec le pied de page et
 * le numéro dessinés sur chaque feuille, puis on lance l'impression.
 */

let nettoyer: (() => void) | null = null;

/** Feuille @page « native » (devis, factures, repli) : désactivée pendant l'impression paginée. */
export function stylePageNatif(actif: boolean) {
  const el = document.getElementById('page-natif') as HTMLStyleElement | null;
  if (el) el.media = actif ? 'print' : 'not all';
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

function feuille(pied: string) {
  return `
@page {
  size: A4;
  margin: 16mm 15mm 18mm;
  @bottom-left { content: "${esc(pied)}"; font: 600 6.5pt Montserrat, sans-serif; color: #68725E; vertical-align: top; padding-top: 4mm; }
  @bottom-right { content: "Page " counter(page) " / " counter(pages); font: 600 6.5pt Montserrat, sans-serif; color: #68725E; vertical-align: top; padding-top: 4mm; }
}
@page :first { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }
.report-page + .report-page { break-before: page; }
.paged-out .report-page { width: auto; min-height: 0; padding: 0; margin: 0; box-shadow: none; }
.paged-out .report-page.cover { height: 296mm; padding: 22mm 20mm; box-sizing: border-box; overflow: hidden; }
.paged-out .report-page .folio { display: none; }
.paged-out .report-zoom { zoom: 1 !important; }
`;
}

/**
 * Pagine le contenu de « source » puis ouvre l'impression. Renvoie false si la pagination échoue
 * (l'appelant imprime alors normalement).
 */
export async function imprimerPagine(source: HTMLElement, titre: string, pied: string): Promise<boolean> {
  nettoyer?.();
  const out = document.createElement('div');
  out.className = 'paged-out';
  out.style.cssText = 'position:absolute;left:-20000px;top:0;';
  document.body.appendChild(out);
  const contenu = document.createElement('div');
  contenu.innerHTML = source.innerHTML;
  // Pieds de page de l'aperçu et repères d'écran : inutiles ici (paged.js dessine les siens) ; laissés, ils créaient des pages blanches
  contenu.querySelectorAll('.folio, .reperes-pages').forEach((e) => e.remove());
  let previewer: { polisher?: { destroy: () => void } } | null = null;
  const fin = () => {
    try { previewer?.polisher?.destroy(); } catch { /* rien */ }
    out.remove();
    document.body.classList.remove('paged-mode');
    stylePageNatif(true);
    window.removeEventListener('afterprint', fin);
    nettoyer = null;
  };
  nettoyer = fin;
  try {
    await document.fonts?.ready;
    const { Previewer } = await import('pagedjs');
    const p = new Previewer();
    previewer = p as unknown as typeof previewer;
    stylePageNatif(false);
    const flow = await p.preview(contenu, [{ [`${location.origin}/rapport.css`]: feuille(pied) }], out);
    // Pages figées : plus de recalcul pendant l'impression (le changement de mise en page « print » déclencherait des reflows)
    (flow?.pages ?? []).forEach((pg: { removeListeners?: () => void }) => pg.removeListeners?.());
  } catch (e) {
    console.error('Pagination impossible', e);
    fin();
    return false;
  }
  document.body.classList.add('paged-mode');
  window.addEventListener('afterprint', fin);
  const avant = document.title;
  document.title = titre;
  try { window.print(); } catch { /* refusé */ }
  document.title = avant;
  return true;
}
