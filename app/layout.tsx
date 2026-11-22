import type { Metadata } from 'next';
// Polices auto-hébergées (aucune dépendance à Google Fonts, PDF identique hors ligne)
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import './globals.css';

export const metadata: Metadata = {
  title: "Studio — L'Atelier de l'Existant",
  description: 'Rédaction et génération des livrables de diagnostic du bâti ancien',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#334B3D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Atelier" />
        <link rel="icon" href="favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="apple-touch-icon.png" />
        <link rel="manifest" href="manifest.webmanifest" />
        {/* Mise en page d'impression native (devis, factures, et repli du rapport) : désactivée pendant l'impression paginée */}
        <style id="page-natif" media="print" dangerouslySetInnerHTML={{ __html: `
@page { size: A4; margin: 16mm 15mm 18mm;
  @bottom-left { content: "L'Atelier de l'Existant — Diagnostic du bâti ancien"; font: 600 6.5pt Montserrat, sans-serif; color: #68725E; }
  @bottom-right { content: "Page " counter(page) " / " counter(pages); font: 600 6.5pt Montserrat, sans-serif; color: #68725E; } }
@page :first { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
