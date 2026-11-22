// Récupère TOUT ce que l'appli a enregistré dans ce navigateur (dossiers, photos, bibliothèque)
// et le télécharge en « sauvegarde complète », importable sur la nouvelle adresse (bouton « Importer »).
// À coller dans la console (F12 → Console) de l'ANCIEN site, dans le navigateur où vous rédigez.
// Chrome demande parfois de taper d'abord : allow pasting
(async () => {
  const db = await new Promise((ok, ko) => { const q = indexedDB.open('atelier-existant', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error); });
  const lire = (k) => new Promise((ok, ko) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error); });
  const dossiers = (await lire('atelier-existant:dossiers:v1')) || JSON.parse(localStorage.getItem('atelier-existant:dossiers:v1') || '[]');
  const bibliotheque = await lire('atelier-existant:bibliotheque:v1');
  const s = { format: 'atelier-existant-sauvegarde', version: 1, exporteLe: new Date().toISOString(), dossiers, bibliotheque };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(s)], { type: 'application/json' }));
  a.download = `atelier-sauvegarde-complete-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  console.log(`Sauvegarde téléchargée : ${dossiers.length} dossier(s), bibliothèque ${bibliotheque ? 'incluse' : 'absente (bibliothèque de départ)'}.`);
})();
