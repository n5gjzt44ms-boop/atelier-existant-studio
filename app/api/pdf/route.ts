/**
 * Route serveur d'export PDF (Puppeteer / Chromium headless).
 * Nécessite un déploiement Node (Vercel avec @sparticuz/chromium, Railway, VPS…).
 * Exclue automatiquement du build statique (scripts/build-static.mjs).
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const dossier = await req.json();
  let puppeteer: typeof import('puppeteer');
  try {
    puppeteer = await import('puppeteer');
  } catch {
    return NextResponse.json({ error: 'Puppeteer non installé' }, { status: 501 });
  }

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--font-render-hinting=none'] });
  try {
    const page = await browser.newPage();
    // Le dossier est injecté avant le chargement : /print le lit dans window.__DOSSIER__
    await page.evaluateOnNewDocument((d) => {
      (window as unknown as { __DOSSIER__: unknown }).__DOSSIER__ = d;
    }, dossier);
    const origin = req.nextUrl.origin;
    await page.goto(`${origin}/print`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-report-ready]', { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true, // respecte @page de globals.css (marges, format)
      // En-têtes / pieds de page : boîtes de marge @page de globals.css
    });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${dossier.numero}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
