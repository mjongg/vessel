'use client';
import {useCallback,useEffect,useState} from 'react';
import {Check,ChevronLeft,ChevronRight,X} from 'lucide-react';
import type {Medicine} from './health-data';
import {medicineTimes,splitList} from './entry-helpers';
import {vesselFetch} from './api-client';
import {manilaDay,progress,shiftDay,type DoseMark} from './doses';

type Target={access?:string;profile?:string};
const dayLabel=(day:string)=>{const today=manilaDay();const name=day===today?'Today':day===shiftDay(today,-1)?'Yesterday':day===shiftDay(today,1)?'Tomorrow':'';const date=new Date(day+'T12:00:00Z').toLocaleDateString('en-PH',{weekday:name?undefined:'short',month:'short',day:'numeric',timeZone:'UTC'});return name?name+', '+date:date};
const timeText=(iso:string)=>new Date(iso).toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'});

/** Current medicines by time of day, with a tick for each dose. Times come only from what someone entered, never from the frequency text.
 *  A tick records that someone reported the dose as given or skipped. It never changes the medicine or its schedule. */
export function MedicationSchedule({medicines,onOpen,target,canMark}:{medicines:Medicine[];onOpen:(m:Medicine)=>void;target:Target;canMark:boolean}){
 const active=medicines.filter(m=>['Current','Unconfirmed'].includes(m.status));
 const[day,setDay]=useState(manilaDay),[marks,setMarks]=useState<DoseMark[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
 const query=new URLSearchParams({...(target.access?{access:target.access}:{profile:target.profile||''}),from:day,to:day}).toString();
 const load=useCallback(async()=>{try{const r=await vesselFetch('/api/doses?'+query,{cache:'no-store'});const d=await r.json() as {doses?:DoseMark[];error?:string};if(!r.ok)throw new Error(d.error);setMarks(d.doses||[]);setError('')}catch(e){setError(e instanceof Error&&e.message?e.message:'Ticks could not be loaded.')}},[query]);
 // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the day's ticks from the server
 useEffect(()=>{void load()},[load]);
 async function mark(m:Medicine,slot:string,status:'given'|'skipped'|null){
  const key=m.id+slot;if(busy)return;setBusy(key);setError('');
  const before=marks;
  setMarks([...marks.filter(x=>!(x.medicineId===m.id&&x.slot===slot)),...(status?[{medicineId:m.id,day,slot:slot as DoseMark['slot'],status,by:'You',at:new Date().toISOString()}]:[])]);
  try{const r=await vesselFetch('/api/doses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...target,medicine:m.id,day,slot,status})});const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(d.error);await load()}
  catch(e){setMarks(before);setError(e instanceof Error&&e.message?e.message:'Not saved. Try again.')}
  finally{setBusy('')}
 }
 const due=active.flatMap(m=>splitList(m.times).map(slot=>({id:m.id,slot})));
 const {done,total}=progress(due,marks,day);
 const today=manilaDay(),canGoForward=day<shiftDay(today,1),canGoBack=day>shiftDay(today,-31);
 const row=(m:Medicine,slot?:string)=>{
  const tick=slot?marks.find(x=>x.medicineId===m.id&&x.slot===slot):undefined;
  return <div className={'schedule-row'+(tick?' '+tick.status:'')} key={m.id+(slot||'')}>
   {slot&&canMark&&<button type="button" className="dose-tick" aria-pressed={tick?.status==='given'} disabled={busy===m.id+slot} aria-label={(tick?.status==='given'?'Undo: ':'Mark given: ')+m.name+', '+slot} onClick={()=>mark(m,slot,tick?.status==='given'?null:'given')}>{tick?.status==='given'?<Check size={22}/>:tick?.status==='skipped'?<X size={20}/>:null}</button>}
   <button type="button" className="schedule-main" onClick={()=>onOpen(m)}>
    <strong>{m.name}</strong><span className="schedule-dose">{m.dose||'Dose not recorded'}</span>
    {(m.frequency||m.status==='Unconfirmed')&&<small>{[m.frequency,m.status==='Unconfirmed'&&'Unconfirmed'].filter(Boolean).join(' · ')}</small>}
    {tick&&<small className="tick-note">{tick.status==='given'?'Given':'Skipped'} · {tick.by} · {timeText(tick.at)}</small>}
   </button>
   {slot&&canMark&&!tick&&<button type="button" className="text-btn skip-btn" disabled={busy===m.id+slot} onClick={()=>mark(m,slot,'skipped')}>Skipped</button>}
  </div>;
 };
 const unset=active.filter(m=>!splitList(m.times).length);
 return <div className="med-schedule">
  {due.length>0&&<div className="dose-day"><button type="button" className="outline icon-only" aria-label="Previous day" disabled={!canGoBack} onClick={()=>setDay(shiftDay(day,-1))}><ChevronLeft size={18}/></button><div><strong>{dayLabel(day)}</strong>{total>0&&<span>{done} of {total} doses ticked</span>}</div><button type="button" className="outline icon-only" aria-label="Next day" disabled={!canGoForward} onClick={()=>setDay(shiftDay(day,1))}><ChevronRight size={18}/></button></div>}
  {error&&<p role="alert" className="form-error">{error}</p>}
  {medicineTimes.map(slot=>{const items=active.filter(m=>splitList(m.times).includes(slot));return items.length?<section key={slot}><h4>{slot}<span>{items.length}</span></h4>{items.map(m=>row(m,slot))}</section>:null})}
  {unset.length>0&&<section><h4>Time not set<span>{unset.length}</span></h4><p className="muted">Tap a medicine to choose when it is taken, as prescribed. Then it can be ticked off.</p>{unset.map(m=>row(m))}</section>}
  {due.length>0&&<p className="muted dose-footnote">A tick records what someone reported. It does not change the medicine or its dose. Check with the doctor before changing any medicine.</p>}
 </div>;
}
