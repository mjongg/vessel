'use client';
import type {Medicine} from './health-data';
import {medicineTimes,splitList} from './entry-helpers';

/** Current medicines laid out by time of day. Times come only from what someone entered, never from the frequency text. */
export function MedicationSchedule({medicines,onOpen}:{medicines:Medicine[];onOpen:(m:Medicine)=>void}){
 const active=medicines.filter(m=>['Current','Unconfirmed'].includes(m.status));
 const row=(m:Medicine)=><button type="button" className="schedule-row" key={m.id} onClick={()=>onOpen(m)}>
  <strong>{m.name}</strong><span className="schedule-dose">{m.dose||'Dose not recorded'}</span>
  {(m.frequency||m.status==='Unconfirmed')&&<small>{[m.frequency,m.status==='Unconfirmed'&&'Unconfirmed'].filter(Boolean).join(' · ')}</small>}
 </button>;
 const unset=active.filter(m=>!splitList(m.times).length);
 return <div className="med-schedule">
  {medicineTimes.map(slot=>{const items=active.filter(m=>splitList(m.times).includes(slot));return items.length?<section key={slot}><h4>{slot}<span>{items.length}</span></h4>{items.map(row)}</section>:null})}
  {unset.length>0&&<section><h4>Time not set<span>{unset.length}</span></h4><p className="muted">Tap a medicine to choose when it is taken, as prescribed.</p>{unset.map(row)}</section>}
 </div>;
}
