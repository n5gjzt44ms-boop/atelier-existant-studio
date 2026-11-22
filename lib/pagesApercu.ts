/**
 * Numéros de page dans l'aperçu : on refait à l'écran le découpage du PDF (paged.js), sans le lancer.
 * Chaque partie commence sur une nouvelle feuille ; une feuille offre 263 mm utiles (A4 moins les marges
 * 16 mm / 18 mm) ; un bloc « insécable » (.keep, photo, ligne de tableau, titre) qui déborde part entier
 * sur la feuille suivante ; un paragraphe peut se couper entre deux feuilles.
 */
const UTILE = 263; // mm
const HAUT = 16; // marge haute dans l'aperçu (mm)

const INSECABLES = new Set(['TR', 'IMG', 'FIGURE', 'H1', 'H2', 'H3', 'H4', 'HEADER', 'LI', 'svg']);

/** Blocs de la page dans l'ordre de lecture, avec leur position (mm depuis le haut de la page). */
function blocs(page: HTMLElement, mm: number) {
  const haut = page.getBoundingClientRect().top;
  const out: { t: number; b: number; secable: boolean }[] = [];
  const visiter = (el: Element) => {
    if (el.classList.contains('folio') || el.classList.contains('reperes-pages')) return;
    const r = el.getBoundingClientRect();
    if (!r.height) return;
    const enfantsBlocs = [...el.children].filter((c) => { const d = getComputedStyle(c).display; return d !== 'inline' && d !== 'none' && (c as HTMLElement).getBoundingClientRect().height > 0; });
    const insecable = el.classList.contains('keep') || INSECABLES.has(el.tagName) || getComputedStyle(el).breakInside === 'avoid';
    if (insecable || !enfantsBlocs.length || el.tagName === 'P') {
      out.push({ t: (r.top - haut) / mm, b: (r.bottom - haut) / mm, secable: !insecable });
      return;
    }
    enfantsBlocs.forEach(visiter);
  };
  [...page.children].forEach(visiter);
  return out.sort((a, b) => a.t - b.t);
}

/** Nombre de feuilles d'une partie et positions (mm, dans l'aperçu) où commence chaque feuille suivante. */
export function feuillesDe(page: HTMLElement): { n: number; coupures: number[] } {
  const mm = page.getBoundingClientRect().width / 210;
  if (!mm || page.classList.contains('cover')) return { n: 1, coupures: [] };
  let decalage = 0; // espace ajouté par les blocs repoussés sur la feuille suivante
  let fin = HAUT + UTILE; // bas de la feuille courante (coordonnées décalées)
  const coupures: number[] = [];
  for (const x of blocs(page, mm)) {
    const t = x.t + decalage, b = x.b + decalage;
    if (b <= fin + 0.5) continue;
    if (!x.secable && x.b - x.t <= UTILE && t > fin - UTILE + 1) {
      // Bloc entier sur la feuille suivante
      coupures.push(x.t);
      decalage += fin - t;
      fin += UTILE;
      continue;
    }
    // Bloc qui se coupe (paragraphe) ou plus haut qu'une feuille
    while (b > fin + 0.5) { coupures.push(fin - decalage); fin += UTILE; }
  }
  return { n: coupures.length + 1, coupures };
}
