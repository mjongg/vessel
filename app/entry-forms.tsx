'use client';
import type {HistoryItem,Medicine,Profile} from './health-data';
import {useDraftState} from './drafts';
import {Field,Pick,Save,useSave} from './health-forms';
import {ChoiceField,OptionSelect} from './pickers';
import {HistoryEntryFields,historyGroups,historyKinds} from './history-entry';
import {composeHistory} from './entry-helpers';
import {antibioticNames,frequencies,medicineGroups} from './pick-lists';

type Base={profile:Profile;commit:(profile:Profile)=>Promise<void>};
const thisYear=()=>Number(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric'}).format(new Date()));

export function MedicineForm({profile,commit,existing}:{existing?:Medicine}&Base){
 const[m,setM]=useDraftState<Medicine>('m',existing||{id:crypto.randomUUID(),name:'',dose:'',frequency:'',start:'',end:'',kind:'Maintenance',status:'Current'});
 const{busy,error,run}=useSave();
 // Tapping a name fills in the name (and marks an antibiotic as one). Dose and instructions are never assumed.
 const choose=(name:string)=>setM({...m,name,kind:antibioticNames.has(name)?'Antibiotic':m.kind==='Antibiotic'?'Maintenance':m.kind});
 return <form className="entry-form" onSubmit={e=>{e.preventDefault();run(async()=>{
   if(!m.name.trim())throw new Error('Choose or type the medicine name.');
   if(m.end&&m.start&&m.end<m.start)throw new Error('End date must be on or after the start date.');
   const saved={...m,name:m.name.trim()};
   await commit({...profile,medicines:existing?profile.medicines.map(x=>x.id===m.id?saved:x):[...profile.medicines,saved]});
  })}}>
  <div className="info-note">Copy the medicine name, dose and instructions from the prescription or packaging. Leave unknown details blank.</div>
  <OptionSelect label="Choose a medicine" groups={medicineGroups} onPick={(_,v)=>choose(v)} otherLabel="Medicine name"/>
  <Field label="Medicine name" required maxLength={300} placeholder="Choose above, or type here" value={m.name} onChange={e=>setM({...m,name:e.target.value})}/>
  <Field label="Dose, as written (including unit)" placeholder="e.g. 50 mg" maxLength={300} value={m.dose} onChange={e=>setM({...m,dose:e.target.value})}/>
  <ChoiceField label="How often, as prescribed" options={frequencies} value={m.frequency} onChange={v=>setM({...m,frequency:v})} placeholder="Type the instructions"/>
  <div className="two-fields">
   <Pick label="Type" value={m.kind} onChange={v=>setM({...m,kind:v as Medicine['kind']})} options={['Maintenance','Antibiotic','Other']}/>
   <Pick label="Status" value={m.status} onChange={v=>setM({...m,status:v as Medicine['status']})} options={['Current','Completed','Stopped','Unconfirmed']}/>
   <Field label="Started (if known)" type="date" value={m.start} onChange={e=>setM({...m,start:e.target.value})}/>
   <Field label="Ended (if known)" type="date" value={m.end} onChange={e=>setM({...m,end:e.target.value})}/>
  </div>
  {error&&<p role="alert" className="form-error">{error}</p>}
  <Save busy={busy} label="Save medication"/>
 </form>;
}

export function HistoryForm({profile,commit,existing}:{existing?:HistoryItem}&Base){
 const[h,setH]=useDraftState<HistoryItem>('h',existing||{id:crypto.randomUUID(),kind:'Allergy',title:'',details:'',date:'',facility:'',source:'Patient reported',note:''});
 const{busy,error,run}=useSave();
 const groups=historyGroups(h.kind);
 const label=h.kind==='Allergy'?'What is the allergy to?':h.kind==='Condition'?'Which condition?':h.kind==='Surgery'?'Which surgery?':h.kind==='Hospitalization'?'Reason for admission':'Which illness runs in the family?';
 return <form className="entry-form" onSubmit={e=>{e.preventDefault();run(async()=>{
   if(!h.title.trim())throw new Error('Choose an option or type a name first.');
   if(h.year&&(h.year.length!==4||Number(h.year)>thisYear()))throw new Error('Enter the year as four digits, not in the future.');
   const saved=composeHistory({...h,title:h.title.trim()});
   await commit({...profile,history:existing?profile.history.map(x=>x.id===h.id?saved:x):[...profile.history,saved]});
  })}}>
  <Pick label="History type" value={h.kind} options={historyKinds} onChange={v=>setH(composeHistory({...h,kind:v as HistoryItem['kind'],title:existing?h.title:'',category:undefined}))}/>
  <OptionSelect label="Choose from the list" groups={groups} onPick={(g,v)=>setH(composeHistory({...h,title:v,category:h.kind==='Allergy'?g:undefined}))}/>
  <Field label={label} required maxLength={300} placeholder="Choose above, or type here" value={h.title} onChange={e=>setH({...h,title:e.target.value})}/>
  {h.kind==='Allergy'&&<Pick label="Kind of allergy" value={h.category||'Not specified'} options={['Drug','Food','Environmental','Not specified']} onChange={v=>setH(composeHistory({...h,category:v==='Not specified'?undefined:v}))}/>}
  <HistoryEntryFields entry={h} onChange={setH}/>
  <Pick label="Information source" value={h.source} options={['Patient reported','Caregiver reported','From a medical document']} onChange={v=>setH({...h,source:v})}/>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <Save busy={busy} label="Save history"/>
 </form>;
}
