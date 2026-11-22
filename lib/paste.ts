/**
 * Coller une image (Ctrl+V / Cmd+V) : la cible est le champ photo survolé ou sélectionné,
 * sinon la cible « par défaut » de l'écran (par exemple le bac des photos à classer).
 */
type Cible = (files: File[]) => void;
let survolee: Cible | null = null;
const parDefaut: Cible[] = [];
let installe = false;

function installer() {
  if (installe || typeof window === 'undefined') return;
  installe = true;
  window.addEventListener('paste', (e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.items ?? []).filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile()).filter(Boolean) as File[];
    if (!files.length) return;
    const cible = survolee ?? parDefaut[parDefaut.length - 1];
    if (!cible) return;
    e.preventDefault();
    cible(files);
  });
}

export function setCibleSurvolee(c: Cible | null) { installer(); survolee = c; }
export function ajouterCibleParDefaut(c: Cible) { installer(); parDefaut.push(c); return () => { const i = parDefaut.indexOf(c); if (i >= 0) parDefaut.splice(i, 1); }; }
