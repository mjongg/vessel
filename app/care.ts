import type {Profile,Stamp} from './health-data';
import {vesselFetch} from './api-client';
import {entryKinds,planSharedSave,type EntryKind} from './care-diff';
export type {EntryKind};

export type CareRole='caregiver'|'patient'|'contributor'|'viewer';
export type SharedProfile={access:string;role:CareRole;label:string;sharedBy:string;profile:Profile};

export const roleNames:Record<CareRole,string>={caregiver:'Caregiver',patient:'Patient',contributor:'Contributor',viewer:'Viewer'};
export const roleDetails:Record<CareRole,string>={
 caregiver:'Can see the whole record, add entries and correct any entry.',
 patient:'The person this record is about. Can see the whole record and add entries; can correct only their own.',
 contributor:'Can see readings, medications and allergies. Can add readings, medications and documents; can correct only their own.',
 viewer:'Can see the whole record. Cannot add or change anything.',
};
const addable:Record<CareRole,EntryKind[]>={caregiver:entryKinds,patient:entryKinds,contributor:['readings','medicines','records'],viewer:[]};
export const canAdd=(role:CareRole,kind:EntryKind)=>addable[role].includes(kind);

// A shared profile gets a local id that cannot collide with the viewer's own profiles.
export const sharedId=(access:string)=>'care:'+access;
export const byline=(entry:Stamp)=>entry.editedBy?'Corrected by '+entry.editedBy:entry.addedBy?'Added by '+entry.addedBy:'';

export async function loadShared():Promise<SharedProfile[]>{
 try{
  const r=await vesselFetch('/api/care?profiles=1',{cache:'no-store'});
  if(!r.ok)return [];
  const d=await r.json() as {shared:SharedProfile[]};
  return d.shared.map(s=>({...s,profile:{...s.profile,id:sharedId(s.access)}}));
 }catch{return []}
}

/** Sends only the entries that were added or changed; see planSharedSave for the rules. */
export async function saveShared(before:SharedProfile,next:Profile){
 for(const write of planSharedSave(before.profile,next)){
  const r=await vesselFetch('/api/care',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'write',access:before.access,...write})});
  if(!r.ok){const d=await r.json().catch(()=>({})) as {error?:string};throw new Error(d.error||'Unable to save. Your entry is still open to retry.')}
 }
}
