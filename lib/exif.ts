/**
 * Lecture de la date de prise de vue (EXIF DateTimeOriginal) d'un JPEG,
 * sans bibliothèque. Sert à remettre les photos dans l'ordre de la visite.
 * Repli : date de modification du fichier.
 */
export async function captureTime(file: File): Promise<number> {
  try {
    const buf = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    const t = readExifDate(buf);
    if (t) return t;
  } catch { /* fichier non JPEG ou EXIF absent */ }
  return file.lastModified || 0;
}

function readExifDate(v: DataView): number | null {
  if (v.getUint16(0) !== 0xffd8) return null; // pas un JPEG
  let off = 2;
  while (off + 4 < v.byteLength) {
    const marker = v.getUint16(off);
    const size = v.getUint16(off + 2);
    if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) return parseTiff(v, off + 10); // "Exif"
    if ((marker & 0xff00) !== 0xff00) return null;
    off += 2 + size;
  }
  return null;
}

function parseTiff(v: DataView, start: number): number | null {
  const le = v.getUint16(start) === 0x4949;
  const u16 = (o: number) => v.getUint16(start + o, le);
  const u32 = (o: number) => v.getUint32(start + o, le);
  const ifdEntries = (ifd: number) => {
    const n = u16(ifd);
    return Array.from({ length: n }, (_, i) => ifd + 2 + i * 12);
  };
  const readAscii = (entry: number) => {
    const count = u32(entry + 4);
    const at = count > 4 ? u32(entry + 8) : entry + 8;
    let s = '';
    for (let i = 0; i < count - 1; i++) s += String.fromCharCode(v.getUint8(start + at + i));
    return s;
  };
  let dateStr: string | null = null;
  let exifIfd = 0;
  for (const e of ifdEntries(u32(4))) {
    const tag = u16(e);
    if (tag === 0x8769) exifIfd = u32(e + 8);
    if (tag === 0x0132) dateStr = readAscii(e); // DateTime (repli)
  }
  if (exifIfd) {
    for (const e of ifdEntries(exifIfd)) {
      if (u16(e) === 0x9003) { dateStr = readAscii(e); break; } // DateTimeOriginal
    }
  }
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
}
