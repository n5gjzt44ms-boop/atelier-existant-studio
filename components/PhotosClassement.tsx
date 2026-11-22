'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PRIORITY, ZONE_CATEGORIES } from '@/lib/constants';
import { captureTime } from '@/lib/exif';
import { applyTemplate, newDesordre, uid, withPrix } from '@/lib/factory';
import { fileToPhoto } from '@/lib/image';
import { ajouterCibleParDefaut } from '@/lib/paste';
import type { Desordre, Dossier, Photo, Visite, ZoneCategory } from '@/lib/types';
import { useLibrary } from './LibraryProvider';
import { Combo } from './ui';
import { CATEGORIES_DESORDRE, categorieDesordre, motsDesordre } from '@/lib/catalogue';
import { collerFiche, copierDansPressePapier, ficheModele, fichesJumelles, synchroniserJumelles, useFicheCopiee, viderPressePapier } from '@/lib/pressePapier';
import FicheDesordreEditor from './FicheDesordreEditor';

const MIME = 'application/x-photos';
const lire = (raw: string): { ids: string[]; source?: string } => { const v = JSON.parse(raw); return Array.isArray(v) ? { ids: v } : v; };
const jour = (t: number) => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmtJour = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Toutes les photos du dossier (bac, zones, fiches) avec leur emplacement. */
export function toutesLesPhotos(d: Dossier): { photo: Photo; label: string }[] {
  const vus = new Map<string, { photo: Photo; label: string }>();
  const out: { photo: Photo; label: string }[] = [];
  for (const x of toutes(d)) {
    const k = x.photo.id ?? x.photo.src;
    const deja = vus.get(k);
    if (deja) deja.label += ` · ${x.label}`; else { const c = { ...x }; vus.set(k, c); out.push(c); }
  }
  return out;
}
function toutes(d: Dossier): { photo: Photo; label: string }[] {
  return [
    ...(d.photosAClasser ?? []).map((p) => ({ photo: p, label: 'À classer' })),
    ...d.zones.flatMap((z) => (z.photos ?? []).map((p) => ({ photo: p, label: `${z.code} ${z.nom}` }))),
    ...d.desordres.flatMap((x) => [x.photoEnsemble, x.photoDetail, ...(x.autresPhotos ?? [])].filter(Boolean).map((p) => ({ photo: p as Photo, label: `${x.numero} ${x.type}` }))),
  ];
}

const photosFiche = (x: Desordre) => [x.photoEnsemble, x.photoDetail, ...(x.autresPhotos ?? [])].filter(Boolean) as Photo[];
/** Range une liste ordonnée de photos dans une fiche : 1re = vue d’ensemble, 2e = détail, suivantes = complémentaires. */
const avecPhotos = (x: Desordre, l: Photo[]): Desordre => ({ ...x, photoEnsemble: l[0] ?? null, photoDetail: l[1] ?? null, autresPhotos: l.slice(2) });

/** Retire des photos (par identifiant) du bac, des zones et des fiches ; renvoie le dossier et les photos retirées, dans l'ordre demandé. */
function extraire(d: Dossier, ids: string[], garderFiches = false): { d: Dossier; photos: Photo[] } {
  const all = [...(d.photosAClasser ?? []), ...d.zones.flatMap((z) => z.photos ?? []), ...d.desordres.flatMap(photosFiche)];
  const photos = ids.map((id) => all.find((p) => p.id === id)).filter(Boolean) as Photo[];
  const set = new Set(ids);
  return {
    d: {
      ...d,
      photosAClasser: (d.photosAClasser ?? []).filter((p) => !set.has(p.id!)),
      zones: d.zones.map((z) => ({ ...z, photos: (z.photos ?? []).filter((p) => !set.has(p.id!)) })),
      desordres: garderFiches ? d.desordres : d.desordres.map((x) => (photosFiche(x).some((p) => set.has(p.id!)) ? avecPhotos(x, photosFiche(x).filter((p) => !set.has(p.id!))) : x)),
    },
    photos,
  };
}

/** Applique une transformation à chaque photo du dossier (bac, zones, fiches, couverture). */
export function mapToutesPhotos(d: Dossier, f: (p: Photo) => Photo): Dossier {
  const m = (p: Photo | null | undefined) => (p ? f(p) : p ?? null);
  return {
    ...d,
    photosAClasser: (d.photosAClasser ?? []).map(f),
    zones: d.zones.map((z) => ({ ...z, photos: (z.photos ?? []).map(f) })),
    desordres: d.desordres.map((x) => ({ ...x, photoEnsemble: m(x.photoEnsemble), photoDetail: m(x.photoDetail), autresPhotos: (x.autresPhotos ?? []).map(f) })),
    meta: { ...d.meta, photoCouverture: d.meta.photoCouverture ? f(d.meta.photoCouverture) : d.meta.photoCouverture },
  };
}

/** Enregistre une fiche modifiée : une photo choisie pour la fiche quitte le bac et les vues générales de la zone (pas de doublon). */
export function appliquerFiche(dossier: Dossier, f: Desordre): Dossier {
  const used = new Set(photosFiche(f).map((p) => p.id).filter(Boolean));
  const avant = dossier.desordres.find((x) => x.id === f.id);
  const autres = dossier.desordres.filter((x) => x.id !== f.id);
  // Photo retirée de la fiche et présente nulle part ailleurs : elle revient dans les vues générales de la zone (jamais perdue)
  const orphelines = (avant ? photosFiche(avant) : []).filter((p) => p.id && !used.has(p.id) && !autres.some((x) => photosFiche(x).some((y) => y.id === p.id)));
  const zoneOk = dossier.zones.some((z) => z.code === f.zoneCode);
  return {
    ...dossier,
    // Les autres fiches du même désordre suivent les modifications, tant qu'elles n'ont pas été personnalisées
    desordres: synchroniserJumelles(dossier, avant, f),
    photosAClasser: [...(dossier.photosAClasser ?? []).filter((p) => !used.has(p.id)), ...(zoneOk ? [] : orphelines)],
    zones: dossier.zones.map((z) => {
      const ph = (z.photos ?? []).filter((p) => !used.has(p.id));
      return z.code === f.zoneCode && orphelines.length ? { ...z, photos: [...ph, ...orphelines] } : ph.length !== (z.photos ?? []).length ? { ...z, photos: ph } : z;
    }),
  };
}

/** Supprime une fiche ; ses photos retournent dans les vues générales de sa zone (ou dans le bac). */
export function supprimerFiche(dossier: Dossier, id: string): Dossier {
  const f = dossier.desordres.find((x) => x.id === id);
  if (!f) return dossier;
  const ph = photosFiche(f).filter((p) => !dossier.desordres.some((x) => x.id !== id && photosFiche(x).some((y) => y.id === p.id)));
  const zone = dossier.zones.some((z) => z.code === f.zoneCode);
  return {
    ...dossier,
    desordres: dossier.desordres.filter((x) => x.id !== id),
    zones: zone ? dossier.zones.map((z) => (z.code === f.zoneCode ? { ...z, photos: [...(z.photos ?? []), ...ph] } : z)) : dossier.zones,
    photosAClasser: zone ? dossier.photosAClasser : [...(dossier.photosAClasser ?? []), ...ph],
  };
}

