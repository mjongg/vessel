import type {Profile} from './health-data';

export type EntryKind='records'|'history'|'medicines'|'readings'|'vaccines';
export const entryKinds:EntryKind[]=['records','history','medicines','readings','vaccines'];
export type EntryWrite={kind:EntryKind;entry:{id:string};previous:{id:string}|null};

/**
 * What a care-team member's save must send: only entries that were added or changed.
 * `previous` is the entry exactly as it was loaded, so the database can refuse a write over someone else's newer change.
 * Removing entries and editing profile details stay with the record's admin.
 */
export function planSharedSave(before:Profile,next:Profile):EntryWrite[]{
 const writes:EntryWrite[]=[];
 for(const kind of entryKinds){
  const was=new Map((before[kind] as {id:string}[]).map(e=>[e.id,e]));
  const now=next[kind] as {id:string}[];
  if([...was.keys()].some(id=>!now.some(e=>e.id===id)))throw new Error('Only this record’s admin can remove entries.');
  for(const entry of now){const previous=was.get(entry.id)||null;if(!previous||JSON.stringify(previous)!==JSON.stringify(entry))writes.push({kind,entry,previous})}
 }
 if(!writes.length){
  const rest=(p:Profile)=>JSON.stringify({...p,records:0,history:0,medicines:0,readings:0,vaccines:0});
  if(rest(before)!==rest(next))throw new Error('Only this record’s admin can change profile details, contacts or monitoring settings.');
 }
 return writes;
}
