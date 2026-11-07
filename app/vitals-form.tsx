'use client';
import {useDraftState} from './drafts';
import {Field,Notes,Pick,Save,useSave} from './health-forms';
import {checkReading,vitalsToSave} from './entry-helpers';
import {localDateTime,type Profile,type Reading} from './health-data';

const blank={systolic:'',diastolic:'',pulse:'',temperature:'',oxygen:'',glucose:'',glucoseUnit:'mg/dL'};
const types=['Blood pressure','Pulse','Temperature','Oxygen saturation','Glucose'];

/** One round of vitals on one screen. Only the boxes filled in are saved, each as its own reading. */
export function VitalsForm({profile,commit,onSymptom}:{profile:Profile;commit:(p:Profile)=>Promise<void>;onSymptom:()=>void}){
 const[v,setV]=useDraftState('vitals',blank),[date,setDate]=useDraftState('date',localDateTime()),[note,setNote]=useDraftState('note','');
 // Fixed per form, so retrying after a failed save cannot create a second copy.
 const[ids]=useDraftState('ids',()=>Object.fromEntries(types.map(t=>[t,crypto.randomUUID()])));
 const{busy,error,run}=useSave();
 const box=(label:string,key:keyof typeof blank,unit:string,mode:'numeric'|'decimal'='numeric')=><Field label={label+' ('+unit+')'} inputMode={mode} maxLength={6} value={v[key]} onChange={e=>setV({...v,[key]:e.target.value})}/>;
 return <form className="entry-form" onSubmit={e=>{e.preventDefault();run(async()=>{
  const entries=vitalsToSave(v);
  if(!entries.length)throw new Error('Fill in at least one reading.');
  for(const r of entries){const problem=checkReading(r.type,r.value);if(problem)throw new Error(problem)}
  if(new Date(date).getTime()>Date.now()+60000)throw new Error('Choose the time these were taken, not a future time.');
  const at=new Date(date).toISOString();
  const readings:Reading[]=entries.map(r=>({id:ids[r.type],...r,date:at,note,author:'Account owner',corrections:[]}));
  await commit({...profile,readings:[...readings,...profile.readings]});
 })}}>
  <p className="muted">Fill in only what was measured. Blank boxes are skipped.</p>
  <Field label="Date and time measured" type="datetime-local" required value={date} onChange={e=>setDate(e.target.value)}/>
  <div className="field"><span>Blood pressure (mmHg)</span><div className="bp-row"><input aria-label="Systolic, the top number" inputMode="numeric" maxLength={3} placeholder="Top" value={v.systolic} onChange={e=>setV({...v,systolic:e.target.value})}/><span aria-hidden="true">/</span><input aria-label="Diastolic, the bottom number" inputMode="numeric" maxLength={3} placeholder="Bottom" value={v.diastolic} onChange={e=>setV({...v,diastolic:e.target.value})}/></div></div>
  <div className="two-fields vitals-grid">{box('Pulse','pulse','bpm')}{box('Temperature','temperature','°C','decimal')}{box('Oxygen','oxygen','%')}</div>
  <div className="two-fields vitals-grid">{box('Blood sugar','glucose',v.glucoseUnit,'decimal')}<Pick label="Sugar unit" value={v.glucoseUnit} onChange={u=>setV({...v,glucoseUnit:u})} options={['mg/dL','mmol/L']}/></div>
  <Notes label="Notes (for example, fasting, after meals, or sitting)" value={note} onChange={e=>setNote(e.target.value)}/>
  <p className="muted">Recording for <strong>{profile.name}</strong>. Entries describe what was measured; they do not diagnose a condition.</p>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <Save busy={busy} label="Save vitals"/>
  <button type="button" className="text-btn" onClick={onSymptom}>Record a symptom instead</button>
 </form>;
}
