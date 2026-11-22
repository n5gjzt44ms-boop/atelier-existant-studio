'use client';
import { useCallback, useEffect, useState } from 'react';
import Accueil from '@/components/Accueil';
import AppNav, { type Vue } from '@/components/AppNav';
import Dashboard from '@/components/Dashboard';
import DevisClient from '@/components/DevisClient';
import Gestion from '@/components/Gestion';
import LibraryEditor from '@/components/LibraryEditor';
import Login from '@/components/Login';
import RelationClient from '@/components/RelationClient';
import Studio from '@/components/Studio';
import { LibraryProvider } from '@/components/LibraryProvider';
import { DEFAULT_MISSION, DELIVERABLES } from '@/lib/constants';
import { newDossier, nextNumero, sampleDossier, uid } from '@/lib/factory';
import { openPrintDialog } from '@/lib/pdf';
import { archiveLocal, readLocalForTransfer, useDossiers } from '@/lib/storage';
import { cloudEnabled, supabase, useSession } from '@/lib/supabase';
import type { DeliverableType, Dossier } from '@/lib/types';

export default function Home() {
  const session = useSession();
  const userId = session?.user.id ?? null;
  const { dossiers, upsert, remove, sync, loadError, reload, retry } = useDossiers(userId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [vue, setVue] = useState<Vue>({ k: 'accueil' });
  const [creating, setCreating] = useState(false);
  const [print, setPrint] = useState<{ node: React.ReactNode; titre: string } | null>(null);
  const onSave = useCallback((d: Dossier) => upsert(d), [upsert]);
  const [localToTransfer, setLocalToTransfer] = useState<Dossier[]>([]);
  useEffect(() => { if (cloudEnabled && userId) readLocalForTransfer().then(setLocalToTransfer); }, [userId]);

  // Impression des documents commerciaux (proposition, plaquette…) hors du studio
  useEffect(() => {
    if (!print) return;
    const t = setTimeout(() => { openPrintDialog(print.titre); setPrint(null); }, 300);
    return () => clearTimeout(t);
  }, [print]);

  /** Ajoute des dossiers (import ou transfert) sans écraser l'existant. */
  const addDossiers = useCallback((incoming: Dossier[]) => {
    const current = [...(dossiers ?? [])];
    for (const d of incoming) {
      const copy = { ...d };
      if (current.some((x) => x.id === copy.id)) copy.id = uid();
      if (current.some((x) => x.numero === copy.numero)) copy.numero = nextNumero(current);
      current.push(copy);
      upsert(copy);
    }
    return incoming.length;
  }, [dossiers, upsert]);

  if (cloudEnabled && session === undefined) return null;
  if (cloudEnabled && !session) return <Login />;

  if (loadError) {
    return (
      <div className="grid min-h-[100dvh] place-items-center p-6 text-center">
        <div className="card max-w-md p-6">
          <p className="font-serif text-xl font-semibold text-foret">Impossible de charger les dossiers</p>
          <p className="mt-2 text-sm text-charbon/70">{loadError}</p>
          <p className="mt-2 text-sm text-charbon/60">Si le projet Supabase est resté 7 jours sans utilisation, il est en pause : relancez-le depuis le tableau de bord Supabase, puis réessayez.</p>
          <button type="button" className="btn-primary mt-5" onClick={reload}>Réessayer</button>
        </div>
      </div>
    );
  }
  if (!dossiers) return null;

  const go = (v: Vue) => { setOpenId(null); setVue(v); };
  const newDossierDialog = () => { go({ k: 'dossiers' }); setCreating(true); };
  const onPrint = (node: React.ReactNode, titre: string) => setPrint({ node, titre });

  /** Nouvelle mission pour le même bien : reprend client, bien, contexte, zones, photos et classeur. */
  const nouvelleMission = (src: Dossier, type: DeliverableType, reprendre: boolean) => {
    const base = newDossier(type, dossiers);
    const affaireId = src.affaireId ?? src.id;
    const d: Dossier = {
      ...base, affaireId,
      meta: { ...base.meta, client: src.meta.client, bien: src.meta.bien, photoCouverture: src.meta.photoCouverture, intervenant: src.meta.intervenant, titreMission: DELIVERABLES[type].titre, objetMission: DEFAULT_MISSION[type].objet },
      contexte: src.contexte, zones: src.zones, visites: src.visites, souhaits: src.souhaits, annuaire: src.annuaire,
      plansZones: src.plansZones, classeur: src.classeur, guides: src.guides,
      desordres: reprendre ? src.desordres.map((x) => ({ ...x, id: uid(), aRelire: true })) : [],
    };
    if (!src.affaireId) upsert({ ...src, affaireId });
    upsert(d);
    setOpenId(d.id);
  };

  const nav = (actif?: string) => (
    <AppNav vue={openId ? null : vue} actif={actif} go={go} onNewDossier={newDossierDialog} userEmail={session?.user.email}
      onSignOut={supabase ? () => supabase!.auth.signOut() : undefined} sync={sync}
      dossiers={dossiers} onOpen={(id) => { setOpenId(id); }} />
  );

  const open = dossiers.find((d) => d.id === openId);
  let page: React.ReactNode = null;
  if (open) {
    const missions = dossiers.filter((x) => (x.affaireId ?? x.id) === (open.affaireId ?? open.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    page = (
      <Studio key={open.id} initial={open} onSave={onSave} onBack={() => setOpenId(null)} sync={sync} onRetry={retry} allDossiers={dossiers}
        topNav={nav('dossiers')}
        onMail={(modele) => go({ k: 'relation', tab: 'mails', mail: { modele, dossierId: open.id } })}
        affaire={{ missions, onOpen: (id) => setOpenId(id), onNew: (type, reprendre) => nouvelleMission(open, type, reprendre) }} />
    );
  } else {
    let body: React.ReactNode;
    switch (vue.k) {
      case 'accueil': body = <Accueil dossiers={dossiers} go={go} onOpen={setOpenId} onNewDossier={newDossierDialog} />; break;
      case 'organisation': body = <Gestion dossiers={dossiers} onOpen={setOpenId} tab={vue.tab} setTab={(tab) => setVue({ k: 'organisation', tab })} />; break;
      case 'relation': body = (
        <RelationClient key={JSON.stringify(vue.mail ?? '')} dossiers={dossiers} tab={vue.tab} setTab={(tab) => setVue({ k: 'relation', tab })} onPrint={onPrint} onUpdateDossier={upsert}
          cat={vue.cat} setCat={(cat) => setVue({ k: 'relation', tab: 'contacts', cat })} onOpen={setOpenId} onDevis={(piste) => go({ k: 'devis', piste })} mailInitial={vue.mail} />
      ); break;
      case 'bibliotheque': body = <LibraryEditor embedded groupe={vue.groupe} />; break;
      case 'devis': body = (
        <DevisClient key={vue.id ?? vue.piste ?? 'nouveau'} dossiers={dossiers} id={vue.id} pisteId={vue.piste} onSave={upsert} onPrint={onPrint}
          onClose={() => go({ k: 'dossiers', filtre: 'prospects' })}
          onValidate={(d, autres) => { autres.forEach(upsert); upsert(d); setOpenId(d.id); }} />
      ); break;
      default: body = (
        <Dashboard
          dossiers={dossiers}
          onOpen={setOpenId}
          onDelete={remove}
          onUpdate={upsert}
          onCreate={(t: DeliverableType) => { const d = newDossier(t, dossiers); upsert(d); setOpenId(d.id); }}
          onLoadSample={() => upsert({ ...sampleDossier(), id: uid() })}
          onImport={addDossiers}
          localToTransfer={localToTransfer.length}
          onTransfer={() => { addDossiers(localToTransfer); archiveLocal(); setLocalToTransfer([]); }}
          filtre={vue.k === 'dossiers' ? vue.filtre : undefined}
          setFiltre={(filtre) => setVue({ k: 'dossiers', filtre })}
          creating={creating} setCreating={setCreating}
          onDevisClient={() => go({ k: 'devis' })}
          onOpenProspect={(id) => go({ k: 'devis', id })}
        />
      );
    }
    page = <div className="flex h-[100dvh] flex-col print:hidden">{nav()}{body}</div>;
  }

  return (
    <LibraryProvider userId={userId}>
      {page}
      {print && <div className="hidden print:block">{print.node}</div>}
    </LibraryProvider>
  );
}
