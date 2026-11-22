'use client';
import { Q_LABELS, prixSuggere, type EntrepriseInfo, type OptionCommerciale, type Prestation } from '@/lib/business';
import { fmtDate } from '@/lib/calc';
import { BRAND, DELIVERABLES } from '@/lib/constants';
import { eur } from '@/lib/commercial';
import type { Devis, Dossier, Questionnaire } from '@/lib/types';
import CommercialDoc from './CommercialDoc';
import { ASSET_BASE } from './ReportPreview';

/** Documents commerciaux imprimables : proposition de mission, plaquette, fiches client. */

function Entete({ ent, titre, sous }: { ent: EntrepriseInfo; titre: string; sous?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10mm' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ASSET_BASE}logo.png`} alt={ent.nom} style={{ width: '44mm' }} />
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24pt', color: '#334B3D', lineHeight: 1.05 }}>{titre}</div>
        {sous && <div style={{ fontSize: '9pt', color: '#68725E', marginTop: '1.5mm' }}>{sous}</div>}
      </div>
    </div>
  );
}

function Pied({ ent }: { ent: EntrepriseInfo }) {
  return (
    <footer className="folio">
      <span>{ent.nom}{ent.siret ? ` · SIRET ${ent.siret}` : ''}</span>
      <span>{[ent.telephone, ent.email, ent.siteWeb].filter(Boolean).join(' · ')}</span>
    </footer>
  );
}

const ETAPES_MISSION = [
  ['Un premier échange', 'Vous me présentez le bâtiment, vos questions et votre projet. Je vous propose la mission adaptée.'],
  ['La visite', 'Deux à trois heures sur place, de l’extérieur vers l’intérieur, du bas vers le haut : observation, photographies, relevés.'],
  ['Le rapport', 'Un document clair et illustré, qui explique ce qui se passe dans votre bâtiment et ce qu’il faut faire, dans quel ordre.'],
  ['La restitution', 'Nous parcourons ensemble le rapport pour répondre à vos questions et vous aider à décider.'],
];

