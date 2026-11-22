'use client';
import { useMemo, useState } from 'react';
import { CATEGORIES_CONTACT, contactVide, type CategorieContact, type Contact } from '@/lib/business';
import type { Dossier } from '@/lib/types';
import { useLibrary } from './LibraryProvider';
import { Combo, Field, Input, TextArea } from './ui';
import CarteContacts from './CarteContacts';
import { adresseContact, distanceKm, localiserContacts } from '@/lib/geo';
import { geocodePoint } from '@/lib/maps';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Bibliothèque de contacts : clients, entreprises (déjà travaillé ou possibles), partenaires. */
export default function Contacts({ dossiers, cat, setCat, onOpen }: { dossiers: Dossier[]; cat?: CategorieContact; setCat: (c?: CategorieContact) => void; onOpen: (id: string) => void }) {
  const { lib, setLib, phrases } = useLibrary();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Contact | null>(null);
  const [vue, setVue] = useState<'liste' | 'carte'>('liste');
  const [autour, setAutour] = useState('');
  const [centre, setCentre] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [rayon, setRayon] = useState(50);
  const [geo, setGeo] = useState<{ busy?: boolean; msg?: string; err?: boolean }>({});
  const list = useMemo(() => {
    const l = lib.contacts
      .filter((c) => !cat || c.categorie === cat)
      .filter((c) => !q.trim() || norm([c.nom, c.societe, c.metier, c.ville, c.email, c.notes].join(' ')).includes(norm(q)))
      .map((c) => ({ c, km: centre && c.lat != null && c.lon != null ? distanceKm(centre, { lat: c.lat, lon: c.lon }) : null }));
    if (centre) return l.filter((x) => x.km != null && x.km <= rayon).sort((a, b) => a.km! - b.km!);
    return l.sort((a, b) => (a.c.societe || a.c.nom).localeCompare(b.c.societe || b.c.nom, 'fr'));
  }, [lib.contacts, cat, q, centre, rayon]);
  const nonLocalises = lib.contacts.filter((c) => c.lat == null && adresseContact(c).trim()).length;

  async function chercherAutour() {
    if (!autour.trim()) { setCentre(null); return; }
    setGeo({ busy: true, msg: 'Recherche de l’adresse…' });
    try {
      const p = await geocodePoint(autour);
      if (!p) throw new Error('Adresse introuvable.');
      setCentre({ lat: p.lat, lon: p.lon, label: p.label });
      setGeo({ msg: `Contacts à moins de ${rayon} km de « ${p.label} », du plus proche au plus éloigné.` });
    } catch (e) { setGeo({ err: true, msg: (e as Error).message }); }
  }
  async function localiser() {
    setGeo({ busy: true, msg: 'Localisation des contacts…' });
    try {
      const r = await localiserContacts(lib.contacts, (n, t) => setGeo({ busy: true, msg: `Localisation ${n} / ${t}…` }));
      setLib({ ...lib, contacts: r.contacts });
      setGeo({ msg: `${r.trouves} contact(s) localisé(s)${r.echecs ? `, ${r.echecs} adresse(s) introuvable(s) : vérifiez-les` : ''}.`, err: r.echecs > 0 });
    } catch (e) { setGeo({ err: true, msg: (e as Error).message }); }
  }

  const dossiersDe = (c: Contact) => dossiers.filter((d) => (c.categorie === 'client' && c.nom && d.meta.client.nom === c.nom) || d.annuaire.some((a) => a.nom && (a.nom === c.societe || a.nom === c.nom)) || (d.consultation?.offres ?? []).some((o) => o.entreprise && (o.entreprise === c.societe || o.entreprise === c.nom)));

  /** Reprend les clients et entreprises déjà saisis dans les dossiers. */
  function importer() {
    const exist = new Set(lib.contacts.map((c) => norm(c.societe || c.nom)));
    const add: Contact[] = [];
    for (const d of dossiers) {
      const n = d.meta.client.nom.trim();
      if (n && !exist.has(norm(n))) { exist.add(norm(n)); add.push({ ...contactVide('client'), nom: n, email: d.meta.client.email, telephone: d.meta.client.telephone, adresse: d.meta.bien.adresse, codePostal: d.meta.bien.codePostal, ville: d.meta.bien.commune }); }
      for (const a of d.annuaire) {
        if (a.nom.trim() && !exist.has(norm(a.nom))) { exist.add(norm(a.nom)); add.push({ ...contactVide('entreprise-possible'), societe: a.nom, metier: a.lot, ville: a.ville, notes: a.contact }); }
      }
    }
    setLib({ ...lib, contacts: [...lib.contacts, ...add] });
    alert(`${add.length} contact${add.length > 1 ? 's' : ''} repris des dossiers.`);
  }

  const save = (input: Contact) => {
    const old = lib.contacts.find((x) => x.id === input.id);
    const c = old && adresseContact(old) !== adresseContact(input) ? { ...input, lat: undefined, lon: undefined } : input; setLib({ ...lib, contacts: lib.contacts.some((x) => x.id === c.id) ? lib.contacts.map((x) => (x.id === c.id ? c : x)) : [...lib.contacts, c] }); setEdit(null); };

  return (
    <div>
      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-[32px] font-semibold leading-none text-foret">Contacts</h1>
            <p className="mt-2 text-[14px] text-charbon/60">Clients, entreprises et partenaires, réutilisables dans les dossiers (client, annuaire, consultation).</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un nom, un métier…" className="field w-60" />
            <button type="button" className="btn-ghost" onClick={importer}>Reprendre depuis les dossiers</button>
            <button type="button" className="btn-primary" onClick={() => setEdit(contactVide(cat ?? 'client'))}>Nouveau contact</button>
          </div>
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setCat(undefined)} className={`min-h-[36px] rounded-full border px-4 text-[13px] ${!cat ? 'border-foret bg-foret text-ivoire' : 'border-pierre bg-white'}`}>Tous <span className="opacity-60">{lib.contacts.length}</span></button>
          {(Object.keys(CATEGORIES_CONTACT) as CategorieContact[]).map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} className={`min-h-[36px] rounded-full border px-4 text-[13px] ${cat === c ? 'border-foret bg-foret text-ivoire' : 'border-pierre bg-white'}`}>{CATEGORIES_CONTACT[c]} <span className="opacity-60">{lib.contacts.filter((x) => x.categorie === c).length}</span></button>
          ))}
        </div>
        <div className="card mb-5 flex flex-wrap items-end gap-2 p-3">
          <Field label="Autour d’une adresse" className="min-w-[260px] flex-1"><Input value={autour} onChange={(e) => setAutour(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') chercherAutour(); }} placeholder="Ex. 12 place de la Mairie, Caussade" /></Field>
          <Field label="Rayon"><select value={rayon} onChange={(e) => setRayon(Number(e.target.value))} className="field w-auto">{[10, 25, 50, 100, 200].map((r) => <option key={r} value={r}>{r} km</option>)}</select></Field>
          <button type="button" className="btn-primary" disabled={geo.busy} onClick={chercherAutour}>Chercher</button>
          {centre && <button type="button" className="btn-quiet" onClick={() => { setCentre(null); setAutour(''); setGeo({}); }}>Effacer</button>}
          <span className="flex-1" />
          {nonLocalises > 0 && <button type="button" className="btn-ghost" disabled={geo.busy} onClick={localiser}>Localiser mes contacts ({nonLocalises})</button>}
          <div className="flex overflow-hidden rounded-md border border-pierre text-[13px]">
            {(['liste', 'carte'] as const).map((v) => <button key={v} type="button" onClick={() => setVue(v)} className={`px-3 py-2 ${vue === v ? 'bg-sauge text-white' : 'bg-white'}`}>{v === 'liste' ? 'Liste' : 'Carte'}</button>)}
          </div>
          {geo.msg && <p className={`w-full text-[13px] ${geo.err ? 'text-terre' : 'text-sauge'}`}>{geo.msg}</p>}
        </div>
        {vue === 'carte' && (
          <div className="mb-5">
            <CarteContacts
              points={[
                ...(centre ? [{ id: '__centre', lat: centre.lat, lon: centre.lon, label: centre.label, color: '#B97A5B', centre: true }] : []),
                ...list.filter((x) => x.c.lat != null).map((x) => ({ id: x.c.id, lat: x.c.lat!, lon: x.c.lon!, label: `${x.c.societe || x.c.nom}${x.km != null ? ` · ${Math.round(x.km)} km` : ''}`, color: x.c.categorie === 'client' ? '#68725E' : x.c.categorie === 'entreprise' ? '#334B3D' : '#C9A15A' })),
              ]}
              onSelect={(id) => { const c = lib.contacts.find((x) => x.id === id); if (c) setEdit(c); }}
            />
            <p className="mt-1 text-[11px] text-charbon/55">Vert foncé : entreprises avec qui vous avez travaillé · ocre : entreprises possibles · vert clair : clients · terre : adresse recherchée.</p>
          </div>
        )}
        {list.length === 0 ? <p className="card p-8 text-center text-[14px] text-charbon/60">Aucun contact. Ajoutez-en un, ou reprenez ceux déjà saisis dans vos dossiers.</p> : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {list.map(({ c, km }) => {
              const ds = dossiersDe(c);
              return (
                <button key={c.id} type="button" onClick={() => setEdit(c)} className="card p-4 text-left hover:border-sauge">
                  <p className="label-caps">{CATEGORIES_CONTACT[c.categorie]}</p>
                  <p className="mt-1 font-serif text-lg font-semibold leading-tight text-foret">{c.societe || c.nom || 'Sans nom'}</p>
                  {c.societe && c.nom && <p className="text-[13px]">{c.nom}</p>}
                  <p className="text-[13px] text-charbon/60">{[c.metier, c.ville].filter(Boolean).join(' · ')}</p>
                  <p className="mt-1 text-[13px]">{[c.telephone, c.email].filter(Boolean).join(' · ')}</p>
                  {c.note ? <p className="text-[13px] text-terre">{'★'.repeat(c.note)}{'☆'.repeat(5 - c.note)}</p> : null}
                  {ds.length > 0 && <p className="mt-1 text-[12px] text-sauge">{ds.length} dossier{ds.length > 1 ? 's' : ''}</p>}
                  {km != null && <p className="mt-1 text-[12px] font-semibold text-terre">{km < 1 ? 'moins d’1 km' : `${Math.round(km)} km`}</p>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {edit && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-charbon/30 p-4" onClick={() => setEdit(null)}>
          <div className="card w-full max-w-2xl space-y-3 p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-2xl font-semibold text-foret">{lib.contacts.some((x) => x.id === edit.id) ? 'Modifier le contact' : 'Nouveau contact'}</p>
            <Field label="Catégorie">
              <select value={edit.categorie} onChange={(e) => setEdit({ ...edit, categorie: e.target.value as CategorieContact })} className="field">
                {(Object.keys(CATEGORIES_CONTACT) as CategorieContact[]).map((c) => <option key={c} value={c}>{CATEGORIES_CONTACT[c]}</option>)}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom de la personne"><Input value={edit.nom} onChange={(e) => setEdit({ ...edit, nom: e.target.value })} /></Field>
              <Field label="Société"><Input value={edit.societe} onChange={(e) => setEdit({ ...edit, societe: e.target.value })} /></Field>
              <Field label="Métier ou lot"><Combo value={edit.metier} onChange={(v) => setEdit({ ...edit, metier: v })} options={[...phrases('lots'), 'Architecte', 'Bureau d’études structure', 'Géotechnicien', 'Notaire', 'Agent immobilier']} /></Field>
              <Field label="Téléphone"><Input type="tel" value={edit.telephone} onChange={(e) => setEdit({ ...edit, telephone: e.target.value })} /></Field>
              <Field label="E-mail"><Input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
              <Field label="Adresse"><Input value={edit.adresse} onChange={(e) => setEdit({ ...edit, adresse: e.target.value })} /></Field>
              <Field label="Code postal"><Input value={edit.codePostal} onChange={(e) => setEdit({ ...edit, codePostal: e.target.value })} /></Field>
              <Field label="Ville"><Input value={edit.ville} onChange={(e) => setEdit({ ...edit, ville: e.target.value })} /></Field>
            </div>
            {edit.categorie !== 'client' && (
              <Field label="Mon appréciation">
                <div className="flex gap-1 text-[22px]">
                  {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setEdit({ ...edit, note: edit.note === n ? undefined : n })} className={n <= (edit.note ?? 0) ? 'text-terre' : 'text-pierre'}>★</button>)}
                </div>
              </Field>
            )}
            <Field label="Notes"><TextArea value={edit.notes} onChange={(v) => setEdit({ ...edit, notes: v })} placeholder="Spécialités, chantiers réalisés, disponibilité, remarques…" /></Field>
            {dossiersDe(edit).length > 0 && (
              <div>
                <p className="label-caps mb-1">Dossiers liés</p>
                <div className="flex flex-wrap gap-2">{dossiersDe(edit).map((d) => <button key={d.id} type="button" className="rounded-full border border-pierre px-3 py-1 text-[12px]" onClick={() => { setEdit(null); onOpen(d.id); }}>{d.numero} {d.meta.bien.commune}</button>)}</div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" className="btn-primary" onClick={() => save(edit)}>Enregistrer</button>
              {edit.email && <a className="btn-ghost" href={`mailto:${edit.email}`}>Écrire un mail</a>}
              {edit.telephone && <a className="btn-ghost" href={`tel:${edit.telephone.replace(/\s/g, '')}`}>Appeler</a>}
              {lib.contacts.some((x) => x.id === edit.id) && <button type="button" className="btn-quiet text-terre" onClick={() => { setLib({ ...lib, contacts: lib.contacts.filter((x) => x.id !== edit.id) }); setEdit(null); }}>Supprimer</button>}
              <button type="button" className="btn-quiet ml-auto" onClick={() => setEdit(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
