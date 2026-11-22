'use client';
import { fmtDate, fmtRange, roadmap, sortDesordres } from '@/lib/calc';
import { phraseVerif, sansMentionVerif } from '@/lib/fiches';
import {
  BRAND, CONFIDENCE_LABEL, DELIVERABLES, LEGAL_ACCOMPAGNEMENT, LEGAL_RESERVES, limitesMission,
  MESURE_CATEGORIES, NEUTRALITE_ANNUAIRE, PHASES, PRIORITY, STATUS_LABEL, ZONE_CATEGORIES,
} from '@/lib/constants';
import type { Desordre, Dossier, MesureCategorie, Photo, Priority } from '@/lib/types';
import SynthesisTable from './SynthesisTable';
import { buildSynthesis, precoOf, type Block } from '@/lib/narrative';
import { useLibrary } from './LibraryProvider';
import { phrasePerimetre } from '@/lib/perimetre';
import { GuidePage } from './guides';
import { grouperPreconisations, type GroupePreco } from '@/lib/precos';
import { lotsDe } from '@/lib/factory';
import type { EntrepriseInfo } from '@/lib/business';

/** Préfixe des fichiers de /public : relatif en export statique, absolu sinon. */
export const ASSET_BASE = process.env.NEXT_PUBLIC_STATIC === '1' ? '' : '/';

/**
 * Rendu HTML/CSS du livrable — source unique pour l'aperçu temps réel,
 * l'impression navigateur et l'export Puppeteer. Les pages suivent la
 * trame canonique (référentiel §7.1), adaptée à chaque type de livrable.
 */

type SectionKey =
  | 'objet' | 'manifeste' | 'lieu' | 'souhaits' | 'zones' | 'exterieur' | 'contexte'
  | 'fiches' | 'constatsZones' | 'causes' | 'mesures' | 'investigations' | 'tiers'
  | 'synthese' | 'syntheseRedigee' | 'reportage' | 'consultation' | 'comparatif' | 'feuille' | 'planning' | 'scenarios' | 'conclusion' | 'preconisations'
  | 'annuaire' | 'accompagnement' | 'limites' | 'annexes'
  | 'desordresListe' | 'vigilance' | 'etudes' | 'preconisationsDiag' | 'guides' | 'precos';

const TITLES: Record<SectionKey, string> = {
  objet: 'Objet de la mission et conditions de visite',
  manifeste: 'L’Atelier et mode de lecture',
  lieu: 'Présentation du lieu étudié',
  souhaits: 'Souhaits et objectifs des propriétaires',
  zones: 'Plans et nomenclature des zones',
  exterieur: 'Diagnostic général et contexte extérieur',
  contexte: 'Situation et contexte historique',
  fiches: 'Diagnostic détaillé — fiches désordres',
  constatsZones: 'Constats des ouvrages par zones',
  causes: 'Analyse des désordres et diagnostic des causes',
  mesures: 'Mesures conservatoires et dispositifs de sécurisation',
  investigations: 'Investigations complémentaires recommandées',
  tiers: 'Avis aux tiers et responsabilités',
  synthese: 'Tableau récapitulatif des désordres',
  syntheseRedigee: 'Synthèse et feuille de route',
  reportage: 'Annexe — reportage photographique complet',
  consultation: 'Dossier de consultation des entreprises',
  comparatif: 'Analyse comparative des devis',
  feuille: 'Feuille de route et plan d’actions',
  planning: 'Planning prévisionnel',
  scenarios: 'Estimation financière en trois scénarios',
  conclusion: 'Avis général',
  preconisations: 'Bilan structurel, conclusion et principes de renforcement',
  annuaire: 'Annuaire des entreprises et intervenants',
  accompagnement: 'Proposition d’accompagnement',
  limites: 'Limites du diagnostic',
  annexes: 'Annexe — index des photos des désordres',
  desordresListe: 'Relevé des désordres',
  vigilance: 'Points de vigilance',
  etudes: 'Études complémentaires à mener',
  preconisationsDiag: 'Préconisations : solutions proposées',
  guides: 'Guides de bonnes pratiques',
  precos: 'Préconisations',
};

const PLAN: Record<Dossier['type'], SectionKey[]> = {
  avis: ['objet', 'lieu', 'zones', 'desordresListe', 'vigilance', 'etudes', 'conclusion', 'guides', 'limites', 'reportage'],
  diagnostic: ['manifeste', 'objet', 'lieu', 'zones', 'exterieur', 'fiches', 'mesures', 'precos', 'synthese', 'syntheseRedigee', 'guides', 'limites', 'reportage', 'annexes'],
  conseil: [
    'manifeste', 'objet', 'lieu', 'souhaits', 'zones', 'exterieur', 'fiches', 'precos', 'syntheseRedigee',
    'synthese', 'planning', 'scenarios', 'annuaire', 'accompagnement', 'guides', 'limites', 'reportage', 'annexes',
  ],
  accompagnement: ['objet', 'lieu', 'synthese', 'consultation', 'comparatif', 'planning', 'guides', 'limites'],
};

const titleOf = (k: SectionKey, d: Dossier) => (k === 'lieu' && d.type === 'avis' ? 'Le bâtiment en bref' : k === 'syntheseRedigee' && d.type === 'diagnostic' ? 'Synthèse : l’essentiel et par où commencer' : TITLES[k]);

export default function ReportPreview({ dossier }: { dossier: Dossier }) {
  const { lib } = useLibrary();
  const precos = grouperPreconisations(sortDesordres(dossier.desordres), dossier.zones, lib.preconisations);
  const sections = PLAN[dossier.type].filter((s) => {
    if (s === 'precos') return precos.length > 0;
    if (s === 'zones') return dossier.type !== 'avis' || (dossier.plansZones ?? []).some((p) => p.image || p.formes?.length);
    if (s === 'guides') return (dossier.guides ?? []).some((g) => lib.guides.some((x) => x.id === g));
    if (s === 'vigilance') return (dossier.vigilance ?? []).length > 0;
    if (s === 'etudes') return (dossier.etudes ?? []).length > 0;
    if (s === 'desordresListe') return dossier.desordres.length > 0;
    if (s === 'preconisationsDiag') return dossier.desordres.some((d) => (d.solutions ?? []).length || d.preconisation.trim());
    if (s === 'annexes') return dossier.desordres.some((d) => d.photoEnsemble || d.photoDetail || d.autresPhotos?.length);
    if (s === 'souhaits') return dossier.souhaits.length > 0;
    if (s === 'annuaire') return dossier.annuaire.length > 0;
    if (s === 'investigations') return dossier.desordres.some((d) => d.investigations.trim());
    if (s === 'reportage') return reportage(dossier).some((g) => g.photos.length);
    if (s === 'mesures') return dossier.mesures.length > 0;
    if (s === 'synthese') return dossier.desordres.length > 0;
    if (s === 'fiches') return dossier.type !== 'accompagnement' || dossier.desordres.length > 0;
    return true;
  });
  const num = (k: SectionKey) => sections.indexOf(k) + 1;
  const desordres = sortDesordres(dossier.desordres);
  const ctx = { dossier, desordres, num, ent: lib.entreprise, guides: lib.guides, precos };

  return (
    <div className="report">
      <Cover dossier={dossier} />
      <Page dossier={dossier} section="Sommaire">
        <ControlSheet dossier={dossier} />
        <h3 style={{ marginTop: '10mm' }}>Sommaire</h3>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {sections.map((s, i) => (
            <li key={s} style={{ display: 'flex', gap: '4mm', padding: '2mm 0', borderBottom: '0.5pt solid #D6C7AF' }}>
              <span style={{ width: '7mm', color: '#B97A5B', fontWeight: 600 }}>{i + 1}</span>
              <span>{titleOf(s, dossier)}</span>
            </li>
          ))}
        </ol>
      </Page>
      {sections.map((s) => <Section key={s} k={s} {...ctx} />)}
    </div>
  );
}

/* ─────────────────────────── Mise en page ─────────────────────────── */

function Page({ dossier, section, children, className = '', anchor }: { dossier: Dossier; section: string; children: React.ReactNode; className?: string; anchor?: string }) {
  return (
    <section className={`report-page ${className}`} data-anchor={anchor}>
      {children}
      {/* Repères de page et numéros : remplis par l'aperçu à l'écran (même découpage que le PDF) */}
      <div className="reperes-pages" aria-hidden />
      <footer className="folio"><span>{BRAND.nom} · {dossier.numero}</span><span>{section}<span className="folio-num" /></span></footer>
    </section>
  );
}

function H2({ n, children }: { n?: number; children: React.ReactNode }) {
  return (
    <header style={{ marginBottom: '6mm' }}>
      {n ? <div className="eyebrow" style={{ color: '#B97A5B' }}>Partie {n}</div> : null}
      <h2>{children}</h2>
      <div style={{ width: '18mm', borderTop: '0.5pt solid #334B3D' }} />
    </header>
  );
}

