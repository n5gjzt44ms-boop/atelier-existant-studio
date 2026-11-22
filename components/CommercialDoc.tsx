'use client';
import type { EntrepriseInfo } from '@/lib/business';
import { fmtDate } from '@/lib/calc';
import { estParticulier, eur, totaux } from '@/lib/commercial';
import type { Devis, Dossier, Facture } from '@/lib/types';
import { ASSET_BASE } from './ReportPreview';

/** Devis ou facture au format A4, prêt à imprimer ou enregistrer en PDF. */
export default function CommercialDoc({ kind, doc, dossier, ent }: { kind: 'devis' | 'facture'; doc: Devis | Facture; dossier: Dossier; ent: EntrepriseInfo }) {
  const t = totaux(doc.lignes, ent);
  const c = dossier.meta.client;
  const bien = [dossier.meta.bien.adresse, dossier.meta.bien.codePostal, dossier.meta.bien.commune].filter(Boolean).join(' ');
  const facture = kind === 'facture' ? (doc as Facture) : null;
  const devis = kind === 'devis' ? (doc as Devis) : null;
  const titre = devis ? 'Devis' : facture?.nature === 'acompte' ? 'Facture d’acompte' : facture?.nature === 'solde' ? 'Facture de solde' : 'Facture';
  const particulier = estParticulier(dossier);

  return (
    <div className="report">
      <section className="report-page doc">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8mm' }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ASSET_BASE}logo.png`} alt={ent.nom} style={{ width: '42mm' }} />
            <div style={{ fontSize: '8pt', marginTop: '3mm', lineHeight: 1.45 }}>
              <b>{ent.nom}</b>{ent.forme ? ` — ${ent.forme}` : ''}<br />
              {ent.adresse && <>{ent.adresse}<br /></>}
              {(ent.codePostal || ent.ville) && <>{ent.codePostal} {ent.ville}<br /></>}
              {ent.siret && <>Numéro SIRET : {ent.siret}<br /></>}
              {ent.regimeTva === 'assujetti' && ent.numeroTva && <>Numéro de TVA intracommunautaire : {ent.numeroTva}<br /></>}
              {[ent.email, ent.telephone].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26pt', color: '#334B3D', lineHeight: 1 }}>{titre}</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '10pt', marginTop: '2mm' }}>{doc.numero || 'Brouillon — numéro attribué à l’émission'}</div>
            <div style={{ fontSize: '8.5pt', marginTop: '1mm' }}>Date : {fmtDate(doc.date)}</div>
            {devis && <div style={{ fontSize: '8.5pt' }}>Validité : {devis.validiteJours} jours</div>}
            {facture && <div style={{ fontSize: '8.5pt' }}>Échéance : {fmtDate(facture.echeance)}</div>}
            <div className="boxed" style={{ marginTop: '6mm', textAlign: 'left', minWidth: '70mm' }}>
              <div className="eyebrow">Client</div>
              <div style={{ fontWeight: 600, marginTop: '1mm' }}>{c.nom || '—'}</div>
              {c.adresse && <div style={{ fontSize: '8.5pt' }}>{c.adresse}</div>}
              {c.email && <div style={{ fontSize: '8.5pt' }}>{c.email}</div>}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '10mm', fontSize: '9pt' }}>
          <b>Objet :</b> {dossier.meta.titreMission}{dossier.prospect ? '' : ` — dossier ${dossier.numero}`}{bien ? ` — ${bien}` : ''}
        </div>

        <table style={{ marginTop: '5mm' }}>
          <thead>
            <tr><th style={{ width: '52%' }}>Désignation</th><th className="num">Quantité</th><th>Unité</th><th className="num">Prix unitaire hors taxes</th><th className="num">Total hors taxes</th></tr>
          </thead>
          <tbody>
            {doc.lignes.map((l) => (
              <tr key={l.id}>
                <td>{l.libelle}</td>
                <td className="num">{l.quantite.toLocaleString('fr-FR')}</td>
                <td>{l.unite}</td>
                <td className="num">{eur(l.puHT)}</td>
                <td className="num">{eur(l.quantite * l.puHT)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4mm' }}>
          <table style={{ width: '80mm' }}>
            <tbody>
              <tr><td>Total hors taxes</td><td className="num">{eur(t.ht)}</td></tr>
              {ent.regimeTva === 'assujetti'
                ? <><tr><td>Taxe sur la valeur ajoutée ({t.taux.toLocaleString('fr-FR')} %)</td><td className="num">{eur(t.tva)}</td></tr>
                  <tr style={{ fontWeight: 600 }}><td>Total toutes taxes comprises</td><td className="num">{eur(t.ttc)}</td></tr></>
                : <tr style={{ fontWeight: 600 }}><td>Net à payer</td><td className="num">{eur(t.ht)}</td></tr>}
            </tbody>
          </table>
        </div>
        {ent.regimeTva === 'franchise' && <p style={{ fontSize: '8pt', textAlign: 'right', marginTop: '1mm' }}>TVA non applicable, article 293 B du Code général des impôts.</p>}

        <div style={{ marginTop: '8mm', fontSize: '8pt', color: '#2D332F', lineHeight: 1.5 }}>
          {devis && (
            <>
              {particulier
                ? <p>Conditions : acompte de {devis.acomptePct} % à la signature, à régler avant la visite (la date de visite est confirmée à réception de l’acompte) ; solde à la remise du livrable. Paiement à {ent.delaiPaiementJours} jours.</p>
                : <p>Conditions : acompte de {devis.acomptePct} % à la commande, solde à la remise du livrable. Paiement à {ent.delaiPaiementJours} jours.</p>}
              {particulier && <p>Droit de rétractation : si ce contrat est conclu à distance ou hors établissement, vous disposez d’un délai de quatorze jours à compter de sa signature pour vous rétracter, sans motif (articles L221-18 et suivants du Code de la consommation). Si vous souhaitez que la visite ait lieu avant la fin de ce délai, merci de le demander expressément ; en cas de rétractation après le début de la mission, le montant correspondant au service déjà fourni reste dû.</p>}
              {particulier && ent.mediateur && <p>En cas de litige, vous pouvez recourir gratuitement au médiateur de la consommation : {ent.mediateur}.</p>}
              {devis.notes && <p>{devis.notes}</p>}
              <p>{ent.mentionsDevis}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10mm', marginTop: '8mm' }}>
                <div className="boxed" style={{ height: '30mm' }}><div className="eyebrow">Bon pour accord — date et signature du client</div></div>
                <div className="boxed" style={{ height: '30mm' }}><div className="eyebrow">{ent.nom}</div></div>
              </div>
            </>
          )}
          {facture && (
            <>
              <p>Paiement à réception, au plus tard le {fmtDate(facture.echeance)}{ent.iban ? `, par virement : IBAN ${ent.iban}${ent.bic ? ` — BIC ${ent.bic}` : ''}` : ''}.</p>
              <p>Pas d’escompte pour paiement anticipé. En cas de retard de paiement, des pénalités sont exigibles au taux de trois fois le taux d’intérêt légal.{particulier ? '' : ' Une indemnité forfaitaire de 40 € pour frais de recouvrement est due en sus.'}</p>
              {facture.statut === 'payee' && <p style={{ color: '#334B3D', fontWeight: 600 }}>Facture acquittée le {facture.datePaiement ? fmtDate(facture.datePaiement) : '—'}{facture.modePaiement ? ` (${facture.modePaiement})` : ''}.</p>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
