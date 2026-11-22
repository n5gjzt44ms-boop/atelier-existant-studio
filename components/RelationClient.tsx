'use client';
import { useMemo, useState } from 'react';
import { VARIABLES_MAIL, type EntrepriseInfo, type ModeleMail } from '@/lib/business';
import { fmtDate } from '@/lib/calc';
import { eur, totalLignes } from '@/lib/commercial';
import { uid } from '@/lib/factory';
import type { Dossier } from '@/lib/types';
import { useLibrary } from './LibraryProvider';
import { PlaquetteDoc, PreparerVisiteDoc, QuestionnaireDoc } from './Supports';
import { Field, Input, TextArea } from './ui';
import Contacts from './Contacts';
import Prospection from './Prospection';
import Realisations from './Realisations';
import type { CategorieContact } from '@/lib/business';

export type OngletRelation = 'contacts' | 'prospection' | 'mails' | 'supports' | 'realisations';
const ONGLETS: [OngletRelation, string][] = [['contacts', 'Contacts'], ['prospection', 'Prospection'], ['mails', 'Modèles de mails'], ['supports', 'Supports de communication'], ['realisations', 'Nos réalisations']];

/** Remplace les variables {client}, {adresse}… par les informations du dossier. */
export function remplirMail(texte: string, d: Dossier | undefined, ent: EntrepriseInfo, signataire: string): string {
  const devis = d?.commercial?.devis.slice(-1)[0];
  const facture = d?.commercial?.factures.filter((f) => f.statut !== 'brouillon').slice(-1)[0];
  const signature = [signataire, ent.nom, [ent.telephone, ent.email].filter(Boolean).join(' · '), ent.siteWeb].filter(Boolean).join('\n');
  const v: Record<string, string> = {
    '{client}': d?.meta.client.nom || 'Madame, Monsieur',
    '{adresse}': d ? [d.meta.bien.adresse, d.meta.bien.codePostal, d.meta.bien.commune].filter(Boolean).join(' ') : '…',
    '{commune}': d?.meta.bien.commune || '…',
    '{mission}': d?.meta.titreMission || '…',
    '{date_visite}': d?.meta.dateVisite ? fmtDate(d.meta.dateVisite) : '…',
    '{date_rendu}': d?.commercial?.dateRendu ? fmtDate(d.commercial.dateRendu) : '…',
    '{numero_devis}': devis?.numero || '…',
    '{montant_devis}': devis ? `${eur(totalLignes(devis.lignes))} hors taxes` : '…',
    '{numero_facture}': facture?.numero || '…',
    '{montant_facture}': facture ? eur(totalLignes(facture.lignes)) : '…',
    '{echeance}': facture ? fmtDate(facture.echeance) : '…',
    '{signature}': signature,
  };
  return texte.replace(/\{[a-z_]+\}/g, (k) => v[k] ?? k);
}

export default function RelationClient({ dossiers, tab, setTab, onPrint, onUpdateDossier, cat, setCat, onOpen, onDevis, mailInitial }: {
  dossiers: Dossier[]; tab: OngletRelation; setTab: (t: OngletRelation) => void;
  onPrint: (node: React.ReactNode, titre: string) => void; onUpdateDossier: (d: Dossier) => void;
  cat?: CategorieContact; setCat: (c?: CategorieContact) => void; onOpen: (id: string) => void; onDevis: (pisteId: string) => void;
  mailInitial?: { modele?: string; dossierId?: string };
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="border-b border-pierre-100 bg-white">
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-1 px-5 py-2">
          {ONGLETS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`min-h-[36px] rounded-full px-4 text-[13px] ${tab === k ? 'bg-sauge text-white' : 'text-charbon/70 hover:bg-pierre-50'}`}>{l}</button>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-7">
        {tab === 'contacts' && <Contacts dossiers={dossiers} cat={cat} setCat={setCat} onOpen={onOpen} />}
        {tab === 'prospection' && <Prospection dossiers={dossiers} onDevis={onDevis} />}
        {tab === 'mails' && <Mails dossiers={dossiers} onUpdateDossier={onUpdateDossier} initial={mailInitial} />}
        {tab === 'supports' && <SupportsPage onPrint={onPrint} />}
        {tab === 'realisations' && <Realisations dossiers={dossiers} onPrint={onPrint} onOpen={onOpen} />}
      </div>
    </div>
  );
}

