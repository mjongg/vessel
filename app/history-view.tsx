'use client';
import {ChevronRight} from 'lucide-react';
import type {HistoryItem,Profile} from './health-data';
import {dateText} from './health-data';
import {familyByPerson,historyFacts,historyNote,reportedNone} from './entry-helpers';
import {byline} from './care';
import {relatives} from './pick-lists';

const sections:[HistoryItem['kind'],string][]=[['Allergy','Allergies'],['Condition','Conditions & past illnesses'],['Surgery','Surgeries'],['Hospitalization','Hospitalizations'],['Family history','Family history']];

/** History as short labelled facts under each entry, so it can be scanned during a consult. */
export function HistoryView({profile,onOpen}:{profile:Profile;onOpen:(h:HistoryItem)=>void}){
 return <div className="history-view">{sections.map(([kind,title])=>{
  const items=profile.history.filter(h=>h.kind===kind);
  return <section className={'history-block'+(kind==='Allergy'&&items.length?' alert':'')} key={kind}>
   <h3>{title}{items.length>0&&<span>{items.length}</span>}</h3>
   {kind==='Family history'&&items.length?<dl className="family-read">{familyByPerson(items,relatives).map(([person,list])=><div key={person}><dt>{person}</dt><dd>{list.map(h=><button type="button" key={h.id} onClick={()=>onOpen(h)}>{h.title}{historyNote(h).trim()&&' ('+historyNote(h).trim()+')'}</button>)}</dd></div>)}</dl>:items.length?items.map(h=>{const note=historyNote(h).trim();const meta=[h.date&&dateText(h.date),h.facility,h.source,byline(h)].filter(Boolean).join(' · ');
    return <button type="button" className="history-entry" key={h.id} onClick={()=>onOpen(h)}><div>
     <strong>{h.title}</strong>
     {historyFacts(h).length>0&&<dl>{historyFacts(h).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
     {note&&<p>{note}</p>}<small>{meta}</small>
    </div><ChevronRight size={16}/></button>}):<p className="empty-line">{reportedNone(profile,kind)?'None reported.':'Not recorded / not confirmed.'}</p>}
  </section>})}</div>;
}
