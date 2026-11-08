'use client';
import {useEffect,useState} from 'react';
import {Users,FileText,Pill,ArrowUpRight,UserPlus,Search,Clock} from 'lucide-react';
import {dateText,initials,type Profile} from './health-data';
import {splitList} from './entry-helpers';
import {vesselFetch} from './api-client';
import {manilaDay,progress,type DoseMark} from './doses';
import {latestVitals,recentActivity} from './activity';
type Destination='Home'|'Records'|'Medications'|'Monitoring'|'Visit';
const short:Record<string,string>={'Blood pressure':'BP','Oxygen saturation':'O₂','Glucose':'Sugar','Temperature':'Temp','Pulse':'Pulse'};
const when=(iso:string)=>{const d=new Date(iso);const sameDay=manilaDay(d)===manilaDay();return sameDay?d.toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'}):dateText(iso)};
const dueToday=(p:Profile)=>p.medicines.filter(m=>m.status==='Current'||m.status==='Unconfirmed').flatMap(m=>splitList(m.times).map(slot=>({id:m.id,slot})));

/** The admin's view of everyone: today's medicines, latest vitals, what needs review and who changed what. */
export function FamilyDashboard({profiles,detailed,onOpen,onAdd}:{profiles:Profile[];detailed:boolean;onOpen:(id:string,destination:Destination)=>void;onAdd:()=>void}){
 const [search,setSearch]=useState('');
 const [doses,setDoses]=useState<Record<string,DoseMark[]>>({});
 const scheduleKey=profiles.filter(p=>dueToday(p).length).map(p=>p.id).join(',');
 useEffect(()=>{let active=true;const day=manilaDay();
  Promise.all(scheduleKey.split(',').filter(Boolean).map(async id=>{try{const r=await vesselFetch('/api/doses?'+new URLSearchParams({profile:id,from:day,to:day}),{cache:'no-store'});const d=await r.json() as {doses?:DoseMark[]};return [id,r.ok?d.doses||[]:[]] as const}catch{return [id,[]] as const}}))
   .then(list=>{if(active)setDoses(Object.fromEntries(list))});
  return()=>{active=false}},[scheduleKey]);
 const visible=profiles.filter(p=>(p.name+' '+p.relationship).toLowerCase().includes(search.toLowerCase()));
 const pending=profiles.reduce((n,p)=>n+p.records.filter(r=>!r.reviewed).length,0);
 const today=manilaDay();
 const totals=profiles.reduce((t,p)=>{const x=progress(dueToday(p),doses[p.id]||[],today);return {done:t.done+x.done,total:t.total+x.total}},{done:0,total:0});
 return <div className="family-dashboard"><section className="card family-intro"><div><span className="eyebrow">{detailed?'FAMILY ADMIN WORKSPACE':'YOUR FAMILY'}</span><p>{detailed?'Everyone you look after, at a glance: today’s medicines, latest readings, and what changed.':'Keep the people you care for together in one place.'}</p></div><button className="primary" onClick={onAdd}><UserPlus size={18}/>Add family member</button></section>
 <div className="family-metrics"><div className="card"><Users size={20}/><strong>{profiles.length}</strong><span>{profiles.length===1?'Profile':'Profiles'}</span></div><div className="card"><Pill size={20}/><strong>{totals.total?totals.done+'/'+totals.total:'–'}</strong><span>Doses ticked today</span></div><div className="card"><FileText size={20}/><strong>{pending}</strong><span>Documents to review</span></div></div>
 {profiles.length>3&&<label className="family-search"><Search size={18}/><span className="sr-only">Find a family profile</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a family profile"/></label>}
 <div className="family-grid">{visible.map(p=>{
  const medicines=p.medicines.filter(m=>m.status==='Current');const allergies=p.history.filter(h=>h.kind==='Allergy');const conditions=p.history.filter(h=>h.kind==='Condition');const followups=p.vaccines.filter(v=>v.due).sort((a,b)=>a.due.localeCompare(b.due));
  const due=dueToday(p),dose=progress(due,doses[p.id]||[],today),vitals=latestVitals(p.readings),activity=recentActivity(p),toReview=p.records.filter(r=>!r.reviewed).length;
  return <article className="card family-card" key={p.id}>
   <div className="family-card-head"><span className="avatar">{initials(p.name)}</span><div><h2>{p.name}</h2><p>{p.relationship==='You'?'You':p.relationship}{p.dob?' · '+dateText(p.dob):''}</p></div></div>
   <dl className="family-today">
    <div><dt>Medicines today</dt><dd>{due.length?<button type="button" className="link-btn" onClick={()=>onOpen(p.id,'Medications')}>{dose.done} of {dose.total} ticked</button>:medicines.length?'Times not set':'None recorded'}</dd></div>
    <div><dt>Latest readings</dt><dd>{vitals.length?<span className="vital-chips">{vitals.slice(0,3).map(r=><span key={r.type}>{short[r.type]||r.type} <strong>{r.value}</strong><small>{when(r.date)}</small></span>)}</span>:'None yet'}</dd></div>
    {toReview>0&&<div><dt>To review</dt><dd><button type="button" className="link-btn" onClick={()=>onOpen(p.id,'Records')}>{toReview} {toReview===1?'document':'documents'}</button></dd></div>}
   </dl>
   {detailed&&activity.length>0&&<details className="family-detail"><summary><Clock size={15}/> Recent activity</summary><ul className="activity-list">{activity.map((a,i)=><li key={i}><strong>{a.who}</strong> {a.what}<small>{when(a.at)}</small></li>)}</ul></details>}
   {detailed&&<details className="family-detail"><summary>Allergies, medicines and follow-ups</summary><dl><div><dt>Allergies</dt><dd>{allergies.length?allergies.map(a=>a.title).join(', '):p.details?.allergyStatus==='None known'?'None known (reported)':'Not recorded / unknown'}</dd></div><div><dt>Conditions</dt><dd>{conditions.length?conditions.map(c=>c.title).join(', '):'Not recorded'}</dd></div><div><dt>Current Medications</dt><dd>{medicines.length?medicines.map(m=>[m.name,m.dose,m.frequency].filter(Boolean).join(' · ')).join('; '):p.details?.medicineStatus==='None reported'?'None reported':'Not recorded / unknown'}</dd></div><div><dt>Saved Vaccine Follow-ups</dt><dd>{followups.length?followups.map(v=><span className="family-followup" key={v.id}>{v.name} · {dateText(v.due)}</span>):'No dates recorded'}</dd></div></dl><p className="muted">Dates are saved reminders, not confirmed appointments. Medical details are reported, not verified.</p></details>}
   <button className="outline full" onClick={()=>onOpen(p.id,'Home')}>Open Health Record <ArrowUpRight size={16}/></button>{detailed&&<div className="family-actions"><button className="text-btn" onClick={()=>onOpen(p.id,'Monitoring')}>Readings</button><button className="text-btn" onClick={()=>onOpen(p.id,'Visit')}>Doctor Summary</button></div>}
  </article>})}</div>{!visible.length&&<p className="empty-line">No profiles match your search.</p>}
 </div>
}