function Mails({ dossiers, onUpdateDossier, initial }: { dossiers: Dossier[]; onUpdateDossier: (d: Dossier) => void; initial?: { modele?: string; dossierId?: string } }) {
  const { lib, setLib } = useLibrary();
  const [selId, setSelId] = useState(initial?.modele && lib.mails.some((m) => m.id === initial.modele) ? initial.modele : lib.mails[0]?.id ?? '');
  const [dossierId, setDossierId] = useState(initial?.dossierId ?? '');
  const [mode, setMode] = useState<'utiliser' | 'modifier'>('utiliser');
  const [flash, setFlash] = useState<string | null>(null);
  const tpl = lib.mails.find((m) => m.id === selId);
  const d = dossiers.find((x) => x.id === dossierId);
  const signataire = lib.employes[0]?.nom ?? '';
  const objet = tpl ? remplirMail(tpl.objet, d, lib.entreprise, signataire) : '';
  const corps = tpl ? remplirMail(tpl.corps, d, lib.entreprise, signataire) : '';
  const moments = useMemo(() => Array.from(new Set(lib.mails.map((m) => m.moment))), [lib.mails]);
  const setTpl = (patch: Partial<ModeleMail>) => setLib({ ...lib, mails: lib.mails.map((m) => (m.id === selId ? { ...m, ...patch } : m)) });
  const ok = (t: string) => { setFlash(t); setTimeout(() => setFlash(null), 3000); };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        {moments.map((mo) => (
          <div key={mo}>
            <p className="label-caps mb-1">{mo}</p>
            {lib.mails.filter((m) => m.moment === mo).map((m) => (
              <button key={m.id} type="button" onClick={() => setSelId(m.id)} className={`block w-full rounded-md px-3 py-2 text-left text-[13.5px] ${selId === m.id ? 'bg-foret text-ivoire' : 'hover:bg-white'}`}>{m.titre}</button>
            ))}
          </div>
        ))}
        <button type="button" className="btn-ghost w-full" onClick={() => { const id = uid(); setLib({ ...lib, mails: [...lib.mails, { id, titre: 'Nouveau modèle', moment: 'Autre', objet: '', corps: 'Bonjour {client},\n\n\n\nBien cordialement,\n{signature}' }] }); setSelId(id); setMode('modifier'); }}>+ Nouveau modèle</button>
      </aside>

      {tpl ? (
        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="flex-1 font-serif text-2xl font-semibold text-foret">{tpl.titre}</p>
            <div className="flex overflow-hidden rounded-md border border-pierre text-[13px]">
              {(['utiliser', 'modifier'] as const).map((m) => <button key={m} type="button" onClick={() => setMode(m)} className={`px-3 py-1.5 ${mode === m ? 'bg-sauge text-white' : 'bg-white'}`}>{m === 'utiliser' ? 'Utiliser' : 'Modifier le modèle'}</button>)}
            </div>
          </div>
          {mode === 'utiliser' ? (
            <div className="space-y-3">
              <Field label="Pour le dossier">
                <select value={dossierId} onChange={(e) => setDossierId(e.target.value)} className="field">
                  <option value="">Choisir un dossier pour remplir le mail…</option>
                  {dossiers.filter((x) => !x.archive).map((x) => <option key={x.id} value={x.id}>{x.meta.client.nom || x.numero} — {x.meta.bien.commune || 'commune ?'}{x.prospect ? ' (devis en préparation)' : ''}</option>)}
                </select>
              </Field>
              <Field label="Objet"><Input readOnly value={objet} /></Field>
              <Field label="Message"><TextArea readOnly value={corps} rows={12} onChange={() => {}} /></Field>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => { navigator.clipboard?.writeText(`${objet}\n\n${corps}`); ok('Copié : collez-le dans votre messagerie.'); }}>Copier</button>
                <a className="btn-ghost" href={`mailto:${encodeURIComponent(d?.meta.client.email ?? '')}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`}>Ouvrir dans ma messagerie</a>
                {d && <button type="button" className="btn-ghost" onClick={() => { const c = d.classeur ?? { echanges: [], documents: [] }; onUpdateDossier({ ...d, classeur: { ...c, echanges: [...c.echanges, { id: uid(), date: new Date().toISOString().slice(0, 10), sens: 'envoye', objet, texte: corps }] } }); ok('Enregistré dans le classeur du dossier.'); }}>Enregistrer dans le classeur du dossier</button>}
              </div>
              {flash && <p className="text-[13px] text-sauge">{flash}</p>}
              {!d && <p className="text-[12px] text-charbon/55">Sans dossier, les informations à compléter apparaissent sous la forme « … ».</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nom du modèle"><Input value={tpl.titre} onChange={(e) => setTpl({ titre: e.target.value })} /></Field>
                <Field label="Moment"><Input value={tpl.moment} onChange={(e) => setTpl({ moment: e.target.value })} list="moments" /></Field>
                <datalist id="moments">{moments.map((m) => <option key={m} value={m} />)}</datalist>
              </div>
              <Field label="Objet"><Input value={tpl.objet} onChange={(e) => setTpl({ objet: e.target.value })} /></Field>
              <Field label="Message"><TextArea value={tpl.corps} onChange={(v) => setTpl({ corps: v })} rows={12} /></Field>
              <div className="rounded-md bg-ivoire p-3 text-[12px]">
                <p className="label-caps mb-1">Informations remplies automatiquement</p>
                <div className="flex flex-wrap gap-1.5">{VARIABLES_MAIL.map(([k, l]) => <button key={k} type="button" title={l} onClick={() => setTpl({ corps: `${tpl.corps}${k}` })} className="rounded border border-pierre bg-white px-2 py-0.5 font-mono text-[11px]">{k}</button>)}</div>
              </div>
              <button type="button" className="btn-quiet text-[13px] text-terre" onClick={() => { setLib({ ...lib, mails: lib.mails.filter((m) => m.id !== tpl.id) }); setSelId(lib.mails[0]?.id ?? ''); }}>Supprimer ce modèle</button>
            </div>
          )}
        </div>
      ) : <p className="card p-6">Choisissez un modèle.</p>}
    </div>
  );
}

