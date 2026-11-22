'use client';
import { useEffect, useRef, useState } from 'react';
import { tuilePlan, versPixels } from '@/lib/geo';

export interface PointCarte { id: string; lat: number; lon: number; label: string; color?: string; centre?: boolean }

/** Carte simple (plan IGN) avec les contacts localisés ; le zoom s'ajuste pour tout montrer. */
export default function CarteContacts({ points, onSelect, hauteur = 440 }: { points: PointCarte[]; onSelect?: (id: string) => void; hauteur?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(900);
  const [zoomDelta, setZoomDelta] = useState(0);
  const [survol, setSurvol] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 900));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (!points.length) return <div ref={ref} className="grid place-items-center rounded-lg border border-pierre-100 bg-pierre-50 text-[13px] text-charbon/55" style={{ height: hauteur }}>Aucun contact localisé : cliquez sur « Localiser mes contacts ».</div>;

  const H = hauteur;
  const lats = points.map((p) => p.lat), lons = points.map((p) => p.lon);
  const c = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lon: (Math.min(...lons) + Math.max(...lons)) / 2 };
  let z = 15;
  while (z > 5) {
    const a = versPixels(Math.max(...lats), Math.min(...lons), z), b = versPixels(Math.min(...lats), Math.max(...lons), z);
    if (b.x - a.x < W - 80 && b.y - a.y < H - 80) break;
    z--;
  }
  z = Math.max(5, Math.min(17, z + zoomDelta));
  const cp = versPixels(c.lat, c.lon, z);
  const ox = cp.x - W / 2, oy = cp.y - H / 2;
  const tiles: { x: number; y: number }[] = [];
  for (let x = Math.floor(ox / 256); x <= Math.floor((ox + W) / 256); x++) for (let y = Math.floor(oy / 256); y <= Math.floor((oy + H) / 256); y++) tiles.push({ x, y });

  return (
    <div ref={ref} className="relative overflow-hidden rounded-lg border border-pierre-100 bg-[#eef0ea]" style={{ height: H }}>
      {tiles.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${t.x}-${t.y}`} src={tuilePlan(z, t.x, t.y)} alt="" draggable={false} className="absolute select-none" style={{ left: t.x * 256 - ox, top: t.y * 256 - oy, width: 256, height: 256 }} />
      ))}
      {points.map((p) => {
        const px = versPixels(p.lat, p.lon, z);
        return (
          <button key={p.id} type="button" onClick={() => onSelect?.(p.id)} onMouseEnter={() => setSurvol(p.id)} onMouseLeave={() => setSurvol(null)}
            className="absolute -translate-x-1/2 -translate-y-full" style={{ left: px.x - ox, top: px.y - oy, zIndex: survol === p.id ? 20 : p.centre ? 15 : 10 }} title={p.label}>
            <svg width={p.centre ? 30 : 24} height={p.centre ? 38 : 30} viewBox="0 0 24 30"><path d="M12 29s9-9.5 9-17A9 9 0 0 0 3 12c0 7.5 9 17 9 17z" fill={p.color ?? '#334B3D'} stroke="#fff" strokeWidth="1.6" /><circle cx="12" cy="12" r="3.4" fill="#fff" /></svg>
            {(survol === p.id || p.centre) && <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-charbon px-2 py-0.5 text-[11px] text-white">{p.label}</span>}
          </button>
        );
      })}
      <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-md border border-pierre bg-white shadow">
        <button type="button" className="px-2.5 py-1 text-[15px]" onClick={() => setZoomDelta(zoomDelta + 1)} aria-label="Zoomer">+</button>
        <button type="button" className="border-t border-pierre px-2.5 py-1 text-[15px]" onClick={() => setZoomDelta(zoomDelta - 1)} aria-label="Dézoomer">−</button>
      </div>
      <span className="absolute bottom-1 right-2 rounded bg-white/80 px-1.5 text-[10px] text-charbon/60">Plan IGN</span>
    </div>
  );
}