export function PagePresentation({ ent }: { ent: EntrepriseInfo }) {
  return (
    <section className="report-page doc">
      <Entete ent={ent} titre="L’Atelier de l’Existant" sous={BRAND.devise} />
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17pt', lineHeight: 1.3, color: '#334B3D', maxWidth: '150mm' }}>« {BRAND.manifeste}. »</p>
      <h3>Qui sommes-nous</h3>
      <p>{ent.presentation}</p>
      <h3>Notre approche</h3>
      <p>{ent.approche}</p>
      <h3>Comment se déroule une mission</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3mm', marginTop: '3mm' }}>
        {ETAPES_MISSION.map(([t, d], i) => (
          <div key={t} style={{ background: '#F1F2EE', borderRadius: '1.5mm', padding: '3mm' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20pt', color: '#B97A5B', lineHeight: 1 }}>{i + 1}</div>
            <div style={{ fontWeight: 600, margin: '1.5mm 0 1mm', color: '#334B3D' }}>{t}</div>
            <div style={{ fontSize: '8pt' }}>{d}</div>
          </div>
        ))}
      </div>
      <Pied ent={ent} />
    </section>
  );
}

export function PageOffre({ ent, prestations, options, choix }: { ent: EntrepriseInfo; prestations: Prestation[]; options: OptionCommerciale[]; choix?: string[] }) {
  return (
    <section className="report-page doc">
      <Entete ent={ent} titre="Notre offre" sous="Des missions graduées, selon vos besoins" />
      <div style={{ display: 'grid', gap: '3mm' }}>
        {prestations.map((p) => {
          const on = choix?.includes(p.id);
          return (
            <div key={p.id} className="keep" style={{ display: 'grid', gridTemplateColumns: '14mm 1fr 34mm', gap: '3mm', alignItems: 'start', padding: '3mm', borderRadius: '1.5mm', border: `0.6pt solid ${on ? '#334B3D' : '#D6C7AF'}`, background: on ? '#F1F2EE' : '#fff' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#B97A5B', fontSize: '11pt' }}>{DELIVERABLES[p.type]?.num}</div>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '14pt', fontWeight: 600, color: '#334B3D' }}>{p.libelle}{on && <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '6.5pt', letterSpacing: '.08em', textTransform: 'uppercase', marginLeft: '2mm', color: '#B97A5B' }}>proposée</span>}</div>
                <div style={{ fontSize: '8pt', fontStyle: 'italic', color: '#68725E' }}>{DELIVERABLES[p.type]?.question}</div>
                <div style={{ fontSize: '8.5pt', marginTop: '1mm' }}>{p.detail}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '8.5pt' }}>{p.prixBas === p.prixHaut ? eur(p.prixBas) : `de ${eur(p.prixBas)} à ${eur(p.prixHaut)}`}<div style={{ fontSize: '7pt', color: '#68725E' }}>hors taxes, selon le bâtiment</div></div>
            </div>
          );
        })}
      </div>
      <h3>Options</h3>
      <table>
        <tbody>{options.filter((o) => o.id !== 'km').map((o) => (
          <tr key={o.id}><td style={{ fontWeight: 600, width: '48mm' }}>{o.libelle}</td><td style={{ fontSize: '8.3pt' }}>{o.detail}</td><td className="num" style={{ whiteSpace: 'nowrap' }}>{o.prixBas === o.prixHaut ? eur(o.prixBas) : `${eur(o.prixBas)} à ${eur(o.prixHaut)}`} / {o.unite}</td></tr>
        ))}</tbody>
      </table>
      <p style={{ fontSize: '8pt', color: '#68725E', marginTop: '3mm' }}>Déplacements inclus dans un rayon de {ent.rayonKm} km ; au-delà, facturés au kilomètre. {ent.regimeTva === 'franchise' ? 'TVA non applicable, article 293 B du Code général des impôts.' : `Prix hors taxes, TVA ${ent.tauxTva} % en sus.`}</p>
      <Pied ent={ent} />
    </section>
  );
}

export function PageBesoins({ ent, dossier, q, prestations }: { ent: EntrepriseInfo; dossier: Dossier; q: Questionnaire; prestations: Prestation[] }) {
  const m = dossier.meta;
  const sugg = prestations[0] ? prixSuggere(prestations[0], q) : null;
  const rows: [string, string][] = [
    ['Client', m.client.nom], ['Adresse du bien', [m.bien.adresse, m.bien.codePostal, m.bien.commune].filter(Boolean).join(' ')],
    ['Votre projet', q.besoin], ['Bâtiment', Q_LABELS.typeBatiment[q.typeBatiment]],
    ['Surface de plancher', q.surface ? `environ ${q.surface.toLocaleString('fr-FR')} m²` : ''], ['Niveaux', q.niveaux ? String(q.niveaux) : ''],
    ['État apparent', Q_LABELS.etat[q.etat]], ['Désordres signalés', Q_LABELS.desordres[q.desordres]],
    ['Étendue de la mission', `${Q_LABELS.etendue[q.etendue]}${q.zonesConcernees ? ` : ${q.zonesConcernees}` : ''}`],
    ['Accès', Q_LABELS.acces[q.acces]], ['Documents disponibles', q.documents], ['Urgence', q.urgence ? 'Oui' : ''], ['Remarques', q.notes],
  ];
  return (
    <section className="report-page doc">
      <Entete ent={ent} titre="Votre projet" sous={`Proposition du ${fmtDate(new Date().toISOString().slice(0, 10))}`} />
      <p>Voici ce que nous avons retenu de nos échanges. La mission proposée et son prix en découlent ; n’hésitez pas à nous signaler toute erreur.</p>
      <table><tbody>{rows.filter(([, v]) => v).map(([k, v]) => <tr key={k}><td style={{ width: '45mm', color: '#68725E' }}>{k}</td><td>{v}</td></tr>)}</tbody></table>
      {prestations.length > 0 && (
        <div className="boxed" style={{ marginTop: '6mm', background: '#F1F2EE', borderColor: '#68725E' }}>
          <div className="eyebrow" style={{ marginBottom: '1.5mm' }}>{prestations.length > 1 ? 'Missions proposées' : 'Mission proposée'}</div>
          {prestations.map((p) => (
            <div key={p.id} style={{ marginBottom: '2.5mm' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15pt', fontWeight: 600, color: '#334B3D' }}>{DELIVERABLES[p.type].num} — {p.libelle}</div>
              <p style={{ margin: '1mm 0' }}>{p.detail}</p>
              <p style={{ margin: 0, fontSize: '8.3pt' }}>Livrable : {DELIVERABLES[p.type].livrables}</p>
            </div>
          ))}
          {sugg && <p style={{ margin: 0, fontSize: '8.3pt', color: '#68725E' }}>Prix établis en tenant compte de : {sugg.raisons.join(', ')}.</p>}
        </div>
      )}
      <Pied ent={ent} />
    </section>
  );
}

/** Proposition complète : présentation, offre, besoins, devis. */
export function PropositionDoc({ dossier, ent, prestations, options, devis }: { dossier: Dossier; ent: EntrepriseInfo; prestations: Prestation[]; options: OptionCommerciale[]; devis?: Devis }) {
  const q = dossier.commercial?.questionnaire;
  const trouvees = prestations.filter((p) => devis?.lignes.some((l) => l.libelle.startsWith(p.libelle)));
  const choisies = trouvees.length ? trouvees : prestations.filter((p) => p.type === dossier.type).slice(0, 1);
  return (
    <div className="report">
      <PagePresentation ent={ent} />
      {q && <PageBesoins ent={ent} dossier={dossier} q={q} prestations={choisies} />}
      <PageOffre ent={ent} prestations={prestations} options={options} choix={choisies.map((p) => p.id)} />
      {devis && <CommercialDoc kind="devis" doc={devis} dossier={dossier} ent={ent} />}
    </div>
  );
}

export function PlaquetteDoc({ ent, prestations, options }: { ent: EntrepriseInfo; prestations: Prestation[]; options: OptionCommerciale[] }) {
  return <div className="report"><PagePresentation ent={ent} /><PageOffre ent={ent} prestations={prestations} options={options} /></div>;
}

export function PreparerVisiteDoc({ ent }: { ent: EntrepriseInfo }) {
  const blocs: [string, string[]][] = [
    ['Les accès', ['Toutes les pièces, y compris les combles, la cave, les dépendances', 'Une échelle si les combles ne sont accessibles que par une trappe', 'Les clés des locaux fermés, l’accès aux abords et au jardin', 'Les meubles éloignés des murs abîmés si possible']],
    ['Les documents utiles', ['Plans, même anciens ou dessinés à la main', 'Anciens diagnostics, rapports, devis et factures de travaux', 'Photos anciennes du bâtiment', 'Acte de propriété ou extrait cadastral']],
    ['Ce que vous avez remarqué', ['Depuis quand les désordres sont apparus, s’ils évoluent', 'Les travaux réalisés et leur date', 'Les périodes d’humidité, les fuites passées', 'Vos projets pour le bâtiment et votre budget indicatif']],
  ];
  return (
    <div className="report">
      <section className="report-page doc">
        <Entete ent={ent} titre="Préparer la visite" sous="Quelques conseils pour une visite utile" />
        <p>La visite dure en général deux à trois heures. Elle se déroule de l’extérieur vers l’intérieur et du bas vers le haut. Voici comment la préparer :</p>
        {blocs.map(([t, l]) => (
          <div key={t} className="keep" style={{ marginTop: '5mm' }}>
            <h3 style={{ marginTop: 0 }}>{t}</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>{l.map((x) => <li key={x} style={{ display: 'flex', gap: '3mm', marginBottom: '2mm' }}><span style={{ display: 'inline-block', width: '4mm', height: '4mm', border: '0.8pt solid #68725E', borderRadius: '0.8mm', flex: 'none', marginTop: '0.6mm' }} />{x}</li>)}</ul>
          </div>
        ))}
        <div className="boxed" style={{ marginTop: '6mm' }}><p style={{ margin: 0 }}>Une question avant la visite ? {[ent.telephone, ent.email].filter(Boolean).join(' · ') || 'Contactez-nous.'}</p></div>
        <Pied ent={ent} />
      </section>
    </div>
  );
}

export function QuestionnaireDoc({ ent }: { ent: EntrepriseInfo }) {
  const ligne = (label: string, n = 1) => (
    <div className="keep" style={{ marginBottom: '4mm' }}>
      <div style={{ fontSize: '8.5pt', color: '#68725E', marginBottom: '1mm' }}>{label}</div>
      {Array.from({ length: n }).map((_, i) => <div key={i} style={{ borderBottom: '0.5pt solid #D6C7AF', height: '7mm' }} />)}
    </div>
  );
  const choix = (label: string, opts: readonly string[]) => (
    <div className="keep" style={{ marginBottom: '4mm' }}>
      <div style={{ fontSize: '8.5pt', color: '#68725E', marginBottom: '1.5mm' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3mm 6mm' }}>{opts.map((o) => <span key={o} style={{ display: 'flex', gap: '1.5mm', alignItems: 'center', fontSize: '8.5pt' }}><span style={{ width: '3.5mm', height: '3.5mm', border: '0.8pt solid #68725E', borderRadius: '0.8mm' }} />{o}</span>)}</div>
    </div>
  );
  return (
    <div className="report">
      <section className="report-page doc">
        <Entete ent={ent} titre="Questionnaire préalable" sous="Pour vous proposer la mission la plus juste" />
        {ligne('Nom, téléphone, e-mail')}
        {ligne('Adresse du bâtiment')}
        {ligne('Votre projet (achat, travaux, entretien, sinistre…)', 2)}
        {choix('Type de bâtiment', Object.values(Q_LABELS.typeBatiment))}
        {ligne('Surface approximative et nombre de niveaux')}
        {choix('État apparent', Object.values(Q_LABELS.etat))}
        {choix('Désordres constatés', Object.values(Q_LABELS.desordres))}
        {choix('La mission concerne', Object.values(Q_LABELS.etendue))}
        {choix('Accès', Object.values(Q_LABELS.acces))}
        {ligne('Désordres observés, depuis quand', 3)}
        {ligne('Documents disponibles (plans, diagnostics, photos)', 2)}
        <Pied ent={ent} />
      </section>
    </div>
  );
}