/** Copie d’une fiche (textes, sans les photos). */
export function dupliquerFiche(dossier: Dossier, id: string): { d: Dossier; copie: Desordre } | null {
  const f = dossier.desordres.find((x) => x.id === id);
  if (!f) return null;
  const copie = { ...f, id: uid(), numero: newDesordre(dossier.desordres).numero, photoEnsemble: null, photoDetail: null, autresPhotos: [], perso: [] };
  return { d: { ...dossier, desordres: [...dossier.desordres, copie] }, copie };
}

/**
 * Classement des photos : un bac « à classer » et toutes les zones visibles en même temps.
 * Glisser-déposer (ou sélection + menu) vers une zone ; regrouper plusieurs photos en une fiche désordre.
 */
export default function PhotosClassement({ dossier, update, onAssistant }: { dossier: Dossier; update: (d: Dossier) => void; onAssistant: () => void }) {
  const { lib, noteUse, addDesordreType } = useLibrary();
  const [vue, setVue] = useState<string | null>(null);
  const [bacReplie, setBacReplie] = useState(false);
  const [confirmSansPhoto, setConfirmSansPhoto] = useState(false);
  useEffect(() => { try { setBacReplie(localStorage.getItem('atelier-bac-replie') === '1'); } catch { /* rien */ } }, []);
  const replierBac = (v: boolean) => { setBacReplie(v); try { localStorage.setItem('atelier-bac-replie', v ? '1' : '0'); } catch { /* rien */ } };
  const [vueMsg, setVueMsg] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState<{ n: number; t: number } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [cibleSurvol, setCibleSurvol] = useState<string | null>(null);
  const [grouper, setGrouper] = useState<{ ids: string[]; zone: string; type: string; fiche: string; modele?: string } | null>(null);
  const copiee = useFicheCopiee();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [dateSansExif, setDateSansExif] = useState(dossier.meta.dateVisite || '');
  const input = useRef<HTMLInputElement>(null);
  const dRef = useRef(dossier);
  dRef.current = dossier;
  const order = Object.keys(ZONE_CATEGORIES) as ZoneCategory[];
  const zones = [...dossier.zones].sort((a, b) => order.indexOf(a.categorie) - order.indexOf(b.categorie));
  const bac = dossier.photosAClasser ?? [];
  const visites = dossier.visites ?? [];
  const visiteDe = (p: Photo) => visites.find((v) => v.id === p.visiteId);

  /** Import : chaque photo est rattachée à la visite du jour où elle a été prise (créée si besoin). */
  async function importer(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|heic|webp)$/i.test(f.name));
    if (!imgs.length) return;
    setBusy({ n: 0, t: imgs.length });
    const out: Photo[] = [];
    let echecs = 0;
    for (const f of imgs) {
      try {
        const [t, p] = await Promise.all([captureTime(f), fileToPhoto(f)]);
        out.push({ ...p, nom: f.name, prise: t || undefined });
      } catch { echecs++; }
      setBusy((b) => (b ? { ...b, n: b.n + 1 } : b));
    }
    out.sort((a, b) => (a.prise ?? 0) - (b.prise ?? 0) || (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', { numeric: true }));
    const cur = dRef.current;
    const vs: Visite[] = [...(cur.visites ?? [])];
    const visitePour = (date: string) => {
      let v = vs.find((x) => x.date === date);
      if (!v) { v = { id: uid(), date, libelle: `Visite du ${fmtJour(date)}` }; vs.push(v); }
      return v.id;
    };
    const ranges = out.map((p) => {
      const date = p.prise ? jour(p.prise) : dateSansExif;
      return date ? { ...p, visiteId: visitePour(date) } : p;
    });
    vs.sort((a, b) => a.date.localeCompare(b.date));
    const premiere = vs[0]?.date;
    update({ ...cur, visites: vs, photosAClasser: [...(cur.photosAClasser ?? []), ...ranges], meta: { ...cur.meta, dateVisite: cur.meta.dateVisite || premiere || '' } });
    setBusy(null);
    const sansDate = ranges.filter((p) => !p.visiteId).length;
    setFlash(`${ranges.length} photo${ranges.length > 1 ? 's' : ''} ajoutée${ranges.length > 1 ? 's' : ''} au bac.${sansDate ? ` ${sansDate} sans date de prise de vue : indiquez la date de visite pour les rattacher.` : ''}${echecs ? ` ${echecs} illisible${echecs > 1 ? 's' : ''} (format HEIC ? réglez l’appareil sur JPEG).` : ''}`);
  }
  useEffect(() => {
    if (!vue || grouper) return;
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') setVue(null);
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const l = document.querySelectorAll('[data-vue-nav]');
        (l[e.key === 'ArrowRight' ? 1 : 0] as HTMLButtonElement | undefined)?.click();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [vue, grouper]);
  useEffect(() => {
    if (!ouverte) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuverte(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [ouverte]);
  useEffect(() => ajouterCibleParDefaut((files) => importer(files)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const versZone = (ids: string[], code: string) => {
    const { d, photos } = extraire(dossier, ids);
    update({ ...d, zones: d.zones.map((z) => (z.code === code ? { ...z, photos: [...(z.photos ?? []), ...photos] } : z)) });
    setSel([]);
  };
  const versBac = (ids: string[]) => {
    const { d, photos } = extraire(dossier, ids);
    update({ ...d, photosAClasser: [...(d.photosAClasser ?? []), ...photos] });
    setSel([]);
  };
  /**
   * Lie des photos à une fiche. Une photo peut illustrer plusieurs désordres : elle quitte le bac et
   * les vues générales, mais reste dans ses autres fiches, sauf « deplacerDe » (glisser d’une fiche à une autre).
   * « avant » : insérer avant cette photo (réordonner dans la fiche).
   */
  const versFiche = (ids: string[], ficheId: string, avant?: string, deplacerDe?: string) => {
    const set = new Set(ids);
    const surSoiMeme = !!avant && set.has(avant); // déposée sur elle-même : position inchangée
    const all = toutes(dossier).map((x) => x.photo);
    const photos = ids.map((id) => all.find((p) => p.id === id)).filter(Boolean) as Photo[];
    update({
      ...dossier,
      photosAClasser: (dossier.photosAClasser ?? []).filter((p) => !set.has(p.id!)),
      zones: dossier.zones.map((z) => ({ ...z, photos: (z.photos ?? []).filter((p) => !set.has(p.id!)) })),
      desordres: dossier.desordres.map((x) => {
        if (x.id === ficheId) {
          if (surSoiMeme) return x;
          const l = photosFiche(x).filter((p) => !set.has(p.id!));
          const i = avant ? l.findIndex((p) => p.id === avant) : -1;
          return avecPhotos(x, i >= 0 ? [...l.slice(0, i), ...photos, ...l.slice(i)] : [...l, ...photos]);
        }
        if (deplacerDe && x.id === deplacerDe && deplacerDe !== ficheId) return avecPhotos(x, photosFiche(x).filter((p) => !set.has(p.id!)));
        return x;
      }),
    });
    setSel([]);
  };
  /** Retire une photo d’une seule fiche ; si elle n’illustre plus rien, elle revient dans les vues générales de la zone. */
  const retirerDeFiche = (id: string, ficheId: string) => {
    const f = dossier.desordres.find((x) => x.id === ficheId);
    if (!f) return;
    const p = photosFiche(f).find((x) => x.id === id);
    const ailleurs = dossier.desordres.some((x) => x.id !== ficheId && photosFiche(x).some((y) => y.id === id));
    const zoneOk = dossier.zones.some((z) => z.code === f.zoneCode);
    update({
      ...dossier,
      desordres: dossier.desordres.map((x) => (x.id === ficheId ? avecPhotos(x, photosFiche(x).filter((y) => y.id !== id)) : x)),
      zones: !ailleurs && p && zoneOk ? dossier.zones.map((z) => (z.code === f.zoneCode ? { ...z, photos: [...(z.photos ?? []), p] } : z)) : dossier.zones,
      photosAClasser: !ailleurs && p && !zoneOk ? [...(dossier.photosAClasser ?? []), p] : dossier.photosAClasser,
    });
  };
  const fichesDePhoto = (id: string) => dossier.desordres.filter((x) => photosFiche(x).some((p) => p.id === id));

  function creerFiche(ids: string[], zone: string, type: string, ouvrir = false) {
    // Désordre déjà rédigé ailleurs dans ce dossier : on part de cette fiche (zone et numéro adaptés)
    const modele = type.trim() ? ficheModele(dossier, type.trim()) : undefined;
    if (modele) { coller(modele, zoneInfo(modele.zoneCode), zone, ids, ouvrir); return; }
    const iBac = vue && ids.includes(vue) ? bac.findIndex((p) => p.id === vue) : -1;
    const suivanteBac = iBac >= 0 ? (bac[iBac + 1] ?? bac[iBac - 1])?.id : undefined;
    const { d, photos } = extraire(dossier, ids, true);
    const t = lib.desordres.find((x) => x.type === type);
    let f: Desordre = newDesordre(d.desordres, zone, t?.priorite ?? 'P2');
    f = { ...f, photoEnsemble: photos[0] ?? null, photoDetail: photos[1] ?? null, autresPhotos: photos.slice(2) };
    if (t) f = withPrix(applyTemplate(f, t), lib.prix.find((x) => x.id === t.prixId));
    else if (type.trim()) { const n = addDesordreType(type, { priorite: 'P2' }); f = { ...f, type: n.type, famille: n.famille }; }
    else f = { ...f, type: 'À qualifier', aRelire: true };
    if (t) noteUse('desordre', t.type);
    update({ ...d, desordres: [...d.desordres, f] });
    setSel([]); setGrouper(null);
    if (ouvrir) { setVue(null); setOuverte(f.id); }
    else if (vue) { setVueMsg(`Rangée dans la nouvelle fiche ${f.numero} ✓`); if (suivanteBac) setVue(suivanteBac); }
    else setFlash(`Fiche ${f.numero} créée avec ${photos.length} photo${photos.length > 1 ? 's' : ''}${t ? ', pré-rédigée' : ''}.`);
  }
  /** Colle une fiche déjà rédigée dans une zone, avec les photos choisies (elles restent dans leurs autres désordres). */
  function coller(source: Desordre, ancienne: { code: string; nom: string } | undefined, zone: string, ids: string[], ouvrir = false) {
    const iBac = vue && ids.includes(vue) ? bac.findIndex((p) => p.id === vue) : -1;
    const suivanteBac = iBac >= 0 ? (bac[iBac + 1] ?? bac[iBac - 1])?.id : undefined;
    const { d, photos } = extraire(dossier, ids, true);
    const r = collerFiche(d, source, ancienne, zone, photos);
    update(r.d);
    setSel([]); setGrouper(null);
    const msg = `Fiche ${r.copie.numero} créée dans ${zone} à partir de ${source.numero} (textes, préconisation et chiffrage repris${photos.length ? `, ${photos.length} photo${photos.length > 1 ? 's' : ''}` : ''}).`;
    if (ouvrir) { setVue(null); setOuverte(r.copie.id); }
    else if (vue) { setVueMsg(`Collée : nouvelle fiche ${r.copie.numero} ✓`); if (suivanteBac) setVue(suivanteBac); }
    else setFlash(msg);
  }
  const zoneInfo = (code: string) => { const z = dossier.zones.find((x) => x.code === code); return z ? { code: z.code, nom: z.nom } : undefined; };
  const collerCopiee = (zone: string, ids: string[]) => copiee && coller(copiee.fiche, copiee.zone, zone, ids);
  const modeles = [
    ...(copiee && copiee.dossier !== dossier.numero ? [{ id: 'presse', label: `Fiche copiée · ${copiee.fiche.numero} ${copiee.fiche.type} (dossier ${copiee.dossier})` }] : []),
    ...dossier.desordres.map((x) => ({ id: x.id, label: `${x.numero} · ${x.type} (${x.zoneCode})` })),
  ];
  const creerDepuisModele = (g: NonNullable<typeof grouper>, ouvrir: boolean) => {
    if (g.modele === 'presse' && copiee) coller(copiee.fiche, copiee.zone, g.zone, g.ids, ouvrir);
    else { const src = dossier.desordres.find((x) => x.id === g.modele); if (src) coller(src, zoneInfo(src.zoneCode), g.zone, g.ids, ouvrir); }
  };

  const supprimer = (ids: string[]) => {
    update(extraire(dossier, ids).d); setSel([]);
    setFlash(`${ids.length} photo${ids.length > 1 ? 's' : ''} supprimée${ids.length > 1 ? 's' : ''} du dossier. « ↶ Retour » en haut de l’écran pour annuler.`);
  };

  const dragStart = (e: React.DragEvent, id: string, source?: string) => {
    const ids = sel.includes(id) ? sel : [id];
    e.dataTransfer.setData(MIME, JSON.stringify({ ids, source }));
    e.dataTransfer.setData('application/x-photo', id);
    e.dataTransfer.effectAllowed = 'copyMove';
  };
  const dropSur = (cible: string) => ({
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes(MIME) || e.dataTransfer.types.includes('Files')) { e.preventDefault(); setCibleSurvol(cible); } },
    onDragLeave: () => setCibleSurvol((c) => (c === cible ? null : c)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); setCibleSurvol(null);
      const raw = e.dataTransfer.getData(MIME);
      if (raw) {
        const { ids, source } = lire(raw);
        const copie = e.ctrlKey || e.altKey || e.metaKey;
        if (cible === 'bac') versBac(ids);
        else if (cible.startsWith('fiche:')) versFiche(ids, cible.slice(6), undefined, copie ? undefined : source);
        else if (cible.startsWith('nouveau:')) setGrouper({ ids, zone: cible.slice(8), type: '', fiche: '' });
        else versZone(ids, cible);
      } else if (e.dataTransfer.files.length) importer(Array.from(e.dataTransfer.files));
    },
  });
  const toggle = (id: string, e: React.MouseEvent, liste: Photo[]) => {
    if (e.shiftKey && sel.length) {
      const ids = liste.map((p) => p.id!);
      const a = ids.indexOf(sel[sel.length - 1]), b = ids.indexOf(id);
      if (a >= 0 && b >= 0) { const r = ids.slice(Math.min(a, b), Math.max(a, b) + 1); setSel(Array.from(new Set([...sel, ...r]))); return; }
    }
    setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  };

  const vignette = (p: Photo, liste: Photo[], ficheId?: string) => {
    const on = sel.includes(p.id!);
    const couv = dossier.meta.photoCouverture?.id === p.id;
    const rang = ficheId ? liste.indexOf(p) : -1;
    const cible = ficheId ? `avant:${p.id}` : '';
    const dropAvant = ficheId ? {
      onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes(MIME)) { e.preventDefault(); e.stopPropagation(); setCibleSurvol(cible); } },
      onDragLeave: () => setCibleSurvol((c) => (c === cible ? null : c)),
      onDrop: (e: React.DragEvent) => { const raw = e.dataTransfer.getData(MIME); if (!raw) return; e.preventDefault(); e.stopPropagation(); setCibleSurvol(null); const { ids, source } = lire(raw); versFiche(ids, ficheId, p.id, e.ctrlKey || e.altKey || e.metaKey ? undefined : source); },
    } : {};
    return (
      <figure key={p.id} draggable onDragStart={(e) => dragStart(e, p.id!, ficheId)} onClick={(e) => (e.shiftKey || e.ctrlKey || e.metaKey || sel.length ? toggle(p.id!, e, liste) : (setVue(p.id!), setVueMsg(null)))} {...dropAvant}
        className={`group relative w-24 cursor-zoom-in sm:w-32 select-none rounded ${on ? 'ring-2 ring-terre ring-offset-1' : ''} ${cibleSurvol === cible && cible ? 'border-l-4 border-terre pl-1' : ''}`} title={`${p.nom ?? ''}${visiteDe(p) ? ` · ${visiteDe(p)!.libelle}` : ''} — clic pour sélectionner, glisser pour classer${ficheId ? ' (déposer une photo ici pour l’insérer avant)' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.src} alt="" draggable={false} className="aspect-[4/3] w-full rounded object-cover" />
        <button type="button" aria-label={on ? 'Désélectionner' : 'Sélectionner'} title={on ? 'Désélectionner' : 'Sélectionner (pour ranger plusieurs photos ensemble)'} onClick={(e) => { e.stopPropagation(); toggle(p.id!, e, liste); }}
          className={`absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full border text-[11px] ${on ? 'border-terre bg-terre text-white' : 'border-white bg-black/25 text-transparent [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'}`}>{on ? sel.indexOf(p.id!) + 1 : '✓'}</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); update({ ...dossier, meta: { ...dossier.meta, photoCouverture: p } }); }} title="Photo de couverture (vue d’ensemble de l’édifice)"
          className={`absolute right-1 top-1 rounded bg-white/85 px-1 text-[12px] ${couv ? 'text-terre' : 'text-charbon/40 hover:text-terre'}`}>{couv ? '★' : '☆'}</button>
        <button type="button" aria-label="Supprimer la photo" title="Supprimer cette photo du dossier (doublon, floue, sans intérêt)" onClick={(e) => { e.stopPropagation(); supprimer([p.id!]); }}
          className="absolute bottom-5 left-1 rounded bg-white/85 px-1 text-[11px] text-charbon/50 hover:text-terre [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">🗑</button>
        {fichesDePhoto(p.id!).length > 1 && (
          <span className="absolute bottom-5 right-1 rounded bg-foret/85 px-1 text-[10px] text-ivoire" title={`Illustre aussi : ${fichesDePhoto(p.id!).filter((x) => x.id !== ficheId).map((x) => x.numero).join(', ')}`}>
            {fichesDePhoto(p.id!).length} désordres
          </span>
        )}
        <figcaption className="truncate text-[10px] text-charbon/50">
          {rang === 0 ? <b className="text-foret">1 · Vue d’ensemble</b> : rang === 1 ? <b className="text-foret">2 · Détail</b> : p.prise ? new Date(p.prise).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : visiteDe(p)?.libelle ?? 'sans date'}
        </figcaption>
      </figure>
    );
  };

  const fichesDe = (code: string) => dossier.desordres.filter((x) => x.zoneCode === code);
  const nbPhotosFiche = (x: Desordre) => photosFiche(x).length;
  const orphelines = dossier.desordres.filter((x) => !dossier.zones.some((z) => z.code === x.zoneCode));
  const sansPhoto = dossier.desordres.filter((x) => !x.general && !photosFiche(x).length);
  const ordreFiches = [...zones.flatMap((z) => fichesDe(z.code)), ...orphelines];
  const fiche = ordreFiches.find((x) => x.id === ouverte);
  const iFiche = fiche ? ordreFiches.indexOf(fiche) : -1;

  /* ─── Visionneuse : photo en grand, puis choix du désordre qu’elle illustre ─── */
  const ordreVue: Photo[] = [...bac, ...zones.flatMap((z) => [...fichesDe(z.code).flatMap(photosFiche), ...(z.photos ?? [])]), ...orphelines.flatMap(photosFiche)]
    .filter((p, i, l) => l.findIndex((q) => q.id === p.id) === i);
  const iVue = vue ? ordreVue.findIndex((p) => p.id === vue) : -1;
  const photoVue = iVue >= 0 ? ordreVue[iVue] : null;
  const ficheDe = (id: string) => dossier.desordres.find((x) => photosFiche(x).some((p) => p.id === id));
  const zoneDe = (id: string) => dossier.zones.find((z) => (z.photos ?? []).some((p) => p.id === id));
  const ouEst = (id: string) => { const fs = fichesDePhoto(id); if (fs.length) return fs.map((f) => `${f.numero} · ${f.type} (${f.zoneCode})`).join(' + '); const z = zoneDe(id); if (z) return `Vue générale · ${z.code} ${z.nom}`; return 'À classer'; };
  /** Range la photo affichée ; si elle venait du bac, passe à la suivante du bac. */
  const rangerVue = (action: () => void, msg: string) => {
    if (!vue) return;
    const i = bac.findIndex((p) => p.id === vue);
    const suivante = i >= 0 ? (bac[i + 1] ?? bac[i - 1])?.id : undefined;
    action();
    setVueMsg(msg);
    if (suivante) setVue(suivante);
  };
  const majPhoto = (id: string, patch: Partial<Photo>) => {
    const m = (p: Photo | null) => (p && p.id === id ? { ...p, ...patch } : p);
    update({
      ...dossier,
      photosAClasser: (dossier.photosAClasser ?? []).map((p) => m(p)!),
      zones: dossier.zones.map((z) => ({ ...z, photos: (z.photos ?? []).map((p) => m(p)!) })),
      desordres: dossier.desordres.map((x) => ({ ...x, photoEnsemble: m(x.photoEnsemble), photoDetail: m(x.photoDetail), autresPhotos: (x.autresPhotos ?? []).map((p) => m(p)!) })),
    });
  };
  const visitesUtilisees = useMemo(() => visites.map((v) => ({ v, n: toutesLesPhotos(dossier).filter((x) => x.photo.visiteId === v.id).length })), [visites, dossier]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" onClick={() => input.current?.click()}>Importer des photos</button>
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { importer(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <button type="button" className="btn-ghost" disabled={!dossier.zones.length} onClick={onAssistant}>Assistant par séries</button>
        <label className="ml-auto flex items-center gap-2 text-[12px] text-charbon/60">Photos non datées : visite du
          <input type="date" value={dateSansExif} onChange={(e) => setDateSansExif(e.target.value)} className="field w-auto py-1 text-[12px]" />
        </label>
      </div>
      <p className="text-[12px] text-charbon/55">Glissez les photos depuis votre ordinateur, collez-les (Ctrl+V) ou importez-les. Chaque photo est rattachée à la visite du jour où elle a été prise. Depuis Google Drive : sur tablette et téléphone, le bouton « Importer » propose directement Drive ; sur ordinateur, installez Google Drive pour ordinateur et choisissez le dossier Drive.</p>
      {busy && <p className="text-[13px] text-sauge">Préparation des photos… {busy.n} / {busy.t}</p>}
      {flash && <p className="rounded-md bg-sauge-50 p-2.5 text-[13px]">{flash} <button type="button" className="ml-2 text-charbon/50" onClick={() => setFlash(null)}>×</button></p>}
      {visitesUtilisees.length > 0 && (
        <p className="text-[12px] text-charbon/60">Visites : {visitesUtilisees.map(({ v, n }) => `${v.libelle} (${n} photo${n > 1 ? 's' : ''})`).join(' · ')}</p>
      )}

      {sel.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-md border border-terre/40 bg-white p-2.5 shadow">
          <span className="text-[13px] font-semibold text-terre">{sel.length} photo{sel.length > 1 ? 's' : ''} sélectionnée{sel.length > 1 ? 's' : ''}</span>
          <select value="" onChange={(e) => e.target.value && versZone(sel, e.target.value)} className="field w-auto py-1.5 text-[13px]">
            <option value="">Ranger dans la zone…</option>
            {zones.map((z) => <option key={z.code} value={z.code}>{z.code} · {z.nom}</option>)}
          </select>
          <button type="button" className="btn-primary min-h-[36px] text-[13px]" onClick={() => setGrouper({ ids: sel, zone: zones[0]?.code ?? '', type: '', fiche: '' })}>Regrouper en désordre…</button>
          <button type="button" className="btn-quiet text-[13px]" onClick={() => versBac(sel)}>Remettre à classer</button>
          <button type="button" className="btn-quiet text-[13px] text-terre" onClick={() => supprimer(sel)}>Supprimer</button>
          <button type="button" className="btn-quiet ml-auto text-[13px]" onClick={() => setSel([])}>Désélectionner</button>
        </div>
      )}

      <div className={`grid gap-4 ${bacReplie ? 'lg:grid-cols-[52px_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]'}`}>
        {bacReplie ? (
          <div {...dropSur('bac')} className={`card flex h-fit items-center gap-3 p-2 lg:sticky lg:top-14 lg:flex-col lg:py-3 ${cibleSurvol === 'bac' ? 'border-sauge bg-sauge-50' : ''}`}>
            <button type="button" onClick={() => replierBac(false)} title="Déplier les photos à classer" className="grid h-9 w-9 place-items-center rounded-md text-foret hover:bg-ivoire">▸</button>
            <span className="text-center font-label text-[11px] font-bold text-foret" title="Photos à classer">{bac.length}</span>
            <span className="text-[11px] text-charbon/55 lg:[writing-mode:vertical-rl]">Photos à classer</span>
            <button type="button" onClick={() => input.current?.click()} title="Ajouter des photos" className="grid h-9 w-9 place-items-center rounded-md border border-dashed border-pierre text-[18px] text-sauge hover:border-sauge">+</button>
          </div>
        ) : (
        <div {...dropSur('bac')} className={`card h-fit p-3 lg:sticky lg:top-14 ${cibleSurvol === 'bac' ? 'border-sauge bg-sauge-50' : ''}`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2">
            <p className="whitespace-nowrap font-serif text-lg font-semibold text-foret">Photos à classer <span className="text-[13px] font-normal text-charbon/50">{bac.length}</span></p>
            <span className="flex items-center gap-1 whitespace-nowrap">
              {bac.length > 0 && <button type="button" className="btn-quiet text-[12px]" onClick={() => setSel(sel.length === bac.length ? [] : bac.map((p) => p.id!))}>{sel.length === bac.length ? 'Aucune' : 'Tout sélectionner'}</button>}
              <button type="button" className="btn-quiet text-[12px]" onClick={() => replierBac(true)} title="Réduire l’encart pour agrandir les zones (on peut toujours ajouter des photos)">◂ Réduire</button>
            </span>
          </div>
          {bac.length === 0
            ? <p className="rounded border border-dashed border-pierre p-6 text-center text-[13px] text-charbon/55">Déposez ici les photos de la visite.</p>
            : <div className="flex max-h-[70vh] flex-wrap gap-2 overflow-y-auto">{bac.map((p) => vignette(p, bac))}</div>}
          <p className="mt-2 text-[11px] text-charbon/50">Clic : afficher en grand et choisir le ou les désordres. Rond en haut à gauche (ou Ctrl+clic) : sélectionner plusieurs photos. Glisser vers un désordre, « + Nouveau désordre » ou les vues générales d’une zone. Glisser d’un désordre à un autre déplace la photo ; en maintenant Ctrl (Alt sur Mac), elle est ajoutée sans être retirée : une photo peut illustrer plusieurs désordres.</p>
        </div>
        )}

        <div className="space-y-3">
          {copiee && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-sauge bg-sauge-50 px-3 py-2 text-[12px]">
              <span className="text-foret">📋 Fiche copiée : <b>{copiee.fiche.numero} {copiee.fiche.type}</b>{copiee.zone ? ` (${copiee.zone.code} ${copiee.zone.nom}` : ' ('}{copiee.dossier !== dossier.numero ? `, dossier ${copiee.dossier})` : ')'}</span>
              <span className="text-charbon/55">Sélectionnez des photos puis « Coller ici » dans une zone : la zone, le numéro et la mention de la zone dans les textes s’adaptent.</span>
              <button type="button" className="btn-quiet ml-auto text-[12px]" onClick={viderPressePapier}>Vider</button>
            </div>
          )}
          {sansPhoto.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-terre/40 bg-terre-50 px-3 py-2 text-[12px]">
              <span className="text-terre">{sansPhoto.length} fiche{sansPhoto.length > 1 ? 's' : ''} sans photo : {sansPhoto.map((x) => x.numero).join(', ')}.</span>
              <span className="text-charbon/60">Cochez « Désordre général » dans celles à garder sans photo.</span>
              {confirmSansPhoto
                ? <span className="ml-auto flex gap-2"><button type="button" className="btn-primary min-h-[32px] px-3 text-[12px]" onClick={() => { let d = dossier; sansPhoto.forEach((x) => { d = supprimerFiche(d, x.id); }); update(d); setConfirmSansPhoto(false); setFlash(`${sansPhoto.length} fiche${sansPhoto.length > 1 ? 's' : ''} sans photo supprimée${sansPhoto.length > 1 ? 's' : ''} (« ↶ Retour » pour annuler).`); }}>Confirmer la suppression</button><button type="button" className="btn-quiet text-[12px]" onClick={() => setConfirmSansPhoto(false)}>Annuler</button></span>
                : <button type="button" className="btn-quiet ml-auto text-[12px] text-terre" onClick={() => setConfirmSansPhoto(true)}>Supprimer ces fiches</button>}
            </div>
          )}
          {!zones.length && <p className="card p-6 text-[14px] text-charbon/60">Créez d’abord les zones du bâtiment pour y ranger les photos.</p>}
          {zones.map((z) => {
            const photos = z.photos ?? [];
            const fiches = fichesDe(z.code);
            return (
              <div key={z.code} className="card p-3">
                <div className="mb-2 flex flex-wrap items-baseline gap-2">
                  <span className="rounded bg-foret px-2 py-0.5 font-label text-[11px] font-bold text-ivoire">{z.code}</span>
                  <span className="font-medium text-foret">{z.nom || 'Sans nom'}</span>
                  <span className="text-[12px] text-charbon/50">{fiches.length} désordre{fiches.length > 1 ? 's' : ''} · {photos.length + fiches.reduce((a, x) => a + nbPhotosFiche(x), 0)} photo{photos.length + fiches.reduce((a, x) => a + nbPhotosFiche(x), 0) > 1 ? 's' : ''}</span>
                </div>

                {/* Désordres de la zone : chaque fiche regroupe les photos qui l’illustrent */}
                <div className="space-y-2">
                  {fiches.map((x) => {
                    const ph = photosFiche(x);
                    const sansPreco = dossier.type === 'avis' ? false : dossier.type === 'diagnostic' ? !(x.solutions ?? []).length && !x.preconisation : !x.preconisation;
                    return (
                      <div key={x.id} {...dropSur(`fiche:${x.id}`)}
                        className={`rounded-md border border-l-4 bg-white p-2.5 transition ${cibleSurvol === `fiche:${x.id}` ? 'border-terre bg-terre-50' : 'border-pierre-100'}`} style={{ borderLeftColor: PRIORITY[x.priorite].color }}>
                        <button type="button" onClick={() => setOuverte(x.id)} className="block w-full text-left hover:underline" title="Ouvrir la fiche pour la compléter">
                          <span className="mr-2 whitespace-nowrap font-semibold text-foret">{x.numero}</span>
                          <span className="text-[14px]">{x.type}</span>
                        </button>
                        <div className="mb-2 mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${x.constat.trim() ? 'bg-sauge-50 text-sauge' : 'bg-terre-50 text-terre'}`}>{x.constat.trim() ? '✓' : '○'} observation</span>
                          {dossier.type !== 'avis' && <span className={`rounded-full px-2 py-0.5 text-[11px] ${!sansPreco ? 'bg-sauge-50 text-sauge' : 'bg-terre-50 text-terre'}`}>{!sansPreco ? '✓' : '○'} préconisation</span>}
                          {x.aRelire && <span className="rounded-full bg-terre-50 px-2 py-0.5 text-[11px] text-terre">à relire</span>}
                          {x.general && <span className="rounded-full bg-ivoire px-2 py-0.5 text-[11px] text-charbon/60">général</span>}
                          <button type="button" className="btn-quiet ml-auto min-h-[32px] px-2 text-[12px]" title="Copier cette fiche pour la coller dans une autre zone (ou un autre dossier)" onClick={() => { copierDansPressePapier(dossier, x); setFlash(`Fiche ${x.numero} copiée : cliquez « Coller » dans la zone voulue (avec les photos sélectionnées), ou dans la visionneuse d’une photo.`); }}>⧉ Copier</button>
                          <button type="button" className="btn-ghost min-h-[32px] px-3 text-[12px]" onClick={() => setOuverte(x.id)}>Compléter la fiche →</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ph.map((p) => vignette(p, ph, x.id))}
                          <div className="grid w-24 place-items-center rounded border border-dashed sm:w-32 border-pierre text-center text-[11px] text-charbon/45" style={{ aspectRatio: '4/3' }}>
                            {ph.length ? 'Déposer ici' : 'Déposez les photos de ce désordre'}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div {...dropSur(`nouveau:${z.code}`)} onClick={() => setGrouper({ ids: sel, zone: z.code, type: '', fiche: '' })} role="button" tabIndex={0}
                    className={`cursor-pointer rounded-md border border-dashed px-3 py-2.5 text-center text-[13px] transition ${cibleSurvol === `nouveau:${z.code}` ? 'border-terre bg-terre-50 text-terre' : 'border-pierre text-charbon/55 hover:border-sauge hover:text-foret'}`}>
                    + Nouveau désordre dans {z.code}{sel.length ? ` avec les ${sel.length} photo${sel.length > 1 ? 's' : ''} sélectionnée${sel.length > 1 ? 's' : ''}` : ' (déposez-y les photos qui l’illustrent)'}
                  </div>
                  {copiee && (
                    <button type="button" onClick={() => collerCopiee(z.code, sel)} className="w-full rounded-md border border-sauge bg-sauge-50 px-3 py-2 text-[13px] text-foret hover:bg-sauge hover:text-white">
                      📋 Coller ici la fiche {copiee.fiche.numero} « {copiee.fiche.type} »{sel.length ? ` avec les ${sel.length} photo${sel.length > 1 ? 's' : ''} sélectionnée${sel.length > 1 ? 's' : ''}` : ''}
                    </button>
                  )}
                </div>

                {/* Vues générales de la zone (reportage), sans désordre particulier */}
                <div {...dropSur(z.code)} className={`mt-2 rounded-md p-2 transition ${cibleSurvol === z.code ? 'bg-sauge-50 ring-1 ring-sauge' : 'bg-ivoire/60'}`}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-charbon/50">Vues générales de la zone <span className="font-normal normal-case">· {photos.length} — reportage, sans désordre particulier</span></p>
                  {photos.length > 0
                    ? <div className="flex flex-wrap gap-2">{photos.map((p) => vignette(p, photos))}</div>
                    : <p className="py-1.5 text-center text-[12px] text-charbon/45">Déposez ici les vues d’ensemble de la zone</p>}
                </div>
              </div>
            );
          })}
          {orphelines.length > 0 && (
            <div className="card border-terre/40 p-3">
              <p className="mb-2 text-[13px] font-medium text-terre">Désordres sans zone : choisissez leur localisation dans la fiche</p>
              <div className="flex flex-wrap gap-2">
                {orphelines.map((x) => <button key={x.id} type="button" className="btn-ghost min-h-[32px] text-[12px]" onClick={() => setOuverte(x.id)}>{x.numero} {x.type} →</button>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {grouper && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-charbon/30 p-4" onClick={() => setGrouper(null)}>
          <div className="card w-full max-w-lg space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-xl font-semibold text-foret">{grouper.ids.length ? `Regrouper ${grouper.ids.length} photo${grouper.ids.length > 1 ? 's' : ''} en un désordre` : 'Nouveau désordre'}</p>
            <p className="text-[12px] text-charbon/55">La première photo sélectionnée devient la vue d’ensemble, la deuxième le détail.</p>
            <label className="block text-[13px]"><span className="label-caps">Ajouter à une fiche existante</span>
              <select value={grouper.fiche} onChange={(e) => setGrouper({ ...grouper, fiche: e.target.value })} className="field mt-1">
                <option value="">Non : créer une nouvelle fiche</option>
                {dossier.desordres.map((x) => <option key={x.id} value={x.id}>{x.numero} · {x.type} ({x.zoneCode})</option>)}
              </select>
            </label>
            {!grouper.fiche && modeles.length > 0 && (
              <label className="block text-[13px]"><span className="label-caps">Partir d’une fiche déjà rédigée (copie)</span>
                <select value={grouper.modele ?? ''} onChange={(e) => setGrouper({ ...grouper, modele: e.target.value })} className="field mt-1">
                  <option value="">Non : fiche neuve</option>
                  {modeles.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                {grouper.modele && <span className="mt-1 block text-[11px] text-sauge">Constat, analyse, préconisation, chiffrage et priorité sont repris ; la zone et le numéro sont mis à jour, et le nom de l’ancienne zone est remplacé dans les textes.</span>}
              </label>
            )}
            {!grouper.fiche && (
              <>
                <label className="block text-[13px]"><span className="label-caps">Zone</span>
                  <select value={grouper.zone} onChange={(e) => setGrouper({ ...grouper, zone: e.target.value })} className="field mt-1">
                    {zones.map((z) => <option key={z.code} value={z.code}>{z.code} · {z.nom}</option>)}
                  </select>
                </label>
                {!grouper.modele && <div className="block text-[13px]"><span className="label-caps">Type de désordre</span>
                  <div className="mt-1">
                    <Combo value={grouper.type} onChange={(v) => setGrouper({ ...grouper, type: v })} options={lib.desordres.map((x) => x.type)} placeholder="Choisir dans la liste ou écrire un nouveau désordre…"
                      groupe={(o) => { const t = lib.desordres.find((x) => x.type === o); return t ? categorieDesordre(t) : undefined; }} ordreGroupes={CATEGORIES_DESORDRE}
                      mots={(o) => { const t = lib.desordres.find((x) => x.type === o); return t ? motsDesordre(t) : ''; }} />
                  </div>
                  <p className="mt-1 text-[11px] text-charbon/55">
                    {!grouper.type.trim() ? 'Vide : fiche « À qualifier ».'
                      : lib.desordres.some((x) => x.type === grouper.type) ? 'Désordre type de la bibliothèque : la fiche sera pré-rédigée.'
                      : <span className="text-sauge">Nouveau : « {grouper.type.trim()} » sera ajouté à votre bibliothèque, rubrique « À catégoriser ».</span>}
                  </p>
                </div>}
              </>
            )}
            <div className="flex gap-2 pt-1">
              {grouper.fiche
                ? <button type="button" className="btn-primary" onClick={() => { versFiche(grouper.ids, grouper.fiche); setGrouper(null); }}>Lier à la fiche</button>
                : <>
                    <button type="button" className="btn-primary" disabled={!grouper.zone} onClick={() => (grouper.modele ? creerDepuisModele(grouper, true) : creerFiche(grouper.ids, grouper.zone, grouper.type, true))}>Créer et compléter la fiche</button>
                    <button type="button" className="btn-ghost" disabled={!grouper.zone} onClick={() => (grouper.modele ? creerDepuisModele(grouper, false) : creerFiche(grouper.ids, grouper.zone, grouper.type))}>Créer seulement</button>
                  </>}
              <button type="button" className="btn-quiet ml-auto" onClick={() => setGrouper(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {photoVue && (
        <div className="fixed inset-0 z-[45] flex bg-charbon/90" onClick={() => setVue(null)} role="dialog" aria-modal="true" aria-label="Photo en grand">
          <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoVue.src} alt="" className="max-h-[calc(100dvh-90px)] max-w-full rounded object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
            <p className="mt-2 text-center text-[12px] text-white/70" onClick={(e) => e.stopPropagation()}>
              {photoVue.nom ?? ''}{photoVue.prise ? ` · ${new Date(photoVue.prise).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}{visiteDe(photoVue) ? ` · ${visiteDe(photoVue)!.libelle}` : ''} — {iVue + 1} / {ordreVue.length}
            </p>
            <button type="button" data-vue-nav aria-label="Photo précédente" disabled={iVue <= 0} onClick={(e) => { e.stopPropagation(); setVue(ordreVue[iVue - 1].id!); setVueMsg(null); }}
              className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/30 disabled:opacity-20">‹</button>
            <button type="button" data-vue-nav aria-label="Photo suivante" disabled={iVue >= ordreVue.length - 1} onClick={(e) => { e.stopPropagation(); setVue(ordreVue[iVue + 1].id!); setVueMsg(null); }}
              className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/30 disabled:opacity-20">›</button>
          </div>
          <aside className="flex w-full max-w-[360px] flex-col overflow-y-auto bg-ivoire p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center gap-2">
              <p className="flex-1 font-serif text-lg font-semibold text-foret">Quel(s) désordre(s) illustre cette photo ?</p>
              <button type="button" className="btn-quiet text-[18px]" aria-label="Fermer" onClick={() => setVue(null)}>✕</button>
            </div>
            <p className="text-[12px] text-charbon/60">Actuellement : <b className="text-charbon/80">{ouEst(photoVue.id!)}</b></p>
            <p className="mt-1 text-[11px] text-charbon/50">Cochez un ou plusieurs désordres ; recliquez pour retirer.</p>
            {vueMsg && <p className="mt-2 rounded bg-sauge-50 px-2 py-1.5 text-[12px] text-sauge">{vueMsg}</p>}
            {!zones.length && <p className="mt-3 text-[13px] text-charbon/60">Créez d’abord les zones du bâtiment.</p>}
            <div className="mt-3 space-y-3">
              {zones.map((z) => (
                <div key={z.code}>
                  <p className="mb-1 text-[12px] font-semibold text-foret"><span className="mr-1 rounded bg-foret px-1.5 py-0.5 font-label text-[10px] text-ivoire">{z.code}</span>{z.nom}</p>
                  <div className="space-y-1">
                    {fichesDe(z.code).map((x) => {
                      const ici = photosFiche(x).some((p) => p.id === photoVue.id);
                      return (
                        <button key={x.id} type="button" aria-pressed={ici}
                          onClick={() => (ici
                            ? (retirerDeFiche(photoVue.id!, x.id), setVueMsg(`Retirée de ${x.numero}`))
                            : rangerVue(() => versFiche([photoVue.id!], x.id), `Ajoutée à ${x.numero} ✓${fichesDePhoto(photoVue.id!).length ? ' (elle illustre aussi ' + fichesDePhoto(photoVue.id!).map((y) => y.numero).join(', ') + ')' : ''}`))}
                          title={ici ? 'Cliquer pour retirer la photo de ce désordre' : 'Cliquer pour ajouter la photo à ce désordre (elle peut en illustrer plusieurs)'}
                          className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[13px] ${ici ? 'border-sauge bg-sauge-50' : 'border-pierre-100 bg-white hover:border-sauge'}`}>
                          <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${ici ? 'border-sauge bg-sauge text-white' : 'border-pierre'}`}>{ici ? '✓' : ''}</span>
                          <span style={{ color: PRIORITY[x.priorite].color }}>●</span><b className="text-foret">{x.numero}</b><span className="min-w-0 flex-1 truncate">{x.type}</span>
                        </button>
                      );
                    })}
                    {copiee && (
                      <button type="button" onClick={() => collerCopiee(z.code, [photoVue.id!])}
                        className="w-full rounded-md border border-sauge bg-sauge-50 px-2.5 py-1.5 text-left text-[13px] text-foret hover:bg-sauge hover:text-white">📋 Coller la fiche {copiee.fiche.numero} « {copiee.fiche.type} » dans {z.code}</button>
                    )}
                    <button type="button" onClick={() => setGrouper({ ids: [photoVue.id!], zone: z.code, type: '', fiche: '' })}
                      className="w-full rounded-md border border-dashed border-pierre px-2.5 py-1.5 text-left text-[13px] text-charbon/65 hover:border-terre hover:text-terre">+ Nouveau désordre dans {z.code}</button>
                    <button type="button" disabled={zoneDe(photoVue.id!)?.code === z.code} onClick={() => rangerVue(() => versZone([photoVue.id!], z.code), `Rangée en vue générale de ${z.code} ✓`)}
                      className="w-full rounded-md px-2.5 py-1 text-left text-[12px] text-charbon/55 hover:bg-white disabled:text-sauge">{zoneDe(photoVue.id!)?.code === z.code ? '✓ ' : ''}Vue générale de la zone (sans désordre)</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-pierre-100 pt-3">
              <label className="block"><span className="label-caps">Légende</span>
                <input className="field mt-1 py-1.5 text-[13px]" value={photoVue.legende ?? ''} onChange={(e) => majPhoto(photoVue.id!, { legende: e.target.value })} placeholder="Facultatif" />
              </label>
              <div className="flex flex-wrap gap-2">
                {ficheDe(photoVue.id!) && <button type="button" className="btn-ghost min-h-[36px] text-[13px]" onClick={() => { const f = ficheDe(photoVue.id!)!; copierDansPressePapier(dossier, f); setVueMsg(`Fiche ${f.numero} copiée : choisissez « Coller » dans la zone voulue pour la photo suivante.`); }}>⧉ Copier la fiche {ficheDe(photoVue.id!)!.numero}</button>}
                {ficheDe(photoVue.id!) && <button type="button" className="btn-primary min-h-[36px] text-[13px]" onClick={() => { const f = ficheDe(photoVue.id!)!; setVue(null); setOuverte(f.id); }}>Compléter la fiche {ficheDe(photoVue.id!)!.numero} →</button>}
                <button type="button" className="btn-ghost min-h-[36px] text-[13px]" onClick={() => update({ ...dossier, meta: { ...dossier.meta, photoCouverture: photoVue } })}>{dossier.meta.photoCouverture?.id === photoVue.id ? '★ Photo de couverture' : '☆ Mettre en couverture'}</button>
                {ouEst(photoVue.id!) !== 'À classer' && <button type="button" className="btn-quiet text-[13px]" onClick={() => { versBac([photoVue.id!]); setVueMsg('Remise à classer'); }}>Remettre à classer</button>}
                <button type="button" className="btn-quiet text-[13px] text-terre" onClick={() => {
                  const id = photoVue.id!; const suivante = ordreVue[iVue + 1]?.id ?? ordreVue[iVue - 1]?.id;
                  update(extraire(dossier, [id]).d);
                  if (suivante) { setVue(suivante); setVueMsg('Photo supprimée (« ↶ Retour » pour annuler)'); } else setVue(null);
                }}>🗑 Supprimer la photo</button>
              </div>
              <p className="text-[11px] text-charbon/50">Flèches ← → du clavier pour passer d’une photo à l’autre, Échap pour fermer.</p>
            </div>
          </aside>
        </div>
      )}

      {fiche && (
        <div className="fixed inset-0 z-40 flex justify-end bg-charbon/25" onClick={() => setOuverte(null)}>
          <aside className="h-full w-full max-w-[880px] overflow-y-auto bg-ivoire p-4 shadow-2xl" onClick={(e) => e.stopPropagation()} aria-label={`Fiche ${fiche.numero}`}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button type="button" className="btn-quiet -ml-2 text-[13px]" onClick={() => setOuverte(null)}>← Retour aux photos</button>
              <span className="ml-auto text-[12px] text-charbon/50">Fiche {iFiche + 1} / {ordreFiches.length}</span>
              <button type="button" className="btn-ghost min-h-[34px] text-[13px]" disabled={iFiche <= 0} onClick={() => setOuverte(ordreFiches[iFiche - 1].id)}>‹ Précédente</button>
              <button type="button" className="btn-ghost min-h-[34px] text-[13px]" disabled={iFiche >= ordreFiches.length - 1} onClick={() => setOuverte(ordreFiches[iFiche + 1].id)}>Suivante ›</button>
            </div>
            <FicheDesordreEditor
              key={fiche.id}
              desordre={fiche}
              zones={dossier.zones}
              mode={dossier.type}
              photosDispo={toutesLesPhotos(dossier)}
              onChange={(f) => update(appliquerFiche(dossier, f))}
              onDelete={() => { update(supprimerFiche(dossier, fiche.id)); setOuverte(null); }}
              onDuplicate={() => { const r = dupliquerFiche(dossier, fiche.id); if (r) { update(r.d); setOuverte(r.copie.id); } }}
              onCopy={() => copierDansPressePapier(dossier, fiche)}
              jumelles={fichesJumelles(dossier, fiche).map((x) => ({ numero: x.numero, zoneCode: x.zoneCode }))}
              onClose={() => setOuverte(null)}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
