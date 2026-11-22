'use client';
/** Page de rendu dédiée à l'export Puppeteer (/api/pdf). */
import { useEffect, useState } from 'react';
import ReportPreview from '@/components/ReportPreview';
import type { Dossier } from '@/lib/types';

export default function PrintPage() {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  useEffect(() => {
    const d = (window as unknown as { __DOSSIER__?: Dossier }).__DOSSIER__;
    if (d) setDossier(d);
  }, []);
  if (!dossier) return null;
  return (
    <div data-report-ready="">
      <ReportPreview dossier={dossier} />
    </div>
  );
}