function SupportsPage({ onPrint }: { onPrint: (node: React.ReactNode, titre: string) => void }) {
  const { lib } = useLibrary();
  const ent = lib.entreprise;
  const signataire = lib.employes[0];
  const signature = [signataire?.nom, signataire?.fonction, ent.nom, [ent.telephone, ent.email].filter(Boolean).join(' · '), ent.siteWeb].filter(Boolean).join('\n');
  const [copie, setCopie] = useState(false);
  const cartes: { titre: string; texte: string; action: () => void; bouton: string }[] = [
    { titre: 'Plaquette de présentation', texte: 'Présentation de l’entreprise, déroulé d’une mission et offre complète avec les options. À envoyer ou imprimer pour un premier contact.', bouton: 'Imprimer ou enregistrer en PDF', action: () => onPrint(<PlaquetteDoc ent={ent} prestations={lib.prestations} options={lib.options} />, `Plaquette — ${ent.nom}`) },
    { titre: 'Préparer la visite', texte: 'Fiche pratique pour le client : accès, documents utiles, informations à rassembler avant la visite.', bouton: 'Imprimer ou enregistrer en PDF', action: () => onPrint(<PreparerVisiteDoc ent={ent} />, 'Préparer la visite') },
    { titre: 'Questionnaire préalable', texte: 'Version papier du questionnaire utilisé pour établir le devis : à remplir avec le client au téléphone ou à lui envoyer.', bouton: 'Imprimer ou enregistrer en PDF', action: () => onPrint(<QuestionnaireDoc ent={ent} />, 'Questionnaire préalable') },
  ];
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-[32px] font-semibold text-foret">Supports de communication</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {cartes.map((c) => (
          <div key={c.titre} className="card flex flex-col p-5">
            <p className="font-serif text-xl font-semibold text-foret">{c.titre}</p>
            <p className="mt-1 flex-1 text-[13px] text-charbon/70">{c.texte}</p>
            <button type="button" className="btn-primary mt-4" onClick={c.action}>{c.bouton}</button>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <p className="font-serif text-xl font-semibold text-foret">Signature de mail</p>
        <pre className="mt-2 whitespace-pre-wrap rounded-md bg-ivoire p-3 font-sans text-[13px]">{signature}</pre>
        <button type="button" className="btn-ghost mt-3" onClick={() => { navigator.clipboard?.writeText(signature); setCopie(true); setTimeout(() => setCopie(false), 2500); }}>{copie ? 'Copiée' : 'Copier la signature'}</button>
        <p className="mt-2 text-[12px] text-charbon/55">Les informations viennent de Organisation › Mon entreprise.</p>
      </div>
      <p className="text-[12px] text-charbon/55">La proposition commerciale complète (présentation, offre, besoins du client, devis) se prépare depuis Dossiers › Nouveau devis client.</p>
    </div>
  );
}
