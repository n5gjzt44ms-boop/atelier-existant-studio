/** Distances et positions des contacts (géocodage par la Base adresse nationale, gratuite). */
import type { Contact } from './business';
import { geocodePoint } from './maps';

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const adresseContact = (c: Contact) => [c.adresse, c.codePostal, c.ville].filter(Boolean).join(' ');

/** Localise les contacts qui ont une adresse mais pas encore de position. */
export async function localiserContacts(contacts: Contact[], onProgress?: (n: number, total: number) => void): Promise<{ contacts: Contact[]; trouves: number; echecs: number }> {
  const todo = contacts.filter((c) => c.lat == null && adresseContact(c).trim());
  let trouves = 0, echecs = 0, n = 0;
  const pos = new Map<string, { lat: number; lon: number }>();
  for (const c of todo) {
    try {
      const p = await geocodePoint(adresseContact(c));
      if (p) { pos.set(c.id, { lat: p.lat, lon: p.lon }); trouves++; } else echecs++;
    } catch { echecs++; if (n === 0) throw new Error('Le service d’adresses de l’État ne répond pas.'); }
    onProgress?.(++n, todo.length);
    await new Promise((r) => setTimeout(r, 60)); // reste sous la limite d'appels du service
  }
  return { contacts: contacts.map((c) => (pos.has(c.id) ? { ...c, ...pos.get(c.id)! } : c)), trouves, echecs };
}

/* Tuiles du plan IGN (Géoplateforme, gratuit, sans clé) pour la carte des contacts */
export const tuilePlan = (z: number, x: number, y: number) =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=${z}&TILECOL=${x}&TILEROW=${y}&FORMAT=image/png`;

export function versPixels(lat: number, lon: number, z: number) {
  const n = 256 * 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  return { x, y };
}
