import type { Photo } from './types';
import { uid } from './factory';

/**
 * Prépare une photo terrain : redimensionnement (côté max 1600 px) et
 * compression JPEG pour garder des dossiers et des PDF légers.
 */
export async function fileToPhoto(file: File, maxSide = 1600, quality = 0.82): Promise<Photo> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * k);
    canvas.height = Math.round(img.naturalHeight * k);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { id: uid(), src: canvas.toDataURL('image/jpeg', quality), legende: '' };
  } finally {
    URL.revokeObjectURL(url);
  }
}
