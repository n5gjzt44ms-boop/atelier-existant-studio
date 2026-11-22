/**
 * Correcteur d'orthographe et de grammaire : service gratuit LanguageTool (api.languagetool.org),
 * limité à quelques vérifications par minute. Le navigateur souligne aussi les fautes en rouge
 * (clic droit pour les suggestions).
 */
export interface Correction { offset: number; length: number; message: string; extrait: string; suggestions: string[] }

export async function verifierTexte(texte: string): Promise<Correction[]> {
  const body = new URLSearchParams({ text: texte, language: 'fr', level: 'default' });
  const r = await fetch('https://api.languagetool.org/v2/check', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body });
  if (r.status === 429) throw new Error('Trop de vérifications d’affilée : réessayez dans une minute.');
  if (!r.ok) throw new Error('Le correcteur ne répond pas (connexion internet ?).');
  const j = await r.json();
  return (j.matches ?? []).map((m: { offset: number; length: number; message: string; replacements: { value: string }[] }) => ({
    offset: m.offset, length: m.length, message: m.message, extrait: texte.slice(m.offset, m.offset + m.length),
    suggestions: (m.replacements ?? []).slice(0, 4).map((x) => x.value),
  }));
}

/** Applique une correction (les autres décalages sont recalculés par l'appelant). */
export const appliquer = (texte: string, c: Correction, s: string) => texte.slice(0, c.offset) + s + texte.slice(c.offset + c.length);