function Pic({ photo, label, ratio = '4 / 3' }: { photo: Photo | null; label: string; ratio?: string }) {
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ aspectRatio: ratio, background: '#F3EEE6', border: '0.5pt solid #D6C7AF', borderRadius: '1mm', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={photo.src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '7.5pt', color: '#68725E' }}>Photo à joindre</span>}
      </div>
      <figcaption style={{ fontSize: '7pt', color: '#68725E', marginTop: '1.2mm' }}>{[label, photo?.legende].filter(Boolean).join(' — ')}</figcaption>
    </figure>
  );
}

function KV({ rows }: { rows: [string, string | undefined][] }) {
  return (
    <table>
      <tbody>
        {rows.filter(([, v]) => v && v.trim()).map(([k, v]) => (
          <tr key={k}><td style={{ width: '38%', color: '#68725E' }}>{k}</td><td>{v}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Texte rédigé : un paragraphe par ligne ; les lignes qui commencent par « - », « • » ou « o »
 * deviennent des listes à puces, et une ligne plus indentée devient une sous-liste.
 */
/** *mot* → italique (matériau ou hypothèse non certaine). */
const enLigne = (t: string): React.ReactNode => {
  const morceaux = t.split(/\*([^*\n]+)\*/);
  return morceaux.length === 1 ? t : morceaux.map((m, i) => (i % 2 ? <em key={i}>{m}</em> : m));
};
const Para = ({ text }: { text: string }) => {
  type Ligne = { niv: number; t: string; puce: boolean };
  const lignes: Ligne[] = text.split(/\n/).filter((l) => l.trim()).map((l) => {
    const m = l.match(/^(\s*)(?:[-•▪◦]|o(?=\s))\s+(.*)$/);
    return m ? { niv: Math.min(3, Math.floor(m[1].replace(/\t/g, '    ').length / 2)), t: m[2], puce: true } : { niv: 0, t: l.trim(), puce: false };
  });
  const out: React.ReactNode[] = [];
  let i = 0;
  const liste = (niv: number): React.ReactNode => {
    const items: React.ReactNode[] = [];
    while (i < lignes.length && lignes[i].puce && lignes[i].niv >= niv) {
      if (lignes[i].niv > niv && items.length) { const sous = liste(lignes[i].niv); items[items.length - 1] = <li key={`li${i}`}>{(items[items.length - 1] as React.ReactElement).props.children}{sous}</li>; continue; }
      items.push(<li key={i}>{enLigne(lignes[i].t)}</li>);
      i++;
    }
    return <ul style={{ margin: '0.6mm 0 1.2mm', paddingLeft: niv ? '4mm' : '5mm' }}>{items}</ul>;
  };
  while (i < lignes.length) {
    if (lignes[i].puce) out.push(<div key={`l${i}`}>{liste(lignes[i].niv)}</div>);
    else { out.push(<p key={i}>{enLigne(lignes[i].t)}</p>); i++; }
  }
  return <>{out}</>;
};

function Prio({ p }: { p: Priority }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1.5mm', color: PRIORITY[p].color, fontWeight: 600, fontFamily: 'Montserrat, sans-serif', fontSize: '7.5pt', letterSpacing: '.05em' }}>
      <span style={{ width: '2.4mm', height: '2.4mm', borderRadius: '50%', background: PRIORITY[p].color }} />{PRIORITY[p].label}
    </span>
  );
}

/* ─────────────────────────── Pages fixes ─────────────────────────── */

function Cover({ dossier }: { dossier: Dossier }) {
  const { meta } = dossier;
  const adresse = [meta.bien.adresse, [meta.bien.codePostal, meta.bien.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return (
    <section className="report-page cover" data-anchor="cover" style={{ display: 'flex', flexDirection: 'column', padding: '22mm 20mm' }}>
      <Logo />

      <div style={{ marginTop: '12mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8mm' }}>
        <div>
          <div className="eyebrow" style={{ color: '#B97A5B' }}>{DELIVERABLES[dossier.type].titre}</div>
          <h1 style={{ fontSize: '26pt', lineHeight: 1.05, margin: '2.5mm 0 3mm', maxWidth: '125mm' }}>{meta.titreMission || DELIVERABLES[dossier.type].titre}</h1>
          <div style={{ fontSize: '10.5pt' }}>{adresse || 'Adresse du bien'}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="eyebrow">Dossier</div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '10pt', letterSpacing: '.06em' }}>{dossier.numero}</div>
          <div style={{ fontSize: '7.5pt', color: '#68725E', marginTop: '1mm' }}>Indice {dossier.version} · {STATUS_LABEL[dossier.status]}</div>
        </div>
      </div>

      <div style={{ flex: 1, margin: '8mm 0', minHeight: 0 }}>
        <div style={{ height: '100%', minHeight: '70mm', background: '#F3EEE6', border: '0.5pt solid #D6C7AF', borderRadius: '1.5mm', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {meta.photoCouverture
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={meta.photoCouverture.src} alt="Vue d’ensemble du bâtiment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '8pt', color: '#68725E' }}>Photo d’ensemble du bâtiment</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6mm', borderTop: '0.5pt solid #68725E', paddingTop: '4mm' }}>
        <CoverItem k="Maître d’ouvrage" v={meta.client.nom} />
        <CoverItem k="Date de visite" v={fmtDate(meta.dateVisite)} />
        <CoverItem k="Date du rapport" v={fmtDate(meta.dateRapport)} />
      </div>
    </section>
  );
}

/** Logo de couverture (version de Lorine Gratadour) : les pierres en image, le texte composé pour rester net à toute taille. */
function Logo() {
  return (
    <div style={{ textAlign: 'center', color: '#242424' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ASSET_BASE}logo-pierres.png`} alt="" style={{ width: '40mm', display: 'block', margin: '0 auto 5mm' }} />
      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '23pt', lineHeight: 1.15, letterSpacing: '.2em', marginRight: '-.2em' }}>ATELIER<br />DE L’EXISTANT</div>
      <div style={{ width: '22mm', borderTop: '0.8pt solid #242424', margin: '3.5mm auto' }} />
      <div style={{ fontFamily: 'Inter, sans-serif', fontStyle: 'italic', fontSize: '10pt', lineHeight: 1.35, color: '#585858', letterSpacing: '.02em' }}>Comprendre son histoire,<br />accompagner sa transformation.</div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '6.8pt', letterSpacing: '.22em', marginTop: '4mm', color: '#242424' }}>CONSEIL · DIAGNOSTIC · CONCEPTION · ACCOMPAGNEMENT</div>
    </div>
  );
}

const CoverItem = ({ k, v }: { k: string; v: string }) => (
  <div><div className="eyebrow">{k}</div><div style={{ fontSize: '9.5pt', marginTop: '1mm' }}>{v || '—'}</div></div>
);

function ControlSheet({ dossier }: { dossier: Dossier }) {
  const { meta } = dossier;
  return (
    <>
      <H2>Fiche de contrôle</H2>
      <KV rows={[
        ['Type de livrable', DELIVERABLES[dossier.type].titre],
        ['Numéro de dossier', dossier.numero],
        ['Indice de révision', `${dossier.version} — ${STATUS_LABEL[dossier.status]}`],
        ['Intervenant', meta.intervenant],
        ['Maître d’ouvrage', [meta.client.nom, meta.client.qualite].filter(Boolean).join(' — ')],
        ['Date de visite', fmtDate(meta.dateVisite)],
        ['Date du rapport', fmtDate(meta.dateRapport)],
        ['Limites de la visite', meta.limitesVisite],
      ]} />
    </>
  );
}

/* ─────────────────────────── Sections ─────────────────────────── */

interface Ctx { dossier: Dossier; desordres: Desordre[]; num: (k: SectionKey) => number; ent: EntrepriseInfo; guides: import('./guides').Guide[]; precos: GroupePreco[] }

function Section({ k, dossier, desordres, num, ent, guides, precos }: Ctx & { k: SectionKey }) {
  const { meta, contexte } = dossier;
  const n = num(k);
  const title = titleOf(k, dossier);
  const modeFiche = dossier.type === 'diagnostic' ? 'diagnostic' : 'conseil';
  const P = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <Page dossier={dossier} section={title} className={className} anchor={k}><H2 n={n}>{title}</H2>{children}</Page>
  );
  const zoneName = (c: string) => dossier.zones.find((z) => z.code === c)?.nom ?? '';
  const nPrecos = num('precos');

  switch (k) {
    case 'manifeste':
      return (
        <P>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16pt', lineHeight: 1.3, color: '#334B3D', maxWidth: '150mm' }}>
            « {BRAND.manifeste}. »
          </p>
          <p>Le bâti ancien fonctionne selon des principes d’équilibre dynamique, de souplesse et de respirabilité. Notre diagnostic part de l’observation rigoureuse des désordres pour en rechercher les causes, avant de préconiser des solutions compatibles avec les matériaux traditionnels : pierre, chaux, terre et bois.</p>
          <h3>Mode de lecture</h3>
          <table>
            <tbody>
              {[
                ['Constat', 'Ce qui est observé sur place, sans interprétation.'],
                ['Analyse', 'Mécanismes et causes probables, avec leur niveau de confiance. Une cause non vérifiée est signalée « hypothèse à vérifier par investigation spécifique ».'],
                ['Préconisation', 'Solution durable compatible avec le bâti ancien.'],
              ].map(([t, d]) => (
                <tr key={t}><td colSpan={2} style={{ width: '42mm', fontWeight: 600, color: '#B97A5B' }}>{t}</td><td>{d}</td></tr>
              ))}
              {(Object.keys(PRIORITY) as Priority[]).map((p) => (
                <tr key={p}><td colSpan={2}><Prio p={p} /></td><td>{PRIORITY[p].definition}</td></tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '8pt', color: '#68725E', marginTop: '4mm' }}>Méthode : observer · qualifier · rechercher les causes · préconiser · prioriser. Parcours d’inspection de l’extérieur vers l’intérieur et du bas vers le haut.</p>
        </P>
      );

    case 'objet':
      return (
        <P>
          {meta.objetMission && <Para text={meta.objetMission} />}
          {meta.perimetre && <p><b>Périmètre :</b> {phrasePerimetre(meta.perimetre)}</p>}
          <KV rows={[
            ['Adresse du bien', [meta.bien.adresse, meta.bien.codePostal, meta.bien.commune].filter(Boolean).join(' ')],
            ['Références cadastrales', meta.bien.cadastre],
            ['Document d’urbanisme', meta.bien.plu],
            ['Visites', (dossier.visites ?? []).length ? dossier.visites!.map((v) => `${v.libelle} : ${fmtDate(v.date)}`).join(' ; ') : (meta.dateVisite ? fmtDate(meta.dateVisite) : undefined)],
            ['Personnes présentes', meta.personnesPresentes],
            ['Conditions d’accès', meta.conditionsAcces],
            ['Conditions météorologiques', meta.meteo],
            ['Parties non visitées', meta.limitesVisite],
          ]} />
          <div className="boxed" style={{ marginTop: '6mm', background: '#FBF9F5' }}>
            <div className="eyebrow" style={{ marginBottom: '1.5mm' }}>Périmètre d’intervention</div>
            <p style={{ margin: 0, fontSize: '8.5pt' }}>{LEGAL_RESERVES}</p>
          </div>
        </P>
      );

    case 'lieu':
      if (dossier.type === 'avis') {
        return (
          <P>
            <KV rows={[['Datation estimée', contexte.datation], ['Typologie', contexte.typologie], ['Références cadastrales', meta.bien.cadastre], ['Urbanisme et protection', meta.bien.plu]]} />
            {contexte.historique && <><h3>Historique</h3><Para text={contexte.historique} /></>}
            {contexte.vues.length > 0 && (
              <>
                <h3>Plans historiques et situation</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm' }}>
                  {contexte.vues.map((v, i) => <div key={i} className="keep"><Pic photo={v} label={v.legende ? '' : `Plan ${i + 1}`} /></div>)}
                </div>
              </>
            )}
          </P>
        );
      }
      return (
        <P>
          <KV rows={[
            ['Datation estimée', contexte.datation],
            ['Typologie', contexte.typologie],
            ['Système constructif', contexte.systemeConstructif],
            ['Matériaux dominants', contexte.materiaux],
            ['Contexte parcellaire', [meta.bien.cadastre, meta.bien.plu].filter(Boolean).join(' — ')],
          ]} />
          {contexte.historique && <><h3>Historique et modifications connues</h3><Para text={contexte.historique} /></>}
          {contexte.risques && <><h3>Risques naturels et technologiques</h3><Para text={contexte.risques} /></>}
          {contexte.vues.length > 0 && (
            <>
              <h3>Plans et cartes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm' }}>
                {contexte.vues.map((v, i) => <div key={i} className="keep"><Pic photo={v} label={v.legende ? '' : `Vue ${i + 1}`} /></div>)}
              </div>
              {contexte.vues.some((v) => /geopf|ign/.test(v.src)) && <p style={{ fontSize: '7pt', color: '#68725E', marginTop: '2mm' }}>Sources : IGN, Géoplateforme (cadastre, cartes anciennes, photographies aériennes). Le bâtiment est au centre des vues.</p>}
            </>
          )}
        </P>
      );

    case 'contexte':
      return (
        <P>
          <KV rows={[
            ['Adresse', [meta.bien.adresse, meta.bien.codePostal, meta.bien.commune].filter(Boolean).join(' ')],
            ['Cadastre', meta.bien.cadastre],
            ['Datation estimée', contexte.datation],
            ['Typologie', contexte.typologie],
            ['Système constructif', contexte.systemeConstructif],
            ['Matériaux', contexte.materiaux],
          ]} />
          {contexte.historique && <><h3>Historique des modifications structurelles</h3><Para text={contexte.historique} /></>}
          {contexte.geotechnique && <><h3>Contexte géotechnique</h3><Para text={contexte.geotechnique} /></>}
          {contexte.abords && <><h3>Abords & gestion des eaux</h3><Para text={contexte.abords} /></>}
        </P>
      );

    case 'souhaits':
      return (
        <P>
          <table>
            <thead><tr><th>Rubrique</th><th>Besoin exprimé</th><th>Importance</th></tr></thead>
            <tbody>{dossier.souhaits.map((s) => (
              <tr key={s.id}><td style={{ fontWeight: 600 }}>{s.rubrique}</td><td>{s.besoin}</td><td style={{ textTransform: 'capitalize' }}>{s.importance === 'souhaite' ? 'Souhaité' : s.importance}</td></tr>
            ))}</tbody>
          </table>
        </P>
      );

    case 'zones':
      return (
        <P>
          {(dossier.plansZones ?? []).filter((pl) => pl.image || pl.formes?.length).map((pl) => (
            <div key={pl.id} className="keep" style={{ marginBottom: '5mm' }}>
              {pl.titre && <h3 style={{ marginTop: 0 }}>{pl.titre}</h3>}
              <PlanReperes plan={pl} zones={dossier.zones} />
            </div>
          ))}
          <p>La codification ci-dessous est conservée à l’identique dans les fiches désordres, la synthèse et l’index photographique.</p>
          <table>
            <thead><tr><th>Code</th><th>Zone</th><th>Catégorie</th><th className="num">Désordres</th></tr></thead>
            <tbody>{dossier.zones.map((z) => (
              <tr key={z.code}><td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{z.code}</td><td>{z.nom}</td><td>{ZONE_CATEGORIES[z.categorie]}</td><td className="num">{dossier.desordres.filter((d) => d.zoneCode === z.code).length}</td></tr>
            ))}</tbody>
          </table>
        </P>
      );

    case 'exterieur':
      return (
        <P>
          {contexte.abords ? <Para text={contexte.abords} /> : <p style={{ color: '#68725E' }}>Relief, abords, terrain et gestion des eaux pluviales.</p>}
          {contexte.geotechnique && <><h3>Contexte géologique</h3><Para text={contexte.geotechnique} /></>}
          {dossier.zones.filter((z) => z.observations.trim()).length > 0 && (
            <>
              <h3>Observations générales par zone</h3>
              <table><tbody>{dossier.zones.filter((z) => z.observations.trim()).map((z) => (
                <tr key={z.code}><td style={{ width: '32mm', fontWeight: 600 }}>{z.code}<br /><span style={{ fontWeight: 400, color: '#68725E' }}>{z.nom}</span></td><td>{z.observations}</td></tr>
              ))}</tbody></table>
            </>
          )}
        </P>
      );

    case 'fiches':
      return (
        <>
          <P>
            <p>{desordres.length} désordre{desordres.length > 1 ? 's' : ''} relevé{desordres.length > 1 ? 's' : ''}, présenté{desordres.length > 1 ? 's' : ''} zone par zone, du moins urgent au plus urgent. Chaque fiche présente le constat et l’analyse ; les préconisations sont regroupées {nPrecos > 0 ? `dans la partie ${nPrecos}` : 'plus loin'}, avec les zones où elles s’appliquent.</p>
            <MiniIndex desordres={desordres} zoneName={zoneName} />
          </P>
          {desordres.map((d) => (
            <Page key={d.id} dossier={dossier} section={`Fiche ${d.numero}`} anchor={d.id}>
              <FicheReport d={d} zone={zoneName(d.zoneCode)} mode={modeFiche} />
            </Page>
          ))}
        </>
      );

    case 'constatsZones':
      return (
        <>
          <P>
            {dossier.zones.map((z) => {
              const list = desordres.filter((d) => d.zoneCode === z.code);
              if (!z.observations.trim() && !list.length) return null;
              return (
                <div key={z.code} className="keep" style={{ marginBottom: '5mm' }}>
                  <h3 style={{ marginTop: 0 }}>{z.code} — {z.nom}</h3>
                  {z.observations && <p>{z.observations}</p>}
                  {list.length > 0 && <p style={{ fontSize: '8.5pt', color: '#68725E' }}>Désordres : {list.map((d) => `${d.numero} (${d.type.toLowerCase()})`).join(', ')}</p>}
                </div>
              );
            })}
          </P>
          {desordres.map((d) => (
            <Page key={d.id} dossier={dossier} section={`Fiche ${d.numero}`} anchor={d.id}><FicheReport d={d} zone={zoneName(d.zoneCode)} mode={modeFiche} /></Page>
          ))}
        </>
      );

    case 'causes':
      return (
        <P>
          <table>
            <thead><tr><th>Numéro</th><th>Désordre</th><th>Cause probable</th><th>Confiance</th></tr></thead>
            <tbody>{desordres.map((d) => (
              <tr key={d.id} className="keep" data-desordre={d.id}><td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{d.numero}</td><td>{d.type}<br /><span style={{ color: '#68725E' }}>{d.zoneCode}</span></td><td><Analyse d={d} /></td><td>{CONFIDENCE_LABEL[d.confiance]}</td></tr>
            ))}</tbody>
          </table>
        </P>
      );

    case 'mesures': {
      const p1 = desordres.filter((d) => d.priorite === 'P1');
      const cats = Object.keys(MESURE_CATEGORIES) as MesureCategorie[];
      return (
        <P>
          {dossier.mesures.length === 0 && p1.length === 0 && <p>Aucune mesure conservatoire immédiate n’apparaît nécessaire au vu des constats.</p>}
          {cats.map((c) => {
            const list = dossier.mesures.filter((m) => m.categorie === c);
            if (!list.length) return null;
            return (
              <div key={c} className="keep">
                <h3>{MESURE_CATEGORIES[c]}</h3>
                <table>
                  <thead><tr><th>Localisation</th><th>Prescription</th><th className="num">Délai</th></tr></thead>
                  <tbody>{list.map((m) => <tr key={m.id}><td style={{ width: '38mm' }}>{m.localisation}</td><td>{m.description}</td><td className="num">{m.delai}</td></tr>)}</tbody>
                </table>
              </div>
            );
          })}
          {p1.length > 0 && (
            <>
              <h3>Désordres classés P1</h3>
              <table><tbody>{p1.map((d) => <tr key={d.id}><td style={{ width: '16mm', fontWeight: 600 }}>{d.numero}</td><td>{precoOf(d) || d.type}</td></tr>)}</tbody></table>
            </>
          )}
        </P>
      );
    }

    case 'investigations':
      return (
        <P>
          <table>
            <thead><tr><th>Numéro</th><th>Investigation recommandée</th></tr></thead>
            <tbody>{desordres.filter((d) => d.investigations.trim()).map((d) => (
              <tr key={d.id}><td style={{ width: '16mm', fontWeight: 600 }}>{d.numero}</td><td>{d.investigations}</td></tr>
            ))}</tbody>
          </table>
          <p style={{ fontSize: '8pt', color: '#68725E', marginTop: '4mm' }}>Aucune conclusion définitive ne peut être tirée sur ces points avant réalisation des investigations.</p>
        </P>
      );

    case 'tiers':
      return <P>{dossier.avisTiers ? <Para text={dossier.avisTiers} /> : <p style={{ color: '#68725E' }}>Sans objet à la date de la visite.</p>}</P>;

    case 'synthese':
      if (dossier.type === 'diagnostic') {
        return (
          <P>
            <table>
              <thead><tr><th>Numéro</th><th>Localisation</th><th>Désordre</th><th>Lot</th><th>Priorité</th></tr></thead>
              <tbody>{desordres.map((d) => (
                <tr key={d.id} className="keep"><td style={{ fontWeight: 600 }}>{d.numero}</td><td>{d.zoneCode} {zoneName(d.zoneCode)}</td><td>{d.type}</td><td>{lotsDe(d).join(', ') || '—'}</td><td><Prio p={d.priorite} /></td></tr>
              ))}</tbody>
            </table>
          </P>
        );
      }
      return <P><SynthesisTable dossier={dossier} variant="report" part="matrix" /></P>;

    case 'syntheseRedigee':
      return <P><Narrative blocks={buildSynthesis(dossier, { budget: dossier.type === 'conseil', etapes: dossier.type === 'conseil' })} /></P>;

    case 'desordresListe':
      return (
        <P>
          <p>{desordres.length} désordre{desordres.length > 1 ? 's' : ''} visible{desordres.length > 1 ? 's' : ''} relevé{desordres.length > 1 ? 's' : ''} lors de la visite, présenté{desordres.length > 1 ? 's' : ''} zone par zone, du moins urgent au plus urgent. Ce relevé se veut exhaustif sur les parties visitées ; il ne détaille pas l’analyse de chaque désordre, qui relève d’un diagnostic.</p>
          <table>
            <thead><tr><th>Numéro</th><th>Photo</th><th>Localisation</th><th>Désordre observé</th><th>Gravité</th></tr></thead>
            <tbody>{desordres.map((d) => {
              const ph = d.photoEnsemble ?? d.photoDetail;
              return (
                <tr key={d.id} className="keep" data-desordre={d.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{d.numero}</td>
                  <td style={{ width: '24mm' }}>{ph
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={ph.src} alt="" style={{ width: '22mm', height: '16mm', objectFit: 'cover', borderRadius: '0.8mm' }} /> : null}</td>
                  <td>{d.zoneCode}<br /><span style={{ color: '#68725E' }}>{zoneName(d.zoneCode)}</span></td>
                  <td><b>{d.type}</b>{d.element ? ` — ${d.element.toLowerCase()}` : ''}{d.constat ? <><br /><span style={{ fontSize: '8.3pt' }}>{d.constat.split(/(?<=[.!?])\s/)[0]}</span></> : null}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><Prio p={d.priorite} /></td>
                </tr>
              );
            })}</tbody>
          </table>
        </P>
      );

    case 'vigilance':
      return (
        <P>
          <p>Points à garder en tête, que vous engagiez des travaux ou non :</p>
          <div style={{ display: 'grid', gap: '2.5mm' }}>
            {(dossier.vigilance ?? []).map((v, i) => (
              <div key={v.id} className="keep" style={{ display: 'grid', gridTemplateColumns: '8mm 1fr', gap: '3mm', padding: '3mm', border: '0.5pt solid #D6C7AF', borderLeft: '2.5pt solid #B97A5B', borderRadius: '1mm' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16pt', color: '#B97A5B', lineHeight: 1 }}>{i + 1}</div>
                <div>{v.localisation && <div className="eyebrow" style={{ marginBottom: '0.8mm' }}>{v.localisation}</div>}{v.texte}</div>
              </div>
            ))}
          </div>
        </P>
      );

    case 'etudes':
      return (
        <P>
          <p>L’avis sanitaire ne permet pas de conclure sur les points suivants. Nous recommandons les études ci-dessous avant tout engagement de travaux importants :</p>
          <table>
            <thead><tr><th>Étude</th><th>Objet</th><th>Intervenant pressenti</th></tr></thead>
            <tbody>{(dossier.etudes ?? []).map((e) => <tr key={e.id} className="keep"><td style={{ fontWeight: 600 }}>{e.nature}</td><td>{e.objet}</td><td>{e.intervenant || '—'}</td></tr>)}</tbody>
          </table>
        </P>
      );

    case 'precos':
      return (
        <P>
          <p>Les préconisations sont regroupées lorsqu’une même intervention répond à plusieurs désordres. Pour chacune, le tableau indique les zones et les désordres où elle est nécessaire{dossier.type !== 'diagnostic' ? ', avec une estimation' : ''}. Elles sont regroupées par critère d’urgence : urgent, à court terme, à moyen terme.</p>
          {precos.map((g, gi) => (
            <div key={g.n} style={{ marginBottom: '6mm' }}>
              {(gi === 0 || precos[gi - 1].priorite !== g.priorite) && (
                <h3 className="keep" style={{ color: PRIORITY[g.priorite].color, borderBottom: `1pt solid ${PRIORITY[g.priorite].color}`, paddingBottom: '1mm', marginTop: gi ? '8mm' : '4mm' }}>{PRIORITY[g.priorite].label}</h3>
              )}
              <div className="keep" style={{ display: 'flex', justifyContent: 'space-between', gap: '3mm', alignItems: 'baseline', borderBottom: '0.5pt solid #334B3D', paddingBottom: '1.5mm', marginBottom: '2mm' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '14pt', fontWeight: 600, color: '#334B3D', lineHeight: 1.15 }}>
                  <span style={{ color: '#B97A5B', marginRight: '2mm' }}>{g.n}.</span>{g.titre}
                </div>
                <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}><Prio p={g.priorite} /></span>
              </div>
              <div className="keep">
                {g.solutions ? <Solutions d={{ ...g.desordres[0], solutions: g.solutions }} /> : <Para text={g.texte} />}
                {g.lots.length > 0 && <p style={{ fontSize: '8pt', color: '#68725E', margin: '1.5mm 0 0' }}>{g.lots.length > 1 ? 'Corps d’état' : 'Corps de métier'} : {g.lots.join(', ')}</p>}
              </div>
              <table className="keep" style={{ marginTop: '2.5mm' }}>
                <thead><tr><th>Zone</th><th>Désordre</th><th>Priorité</th>{dossier.type !== 'diagnostic' && <><th className="num">Quantité</th><th className="num">Estimation hors taxes</th></>}</tr></thead>
                <tbody>
                  {g.desordres.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.zoneCode} <span style={{ fontWeight: 400 }}>{zoneName(d.zoneCode)}</span></td>
                      <td>{d.numero} — {d.type}</td>
                      <td><Prio p={d.priorite} /></td>
                      {dossier.type !== 'diagnostic' && <>
                        <td className="num">{d.chiffrage.quantite != null ? `${d.chiffrage.quantite.toLocaleString('fr-FR')} ${d.chiffrage.unite}` : d.chiffrage.unite || '—'}</td>
                        <td className="num">{d.chiffrage.bas != null || d.chiffrage.haut != null ? fmtRange({ bas: d.chiffrage.bas ?? 0, haut: d.chiffrage.haut ?? d.chiffrage.bas ?? 0 }) : '—'}</td>
                      </>}
                    </tr>
                  ))}
                  {dossier.type !== 'diagnostic' && g.desordres.length > 1 && (g.bas != null || g.haut != null) && (
                    <tr><td colSpan={4} style={{ fontWeight: 600, textAlign: 'right' }}>Total pour cette préconisation ({g.zones.length} zone{g.zones.length > 1 ? 's' : ''})</td><td className="num" style={{ fontWeight: 600 }}>{fmtRange({ bas: g.bas ?? 0, haut: g.haut ?? g.bas ?? 0 })}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
          <p className="keep" style={{ fontSize: '8.4pt', color: '#4a4a4a', marginTop: '4mm' }}><b>Nota :</b> ces préconisations sont données à titre indicatif en fonction des désordres relevés sur site ; prévoir la réalisation d’une étude de conception avant la réalisation des renforcements définitifs.</p>
        </P>
      );

    case 'preconisationsDiag':
      return (
        <P>
          <p>Pour chaque désordre, plusieurs solutions sont possibles. Elles sont présentées ci-dessous avec, le cas échéant, celle que nous recommandons au vu de l’état du bâtiment. Ce sont des principes de réparation, à préciser avec les entreprises.</p>
          {desordres.filter((d) => (d.solutions ?? []).length || d.preconisation.trim()).map((d) => (
            <div key={d.id} className="keep" style={{ marginBottom: '4mm', paddingBottom: '3mm', borderBottom: '0.5pt solid #D6C7AF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '3mm', alignItems: 'baseline' }}>
                <div style={{ fontWeight: 600, color: '#334B3D' }}>{d.numero} — {d.type} <span style={{ fontWeight: 400, color: '#68725E' }}>({d.zoneCode} {zoneName(d.zoneCode)})</span></div>
                <Prio p={d.priorite} />
              </div>
              <Solutions d={d} />
            </div>
          ))}
        </P>
      );

    case 'guides':
      return (
        <>
          <P>
            <p>Ces fiches rassemblent les bons gestes pour entretenir les matériaux de votre bâtiment. Gardez-les à portée de main : elles servent aussi à dialoguer avec les entreprises.</p>
            <ul style={{ paddingLeft: '5mm' }}>{guides.filter((g) => dossier.guides?.includes(g.id)).map((g) => <li key={g.id}>{g.titre}</li>)}</ul>
          </P>
          {guides.filter((g) => dossier.guides?.includes(g.id)).map((g) => (
            <Page key={g.id} dossier={dossier} section="Guide de bonnes pratiques"><GuidePage g={g} /></Page>
          ))}
        </>
      );

    case 'consultation': {
      const c = dossier.consultation ?? { lots: [], offres: [], analyse: '' };
      return (
        <P>
          <p>Le programme de travaux a été découpé en lots, chacun confié à un corps de métier. Les entreprises ci-dessous ont été consultées sur la base du diagnostic et des préconisations compatibles avec le bâti ancien.</p>
          <table>
            <thead><tr><th>Lot</th><th>Contenu</th><th className="num">Estimation hors taxes</th><th>Entreprises consultées</th></tr></thead>
            <tbody>{c.lots.map((l) => (
              <tr key={l.id} className="keep">
                <td style={{ fontWeight: 600 }}>{l.lot}</td>
                <td>{l.description}</td>
                <td className="num">{l.estimationHaut ? fmtRange({ bas: l.estimationBas ?? l.estimationHaut, haut: l.estimationHaut }) : '—'}</td>
                <td>{c.offres.filter((o) => o.lotId === l.id).map((o) => o.entreprise).filter(Boolean).join(', ') || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
          <p style={{ fontSize: '8pt', color: '#68725E', marginTop: '4mm' }}>{LEGAL_ACCOMPAGNEMENT}</p>
        </P>
      );
    }

    case 'comparatif': {
      const c = dossier.consultation ?? { lots: [], offres: [], analyse: '' };
      const retenues = c.offres.filter((o) => o.retenue && o.montantHT);
      const totalHT = retenues.reduce((a, o) => a + (o.montantHT ?? 0), 0);
      return (
        <P>
          {c.lots.map((l) => {
            const offres = c.offres.filter((o) => o.lotId === l.id);
            const ref = l.estimationHaut ? ((l.estimationBas ?? l.estimationHaut) + l.estimationHaut) / 2 : 0;
            if (!offres.length) return null;
            return (
              <div key={l.id} className="keep" style={{ marginBottom: '5mm' }}>
                <h3 style={{ marginTop: 0 }}>{l.lot}</h3>
                <table>
                  <thead><tr><th>Entreprise</th><th>Date du devis</th><th className="num">Montant hors taxes</th><th className="num">Écart à l’estimation</th><th>Délai</th><th>Exclusions et réserves</th><th>Choix</th></tr></thead>
                  <tbody>{offres.map((o) => (
                    <tr key={o.id} style={o.retenue ? { background: '#F1F2EE' } : undefined}>
                      <td style={{ fontWeight: 600 }}>{o.entreprise || '—'}</td>
                      <td>{o.dateDevis ? fmtDate(o.dateDevis) : '—'}</td>
                      <td className="num">{o.montantHT != null ? fmtRange({ bas: o.montantHT, haut: o.montantHT }) : '—'}</td>
                      <td className="num">{ref && o.montantHT ? `${o.montantHT >= ref ? '+' : ''}${Math.round(((o.montantHT - ref) / ref) * 100)} %` : '—'}</td>
                      <td>{o.delai || '—'}</td>
                      <td>{[o.exclusions, o.observations].filter(Boolean).join(' — ') || '—'}</td>
                      <td style={{ color: o.retenue ? '#334B3D' : '#9AA093', fontWeight: o.retenue ? 600 : 400 }}>{o.retenue ? 'Retenue' : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            );
          })}
          {retenues.length > 0 && (
            <div className="boxed keep" style={{ marginTop: '4mm' }}>
              <div className="eyebrow" style={{ marginBottom: '1mm' }}>Offres retenues</div>
              <p style={{ margin: 0 }}>Montant total des offres retenues : <b>{fmtRange({ bas: totalHT, haut: totalHT })} hors taxes</b>, soit {fmtRange({ bas: totalHT * (1 + dossier.finances.tvaPct / 100), haut: totalHT * (1 + dossier.finances.tvaPct / 100) })} toutes taxes comprises (taxe sur la valeur ajoutée à {dossier.finances.tvaPct.toLocaleString('fr-FR')} %).</p>
            </div>
          )}
          {c.analyse && <><h3>Analyse et recommandation</h3><Para text={c.analyse} /></>}
        </P>
      );
    }

    case 'reportage': {
      const groupes = reportage(dossier).filter((g) => g.photos.length);
      const total = groupes.reduce((a, g) => a + g.photos.length, 0);
      let n = 0;
      return (
        <P>
          <p>L’ensemble des {total} photographies prises lors {(dossier.visites?.length ?? 0) > 1 ? 'des visites' : 'de la visite'}, classées par zone selon le parcours d’inspection. La légende indique le ou les désordres qu’elles illustrent.</p>
          {groupes.map((g) => (
            <div key={g.cle} style={{ marginBottom: '6mm' }}>
              <h3 className="keep">{g.titre}</h3>
              {g.observations && <p>{g.observations}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3mm' }}>
                {g.photos.map(({ photo, desordres: ds }) => {
                  n += 1;
                  return <div key={photo.id ?? n} className="keep"><Pic photo={photo} label={`Photo ${n}${ds.length ? ` — ${ds.join(', ')}` : g.cle === 'non-classees' ? '' : ' — vue générale'}`} /></div>;
                })}
              </div>
            </div>
          ))}
        </P>
      );
    }

    case 'feuille':
      return (
        <P>
          <p>Le traitement suit une chronologie stricte : on stoppe d’abord les apports d’eau, puis on laisse sécher le bâti avant toute reprise structurelle et toute finition.</p>
          {roadmap(desordres).map((ph) => (
            <div key={ph.phase} className="keep" style={{ display: 'grid', gridTemplateColumns: '9mm 1fr', gap: '3mm', padding: '3mm 0', borderBottom: '0.5pt solid #D6C7AF' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18pt', color: '#B97A5B', lineHeight: 1 }}>{ph.phase}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{ph.titre}</div>
                <div style={{ fontSize: '8pt', color: '#68725E' }}>{ph.detail}</div>
                {ph.items.length > 0 && (
                  <ul style={{ margin: '1.5mm 0 0', paddingLeft: '4mm' }}>
                    {ph.items.map((d) => <li key={d.id}><b>{d.numero}</b> — {d.preconisation.split(/(?<=\.)\s/)[0] || d.type}</li>)}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </P>
      );

    case 'planning':
      return <P><Gantt dossier={dossier} /></P>;

    case 'scenarios':
      return <P><SynthesisTable dossier={dossier} variant="report" part="scenarios" /></P>;

    case 'conclusion':
      return (
        <P>
          {dossier.conclusion.bilan && <div className="boxed keep" style={{ background: '#F1F2EE', borderColor: '#68725E', marginBottom: '4mm' }}><div className="eyebrow" style={{ marginBottom: '1.5mm' }}>Notre avis</div><Para text={dossier.conclusion.bilan} /></div>}
          <Narrative blocks={buildSynthesis({ ...dossier, conclusion: { ...dossier.conclusion, bilan: '' } }, { budget: false, etapes: false }).filter((b) => ['Ce qu’il faut retenir', 'Ce qui doit être fait rapidement'].includes(b.titre))} />
          {dossier.conclusion.conclusion && <><h3>Le mot de l’expert</h3><Para text={dossier.conclusion.conclusion} /></>}
        </P>
      );

    case 'preconisations': {
      const groups: [string, Priority][] = [['Urgent', 'P1'], ['Court terme', 'P2'], ['Moyen terme / surveillance', 'P3']];
      return (
        <P>
          {dossier.conclusion.bilan && <><h3 style={{ marginTop: 0 }}>Bilan structurel</h3><Para text={dossier.conclusion.bilan} /></>}
          {dossier.conclusion.conclusion && <><h3>Conclusion</h3><Para text={dossier.conclusion.conclusion} /></>}
          {groups.map(([label, p]) => {
            const list = desordres.filter((d) => d.priorite === p);
            if (!list.length) return null;
            return (
              <div key={p} className="keep">
                <h3>{label}</h3>
                <table><tbody>{list.map((d) => <tr key={d.id}><td style={{ width: '16mm', fontWeight: 600 }}>{d.numero}</td><td>{precoOf(d) || '—'}</td></tr>)}</tbody></table>
              </div>
            );
          })}
        </P>
      );
    }

    case 'annuaire':
      return (
        <P>
          <table>
            <thead><tr><th>Lot</th><th>Entreprise</th><th>Commune</th><th>Contact</th></tr></thead>
            <tbody>{dossier.annuaire.map((e) => <tr key={e.id}><td>{e.lot}</td><td style={{ fontWeight: 600 }}>{e.nom}</td><td>{e.ville}</td><td>{e.contact}</td></tr>)}</tbody>
          </table>
          <p style={{ fontSize: '8pt', color: '#68725E', marginTop: '4mm' }}>{NEUTRALITE_ANNUAIRE}</p>
        </P>
      );

    case 'accompagnement':
      return (
        <P>
          <p>Pour passer du diagnostic aux travaux, L’Atelier de l’Existant peut vous accompagner dans la consultation des entreprises :</p>
          <ul style={{ paddingLeft: '5mm' }}>
            <li>préparation du dossier de consultation à partir des fiches désordres ;</li>
            <li>organisation des visites des entreprises sur site ;</li>
            <li>analyse comparative des devis et de leurs exclusions ;</li>
            <li>aide au choix et suivi du planning.</li>
          </ul>
          <div className="boxed" style={{ marginTop: '5mm' }}>
            <div className="eyebrow" style={{ marginBottom: '1mm' }}>Accompagnement</div>
            <p style={{ margin: 0 }}>Forfait par étape, ou 2 à 5 % du montant hors taxes des travaux (minimum 600 à 1 500 € hors taxes), sur devis.</p>
          </div>
          <p style={{ fontSize: '8pt', color: '#68725E', marginTop: '4mm' }}>{LEGAL_ACCOMPAGNEMENT}</p>
        </P>
      );

    case 'limites':
      return (
        <P>
          {limitesMission(dossier.type, ent).map((l) => (
            <div key={l.titre} className="keep" style={{ marginBottom: '3mm' }}>
              <div style={{ fontWeight: 600, color: '#334B3D', fontSize: '9pt', marginBottom: '0.8mm' }}>{l.titre}</div>
              <p style={{ margin: 0, fontSize: '8.6pt' }}>{l.texte}</p>
            </div>
          ))}
          {meta.limitesVisite && <div className="boxed keep" style={{ borderColor: '#68725E' }}><div className="eyebrow" style={{ marginBottom: '1mm' }}>Parties non visitées ou non accessibles</div><p style={{ margin: 0 }}>{meta.limitesVisite}</p></div>}
          <div style={{ marginTop: '14mm', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10mm' }}>
            <div><div className="eyebrow">Établi par</div><div style={{ marginTop: '2mm' }}>{meta.intervenant || BRAND.nom}</div><div style={{ fontSize: '8pt', color: '#68725E' }}>le {fmtDate(meta.dateRapport)}</div></div>
            <div style={{ borderBottom: '0.5pt solid #D6C7AF', height: '22mm' }}><div className="eyebrow">Signature</div></div>
          </div>
        </P>
      );

    case 'annexes':
      return (
        <P>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4mm' }}>
            {desordres.flatMap((d) => [
              d.photoEnsemble && <Pic key={d.id + 'a'} photo={d.photoEnsemble} label={`${d.numero} · ${d.zoneCode} · ensemble`} />,
              d.photoDetail && <Pic key={d.id + 'b'} photo={d.photoDetail} label={`${d.numero} · ${d.zoneCode} · détail`} />,
              ...(d.autresPhotos ?? []).map((p, i) => <Pic key={d.id + 'c' + i} photo={p} label={`${d.numero} · ${d.zoneCode} · photo ${i + 3}`} />),
            ]).filter(Boolean)}
          </div>
        </P>
      );
  }
}

function MiniIndex({ desordres, zoneName }: { desordres: Desordre[]; zoneName: (c: string) => string }) {
  return (
    <table>
      <thead><tr><th>Numéro</th><th>Localisation</th><th>Type</th><th>Priorité</th></tr></thead>
      <tbody>{desordres.map((d) => (
        <tr key={d.id} data-desordre={d.id}><td style={{ fontWeight: 600 }}>{d.numero}</td><td>{d.zoneCode} {zoneName(d.zoneCode)}</td><td>{d.type}</td><td><Prio p={d.priorite} /></td></tr>
      ))}</tbody>
    </table>
  );
}

/** Analyse d'une fiche : en italique quand c'est une hypothèse à vérifier, avec ce qui reste à confirmer. */
function Analyse({ d }: { d: Desordre }) {
  const t = sansMentionVerif(d.analyse);
  if (!d.aVerifier) return t ? <Para text={t} /> : <>—</>;
  return (
    <div style={{ fontStyle: 'italic' }}>
      {t && <Para text={t} />}
      <p style={{ color: '#68725E' }}>{phraseVerif(d)}</p>
    </div>
  );
}

/** Fiche désordre — rendu livrable (module répétable D-XXX). Les préconisations n'y figurent pas : elles sont regroupées dans leur partie. */
export function FicheReport({ d, zone }: { d: Desordre; zone: string; mode?: 'conseil' | 'diagnostic' }) {
  const block = (title: string, sub: string, text: string, champ?: string, contenu?: React.ReactNode) =>
    text.trim() ? (
      <div className="keep" data-champ={champ} style={{ display: 'grid', gridTemplateColumns: '28mm 1fr', gap: '4mm', padding: '3mm 0', borderTop: '0.5pt solid #D6C7AF' }}>
        <div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, fontSize: '11.5pt', color: '#B97A5B', lineHeight: 1.1 }}>{title}</div>
          {sub && <div style={{ fontSize: '7pt', color: '#68725E', lineHeight: 1.3, marginTop: '0.5mm' }}>{sub}</div>}
        </div>
        <div>{contenu ?? <Para text={text} />}</div>
      </div>
    ) : null;
  const c = d.chiffrage;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '4mm', borderBottom: '0.5pt solid #334B3D', paddingBottom: '3mm', marginBottom: '4mm' }}>
        <div>
          <div className="eyebrow">Désordre · {d.zoneCode} {zone}</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22pt', fontWeight: 600, color: '#334B3D', lineHeight: 1.05 }}>{d.numero} — {d.type}</div>
          <div style={{ fontSize: '8.5pt', color: '#68725E' }}>Élément : {d.element}</div>
        </div>
        <Prio p={d.priorite} />
      </div>

      <PhotosFiche d={d} />
      {block('Constat', 'ce qui a été observé', d.constat, 'constat')}
      {block('Analyse', `niveau de confiance ${CONFIDENCE_LABEL[d.confiance].toLowerCase()}`, sansMentionVerif(d.analyse) || (d.aVerifier ? ' ' : ''), 'analyse', <Analyse d={d} />)}
      {block('Investigations', 'à réaliser avant travaux', d.investigations, 'investigations')}
    </div>
  );
}

/**
 * Reportage photographique complet : pour chaque zone, ses vues générales et les photos de ses désordres
 * (une photo partagée entre plusieurs désordres n'apparaît qu'une fois, avec tous ses numéros), puis les
 * photos des désordres sans zone et les photos pas encore classées.
 */
function reportage(d: Dossier): { cle: string; titre: string; observations?: string; photos: { photo: Photo; desordres: string[] }[] }[] {
  const groupes: { cle: string; titre: string; observations?: string; photos: { photo: Photo; desordres: string[] }[] }[] = [];
  const vues = new Map<string, { photo: Photo; desordres: string[] }>();
  const cle = (p: Photo) => p.id ?? p.src;
  const ajouter = (liste: { photo: Photo; desordres: string[] }[], p: Photo, num?: string) => {
    const deja = vues.get(cle(p));
    if (deja) { if (num && !deja.desordres.includes(num)) deja.desordres.push(num); return; }
    const e = { photo: p, desordres: num ? [num] : [] };
    vues.set(cle(p), e);
    liste.push(e);
  };
  const photosDe = (x: Desordre) => [x.photoEnsemble, x.photoDetail, ...(x.autresPhotos ?? [])].filter(Boolean) as Photo[];
  for (const z of d.zones) {
    const liste: { photo: Photo; desordres: string[] }[] = [];
    for (const x of sortDesordres(d.desordres.filter((y) => y.zoneCode === z.code))) photosDe(x).forEach((p) => ajouter(liste, p, x.numero));
    (z.photos ?? []).forEach((p) => ajouter(liste, p));
    groupes.push({ cle: z.code, titre: `${z.code} — ${z.nom}`, observations: z.observations, photos: liste });
  }
  const sansZone: { photo: Photo; desordres: string[] }[] = [];
  d.desordres.filter((x) => !d.zones.some((z) => z.code === x.zoneCode)).forEach((x) => photosDe(x).forEach((p) => ajouter(sansZone, p, x.numero)));
  groupes.push({ cle: 'sans-zone', titre: 'Désordres sans zone précisée', photos: sansZone });
  const bac: { photo: Photo; desordres: string[] }[] = [];
  (d.photosAClasser ?? []).forEach((p) => ajouter(bac, p));
  groupes.push({ cle: 'non-classees', titre: 'Autres photographies de la visite', photos: bac });
  return groupes;
}

/**
 * Photos d'une fiche, mises en page selon leur nombre : aucune case vide, aucune photo réduite.
 * 1 photo : pleine largeur. Nombre pair : deux par ligne. Nombre impair (≥ 3) : la vue d'ensemble
 * en pleine largeur, puis les autres deux par ligne.
 */
function PhotosFiche({ d }: { d: Desordre }) {
  const photos = [d.photoEnsemble, d.photoDetail, ...(d.autresPhotos ?? [])].filter(Boolean) as Photo[];
  if (!photos.length) return null;
  const label = (i: number) => (i === 0 ? 'Photo 1 — Vue d’ensemble' : i === 1 ? 'Photo 2 — Détail' : `Photo ${i + 1}`);
  const large = photos.length % 2 === 1;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '4mm' }}>
      {photos.map((p, i) => (
        <div key={p.id ?? i} style={{ gridColumn: large && i === 0 ? '1 / -1' : undefined, breakInside: 'avoid' }}>
          <Pic photo={p} label={label(i)} ratio={large && i === 0 ? (photos.length === 1 ? '16 / 10' : '16 / 8') : '4 / 3'} />
        </div>
      ))}
    </div>
  );
}

/** Solutions proposées pour un désordre (Diagnostic structurel). */
function Solutions({ d }: { d: Desordre }) {
  const list = d.solutions ?? [];
  if (!list.length) return <Para text={d.preconisation} />;
  return (
    <div style={{ display: 'grid', gap: '2mm', marginTop: '1.5mm' }}>
      {list.map((s, i) => (
        <div key={s.id} style={{ padding: '2mm 3mm', borderRadius: '1mm', background: s.recommandee ? '#F1F2EE' : 'transparent', border: `0.5pt solid ${s.recommandee ? '#68725E' : '#E9E0D2'}` }}>
          <div style={{ fontWeight: 600, fontSize: '9pt' }}>
            Solution {String.fromCharCode(65 + i)} — {s.titre}
            {s.recommandee && <span style={{ marginLeft: '2mm', fontFamily: 'Montserrat, sans-serif', fontSize: '6.5pt', letterSpacing: '.08em', textTransform: 'uppercase', color: '#334B3D' }}>recommandée</span>}
          </div>
          {s.texte && <div style={{ fontSize: '8.6pt', marginTop: '0.6mm' }}>{s.texte}</div>}
        </div>
      ))}
    </div>
  );
}

/** Plan de repérage avec les codes de zones placés dessus. */
export function PlanReperes({ plan, zones = [] }: { plan: import('@/lib/types').PlanZones; zones?: { code: string; nom: string }[] }) {
  if (plan.formes?.length) {
    return (
      <svg viewBox="0 0 100 70" preserveAspectRatio="none" style={{ width: '100%', aspectRatio: '10 / 7', display: 'block', border: '0.5pt solid #D6C7AF', borderRadius: '1mm', background: '#FBF9F5' }}>
        {plan.formes.map((f) => {
          const y = (f.y / 100) * 70, h = (f.h / 100) * 70;
          const nom = zones.find((z) => z.code === f.code)?.nom ?? '';
          return (
            <g key={f.id}>
              <rect x={f.x} y={y} width={f.w} height={h} fill={f.couleur} fillOpacity={0.85} stroke="#fff" strokeWidth={0.3} />
              <text x={f.x + f.w / 2} y={y + h / 2} textAnchor="middle" fontSize={2.6} fontWeight={700} fill="#2D332F" fontFamily="Montserrat, sans-serif">{f.code}</text>
              {nom && f.w > 10 && <text x={f.x + f.w / 2} y={y + h / 2 + 3.2} textAnchor="middle" fontSize={2} fill="#2D332F">{nom.length > 22 ? nom.slice(0, 21) + '…' : nom}</text>}
            </g>
          );
        })}
      </svg>
    );
  }
  if (!plan.image) return null;
  return (
    <div style={{ position: 'relative', border: '0.5pt solid #D6C7AF', borderRadius: '1mm', overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={plan.image.src} alt={plan.titre} style={{ width: '100%', display: 'block' }} />
      {plan.reperes.map((r, i) => (
        <span key={i} style={{ position: 'absolute', left: `${r.x}%`, top: `${r.y}%`, transform: 'translate(-50%, -50%)', background: '#334B3D', color: '#F8F5EF', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '7pt', padding: '0.8mm 1.6mm', borderRadius: '3mm', border: '0.6pt solid #F8F5EF', whiteSpace: 'nowrap' }}>{r.code}</span>
      ))}
    </div>
  );
}

/** Chronogramme type Gantt en semaines, à partir du planning des phases. */
function Gantt({ dossier }: { dossier: Dossier }) {
  const rows = [...dossier.planning].sort((a, b) => a.phase - b.phase);
  const total = Math.max(4, ...rows.map((r) => r.debut - 1 + r.duree));
  const ticks = Array.from({ length: Math.ceil(total / 4) + 1 }, (_, i) => i * 4).filter((t) => t <= total);
  const used = new Set(dossier.desordres.map((d) => d.phase));
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '58mm 1fr', fontSize: '8pt' }}>
        <div style={{ fontSize: '6.5pt', color: '#68725E', fontFamily: 'Montserrat, sans-serif', alignSelf: 'end', paddingBottom: '1mm' }}>Semaines</div>
        <div style={{ position: 'relative', height: '6mm', borderBottom: '0.5pt solid #68725E' }}>
          {ticks.map((t) => (
            <span key={t} style={{ position: 'absolute', left: `${(t / total) * 100}%`, transform: 'translateX(-50%)', fontSize: '6.5pt', color: '#68725E', fontFamily: 'Montserrat, sans-serif' }}>{t || 1}</span>
          ))}
        </div>
        {rows.map((r) => {
          const ph = PHASES[r.phase];
          const active = used.has(r.phase) || r.phase === 3;
          return (
            <div key={r.phase} style={{ display: 'contents' }}>
              <div style={{ padding: '2.5mm 3mm 2.5mm 0', borderBottom: '0.5pt solid #E9E0D2', color: active ? '#2D332F' : '#9AA093' }}>
                <b style={{ color: '#B97A5B' }}>{r.phase}.</b> {ph.titre}
              </div>
              <div style={{ position: 'relative', borderBottom: '0.5pt solid #E9E0D2' }}>
                {ticks.map((t) => <span key={t} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(t / total) * 100}%`, borderLeft: '0.5pt dotted #D6C7AF' }} />)}
                <span style={{
                  position: 'absolute', top: '28%', height: '44%', borderRadius: '1mm',
                  left: `${((r.debut - 1) / total) * 100}%`, width: `${(r.duree / total) * 100}%`,
                  background: r.phase === 3 ? 'repeating-linear-gradient(45deg,#E9E0D2 0 2px,#fff 2px 5px)' : active ? '#68725E' : '#E1E4DB',
                  border: r.phase === 3 ? '0.5pt solid #D6C7AF' : 'none',
                }} />
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: '8pt', color: '#68725E', marginTop: '4mm' }}>
        Durées indicatives en semaines. L’étape de séchage et d’observation conditionne la suite : sa durée réelle dépend de la saison et des mesures d’humidité.
      </p>
    </>
  );
}

/** Rendu de la synthèse rédigée : encadrés, cartes et listes pour une lecture agréable. */
function Narrative({ blocks }: { blocks: Block[] }) {
  const cap = (t: string) => t.replace(/^./, (c) => c.toUpperCase());
  const List = ({ items, mark, color }: { items: string[]; mark?: string; color?: string }) => (
    <ul style={{ listStyle: mark ? 'none' : undefined, margin: '0 0 2.5mm', paddingLeft: mark ? 0 : '5mm' }}>
      {items.map((t, i) => (
        <li key={i} style={{ marginBottom: '1.2mm', display: mark ? 'flex' : undefined, gap: '2mm' }}>
          {mark && <span style={{ color, fontWeight: 700, flex: 'none' }}>{mark}</span>}<span>{cap(t)}</span>
        </li>
      ))}
    </ul>
  );
  const Title = ({ b }: { b: Block }) => <h3 className="keep" style={{ marginTop: '6mm' }}>{b.titre}</h3>;
  const Paras = ({ b }: { b: Block }) => <>{b.paragraphes.map((t, i) => <p key={i}>{t}</p>)}</>;

  const render = (b: Block) => {
    switch (b.style) {
      case 'retenir':
        return (
          <div key={b.titre} style={{ marginBottom: '6mm' }}>
            {b.chiffres && (
              <div className="keep" style={{ display: 'grid', gridTemplateColumns: `repeat(${b.chiffres.length}, 1fr)`, gap: '3mm', marginBottom: '4mm' }}>
                {b.chiffres.map((c) => (
                  <div key={c.libelle} style={{ background: '#F1F2EE', borderRadius: '1.5mm', padding: '3mm' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: c.valeur.length > 6 ? '13pt' : '22pt', fontWeight: 600, color: '#334B3D', lineHeight: 1.05 }}>{c.valeur}</div>
                    <div style={{ fontSize: '7.5pt', color: '#68725E', marginTop: '0.8mm' }}>{c.libelle}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="boxed" style={{ background: '#FBF9F5', borderColor: '#D6C7AF' }}>
              <div className="eyebrow" style={{ color: '#B97A5B', marginBottom: '1.5mm' }}>{b.titre}</div>
              {b.paragraphes.map((t, i) => <p key={i} style={i === b.paragraphes.length - 1 ? { marginBottom: 0 } : undefined}>{t}</p>)}
            </div>
          </div>
        );
      case 'cartes':
        return (
          <div key={b.titre}>
            <Title b={b} /><Paras b={b} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm' }}>
              {b.sous?.map((x) => (
                <div key={x.titre} className="keep" style={{ border: '0.5pt solid #D6C7AF', borderTop: '2pt solid #68725E', borderRadius: '1mm', padding: '3mm' }}>
                  <div style={{ fontWeight: 600, color: '#334B3D', marginBottom: '1.5mm' }}>{x.titre}</div>
                  {x.paragraphes.map((t, i) => <p key={i} style={{ fontSize: '8.4pt' }}>{t}</p>)}
                  {x.puces && <List items={x.puces} />}
                </div>
              ))}
            </div>
          </div>
        );
      case 'urgent':
        return (
          <div key={b.titre} className="keep" style={{ margin: '6mm 0 3mm', padding: '3.5mm 4mm', borderLeft: '3pt solid #A8432F', background: '#FBF1EE', borderRadius: '0 1.5mm 1.5mm 0' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '14pt', fontWeight: 600, color: '#A8432F', marginBottom: '1.5mm' }}>{b.titre}</div>
            <Paras b={b} />
            {b.puces && b.puces.length > 0 && <List items={b.puces} mark="!" color="#A8432F" />}
          </div>
        );
      case 'etapes':
        return (
          <div key={b.titre}>
            <Title b={b} /><Paras b={b} />
            {b.sous?.map((x, i) => (
              <div key={x.titre} className="keep" style={{ display: 'grid', gridTemplateColumns: '10mm 1fr', gap: '3mm', padding: '3mm 0', borderBottom: '0.5pt solid #E9E0D2' }}>
                <div style={{ width: '8mm', height: '8mm', borderRadius: '50%', background: '#334B3D', color: '#F8F5EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '13pt', fontWeight: 600 }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#334B3D' }}>{x.titre.replace(/^Étape \d+ — /, '')}</div>
                  {x.paragraphes.map((t, j) => <p key={j} style={{ fontSize: j ? '8pt' : undefined, color: j ? '#68725E' : undefined, margin: '1mm 0' }}>{t}</p>)}
                  {x.puces && x.puces.length > 0 && <List items={x.puces} />}
                </div>
              </div>
            ))}
          </div>
        );
      case 'priorites': {
        const colors = ['#A8432F', '#B97A5B', '#68725E'];
        return (
          <div key={b.titre}>
            <Title b={b} /><Paras b={b} />
            {b.sous?.map((x, i) => (
              <div key={x.titre} className="keep" style={{ borderLeft: `3pt solid ${colors[i] ?? '#68725E'}`, padding: '1mm 0 1mm 4mm', margin: '3mm 0' }}>
                <div style={{ fontWeight: 600, color: colors[i] }}>{x.titre}</div>
                {x.paragraphes.map((t, j) => <p key={j} style={{ fontSize: '8pt', color: '#68725E', margin: '0.5mm 0 1.5mm' }}>{t}</p>)}
                {x.puces && <List items={x.puces} />}
              </div>
            ))}
          </div>
        );
      }
      case 'eviter':
      case 'entretien':
      case 'avant':
      case 'objectifs': {
        const conf = { eviter: ['✗', '#A8432F', '#FBF1EE'], entretien: ['✓', '#4E7A55', '#F1F2EE'], avant: ['→', '#B97A5B', '#FBF9F5'], objectifs: ['•', '#334B3D', '#FBF9F5'] }[b.style];
        return (
          <div key={b.titre} className="keep" style={{ marginTop: '6mm' }}>
            <h3 style={{ marginTop: 0 }}>{b.titre}</h3>
            <div style={{ background: conf[2], borderRadius: '1.5mm', padding: '3mm 4mm' }}>
              <Paras b={b} />
              {b.puces && <List items={b.puces} mark={conf[0]} color={conf[1]} />}
              {b.apres?.map((t, i) => <p key={i} style={{ fontStyle: 'italic', color: '#334B3D', marginBottom: 0 }}>{t}</p>)}
            </div>
          </div>
        );
      }
      case 'budget':
        return (
          <div key={b.titre} className="keep">
            <Title b={b} />
            <div className="boxed" style={{ borderColor: '#C9A15A' }}><Paras b={b} /></div>
          </div>
        );
      case 'citation':
        return (
          <div key={b.titre} className="keep" style={{ marginTop: '7mm', padding: '4mm 6mm', borderTop: '0.5pt solid #D6C7AF', borderBottom: '0.5pt solid #D6C7AF' }}>
            <div className="eyebrow" style={{ marginBottom: '2mm' }}>{b.titre}</div>
            {b.paragraphes.map((t, i) => <p key={i} style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '12.5pt', fontStyle: 'italic', color: '#334B3D', lineHeight: 1.35 }}>{t}</p>)}
          </div>
        );
      default:
        return (
          <div key={b.titre} style={{ marginBottom: '5mm' }}>
            <Title b={b} /><Paras b={b} />
            {b.puces && b.puces.length > 0 && <List items={b.puces} />}
            {b.apres?.map((t, i) => <p key={'a' + i}>{t}</p>)}
            {b.sous?.map((x) => (
              <div key={x.titre} style={{ marginBottom: '3mm' }}>
                <div className="keep" style={{ fontWeight: 600, color: '#334B3D', margin: '3mm 0 1mm' }}>{x.titre}</div>
                {x.paragraphes.map((t, i) => <p key={i}>{t}</p>)}
                {x.puces && <List items={x.puces} />}
              </div>
            ))}
          </div>
        );
    }
  };
  return <div>{blocks.map(render)}</div>;
}
