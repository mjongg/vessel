'use client';
import {useEffect,useRef,useState} from 'react';
import type {Profile,ProfileDetails,HistoryItem,Medicine} from './health-data';
import {useDraftState} from './drafts';
import {Chips,ChoiceField,DoseInput,NoneButton,OptionSelect,PhoneInput} from './pickers';
import {HistorySection,historyKinds,historyTitles} from './history-entry';
import {byName,doseNeedsUnit,familyByPerson,medicineTimes,reportedNone,splitList,toggleInList} from './entry-helpers';
import {dateText} from './health-data';
import {alcoholOptions,antibioticNames,emergencyRelationships,forSex,frequencies,medicineGroups,medicineScreen,relationshipsToYou,relatives,smokingOptions,suggestedMedicines} from './pick-lists';

const defaults:ProfileDetails={preferredName:'',sex:'',bloodType:'',phone:'',email:'',address:'',emergencyName:'',emergencyRelationship:'',emergencyPhone:'',allergyStatus:'Unknown',medicineStatus:'Unknown'};
const steps=['Personal Details','Contact & Emergency','Medical History','Medications','Review'];
const hints=(self:boolean)=>[
 (self?'Your':'Their')+' full name is required. Everything else can be added later.',
 'Add the best way to reach '+(self?'you':'them')+' and someone to contact in an emergency.',
 'Answer each section with one tap, or open it to add entries. Skip anything you are unsure of.',
 'Add medicines taken now or recently. Copy the dose from the prescription or packaging; if unsure, leave it blank. Prescriptions and vaccine cards can be uploaded from Records after setup.',
 'Check the details before saving. Use Back to make a correction.',
];
const autoComplete:Partial<Record<keyof ProfileDetails,string>>={preferredName:'nickname',email:'email',address:'street-address',emergencyName:'section-emergency name'};
const reviewLabels:Record<string,string>={preferredName:'Preferred Name',sex:'Sex Assigned at Birth',bloodType:'Blood Type',phone:'Phone',email:'Contact Email',address:'Address',emergencyName:'Emergency Contact',emergencyRelationship:'Relationship',emergencyPhone:'Emergency Phone',smoking:'Smoking',alcohol:'Alcohol',occupation:'Work',lmp:'Last Menstrual Period'};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(new Date());
const blankProfile=():Profile=>({id:crypto.randomUUID(),name:'',dob:'',relationship:'',role:'Managed profile',monitoring:false,records:[],history:[],medicines:[],readings:[],vaccines:[],details:{...defaults}});

export function ProfileEditor({existing,onSave,onSaveStep,onboarding=false}:{existing?:Profile;onSave:(p:Profile)=>Promise<void>;onSaveStep?:(p:Profile)=>Promise<void>;onboarding?:boolean}){
 const[draft,setDraft]=useDraftState<Profile>('profile-details',()=>existing?{...existing,details:{...defaults,...existing.details}}:blankProfile());
 const[step,setStep]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus()},[step]);

 const details={...defaults,...draft.details};
 // Adding someone else: the form speaks about them, and "You" is not offered because the account already has its own profile.
 const self=onboarding||existing?.role==='Owner';
 const relationships=self?relationshipsToYou:relationshipsToYou.filter(r=>r!=='You');
 const[openMed,setOpenMed]=useState<string|null>(null);
 const addMedicine=(name:string)=>{const m=newMedicine(name);setDraft(p=>({...p,medicines:[...p.medicines,m]}));setOpenMed(m.id)};
 const source=draft.relationship==='You'?'Patient reported':'Caregiver reported';
 const hasAllergies=draft.history.some(h=>h.kind==='Allergy'),hasCurrentMeds=draft.medicines.some(m=>m.status==='Current');
 const field=(key:keyof ProfileDetails,value:string)=>setDraft(p=>({...p,details:{...defaults,...p.details,[key]:value}}));
 const patchMedicine=(id:string,patch:Partial<Medicine>)=>setDraft(p=>({...p,medicines:p.medicines.map(m=>m.id===id?{...m,...patch}:m)}));
 const text=(label:string,key:keyof ProfileDetails,type='text',maxLength=300)=><label className="field"><span>{label}</span><input type={type} autoComplete={autoComplete[key]} maxLength={maxLength} value={details[key]} onChange={e=>field(key,e.target.value)}/></label>;

 function validate(){
  if(!draft.name.trim()||draft.name==='Your name')throw new Error('Enter the patient’s full name.');
  if(!draft.relationship)throw new Error('Choose how this person is related to you.');
  if(draft.dob&&draft.dob>today())throw new Error('Date of birth cannot be in the future.');
  if(draft.history.some(h=>!h.title.trim()))throw new Error('Name each medical history entry, or remove the empty entry.');
  if(draft.history.some(h=>h.year&&(h.year.length!==4||Number(h.year)>Number(today().slice(0,4)))))throw new Error('Enter each year as four digits, not in the future.');
  if(draft.medicines.some(m=>!m.name.trim()))throw new Error('Name each medication, or remove the empty entry.');
  const noUnit=draft.medicines.find(m=>doseNeedsUnit(m.dose));
  if(noUnit)throw new Error('Choose the unit for '+noUnit.name+', such as mg.');
  if(draft.medicines.some(m=>m.start&&m.end&&m.start>m.end))throw new Error('A medication’s end date must follow its start date.');
 }
 // "Listed" is derived from the entries; a "none" answer only stands while there are no entries.
 function payload(finish:boolean):Profile{
  const allergyStatus=hasAllergies?'Listed':details.allergyStatus==='Listed'?'Unknown':details.allergyStatus;
  const medicineStatus=hasCurrentMeds?'Listed':details.medicineStatus==='Listed'?'Unknown':details.medicineStatus;
  const noneReported=splitList(details.noneReported).filter(k=>!draft.history.some(h=>h.kind===k)).join('; ');
  return {...draft,name:draft.name.trim(),role:draft.relationship==='You'?'Owner':'Managed profile',details:{...details,phone:details.phone.trim(),emergencyPhone:details.emergencyPhone.trim(),allergyStatus,medicineStatus,noneReported},...(finish?{onboardingCompletedAt:draft.onboardingCompletedAt||new Date().toISOString()}:{})};
 }
 async function save(finish:boolean){
  if(busy)return;setError('');setSaved('');
  try{
   validate();setBusy(true);
   if(finish)await onSave(payload(true));
   else{await onSaveStep?.(payload(false));setSaved(steps[step]+' saved.');setStep(step+1)}
  }catch(e){setError(e instanceof Error?e.message:'Could not save. Your entries are kept here.')}
  finally{setBusy(false)}
 }
 function submit(e:React.FormEvent){e.preventDefault();void save(step===4)}

 const personal=<>
  <label className="field"><span>{self?'Full Name *':'Their Full Name *'}</span><input required maxLength={100} autoComplete="name" value={draft.name==='Your name'?'':draft.name} onChange={e=>setDraft(p=>({...p,name:e.target.value}))}/></label>
  <div className="two-fields">{text('Preferred Name','preferredName')}<label className="field"><span>Date of Birth</span><input type="date" autoComplete="bday" max={today()} value={draft.dob} onChange={e=>setDraft(p=>({...p,dob:e.target.value}))}/></label></div>
  <div className="two-fields">
   <label className="field"><span>Sex Assigned at Birth (optional)</span><select value={details.sex} onChange={e=>field('sex',e.target.value)}>{['','Female','Male','Intersex','Prefer not to say'].map(v=><option key={v} value={v}>{v||'Not recorded'}</option>)}</select></label>
   <label className="field"><span>Blood Type (if confirmed)</span><select value={details.bloodType} onChange={e=>field('bloodType',e.target.value)}>{['','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v=><option key={v} value={v}>{v||'Unknown'}</option>)}</select></label>
  </div>
  <label className="field"><span>Relationship to You</span><select required value={draft.relationship} onChange={e=>setDraft(p=>({...p,relationship:e.target.value}))}>{!draft.relationship&&<option value="">Choose…</option>}{[...new Set([...relationships,draft.relationship])].filter(Boolean).map(v=><option key={v}>{v}</option>)}</select></label>
  <p className="info-note">{self?'These details are self-reported.':'Only add someone you are authorized to care for. These details are as reported by you.'}</p>
 </>;

 const contact=<>
  <div className="two-fields"><PhoneInput label="Contact Number" autoComplete="tel-national" value={details.phone} onChange={v=>field('phone',v)}/>{text('Contact Email','email','email',254)}</div>
  {self&&<p className="field-hint">Your contact email does not change the email you use to sign in.</p>}
  {text('Home Address (optional)','address','text',1000)}
  <h3>Emergency Contact</h3>
  <p className="muted">For reference only. Adding a contact does not grant them access or send a notification.</p>
  {text('Emergency Contact Name','emergencyName')}
  <ChoiceField label="Relationship" options={emergencyRelationships} value={details.emergencyRelationship} onChange={v=>field('emergencyRelationship',v)} placeholder="Type the relationship"/>
  <PhoneInput label="Emergency Contact Number" value={details.emergencyPhone} onChange={v=>field('emergencyPhone',v)}/>
 </>;

 const setNone=(kind:HistoryItem['kind'],on:boolean)=>kind==='Allergy'?field('allergyStatus',on?'None known':'Unknown'):field('noneReported',toggleInList(details.noneReported,kind));
 const history=<>
  {historyKinds.map(kind=><HistorySection key={kind} kind={kind} entries={draft.history} source={source} sex={details.sex} none={reportedNone({...draft,details},kind)} onNone={on=>setNone(kind,on)} onChange={next=>setDraft(p=>({...p,history:next}))}/>)}
  <section className="history-card"><h3>Lifestyle</h3>
   <div className="two-fields"><ChoiceField label="Smoking" options={smokingOptions} value={details.smoking||''} onChange={v=>field('smoking',v)}/><ChoiceField label="Alcohol" options={alcoholOptions} value={details.alcohol||''} onChange={v=>field('alcohol',v)}/></div>
   <div className="two-fields">{text('Work or Occupation','occupation')}{details.sex!=='Male'&&<label className="field"><span>Last Menstrual Period (if applicable)</span><input type="date" max={today()} value={details.lmp||''} onChange={e=>field('lmp',e.target.value)}/></label>}</div>
  </section>
 </>;

 const medicines=<>
  {!draft.medicines.length&&<NoneButton label="Not taking any medicines" on={details.medicineStatus==='None reported'} onChange={on=>field('medicineStatus',on?'None reported':'Unknown')}/>}
  {(draft.medicines.length>0||details.medicineStatus!=='None reported')&&<>
   <OptionSelect label="Add a medicine" groups={forSex(medicineGroups,details.sex)} common={suggestedMedicines(draft.history.filter(h=>h.kind==='Condition').map(h=>h.title),details.sex)} isTaken={v=>draft.medicines.some(m=>m.name===v)} onPick={(_,v)=>addMedicine(v)} otherLabel="Medicine name"/>
   <div className="field"><span>Also taking?</span><Chips label="Also taking" options={[...medicineScreen].sort(byName)} selected={medicineScreen.filter(v=>draft.medicines.some(m=>m.name===v))} onToggle={v=>{if(draft.medicines.some(m=>m.name===v))setDraft(p=>({...p,medicines:p.medicines.filter(m=>m.name!==v)}));else addMedicine(v)}}/></div>
  </>}
  {draft.medicines.map(m=><section className="entry-card" key={m.id}>
   <div className="picked-head"><strong>{m.name||'New medication'}</strong><button type="button" className="text-btn" onClick={()=>setDraft(p=>({...p,medicines:p.medicines.filter(x=>x.id!==m.id)}))}>Remove</button></div>
   <details className="entry-more" open={openMed===m.id} onToggle={e=>{const open=e.currentTarget.open;setOpenMed(now=>open?m.id:now===m.id?null:now)}}><summary>{openMed===m.id?'Hide details':[m.dose,m.frequency,splitList(m.times).join(', ')].filter(Boolean).join(' · ')||'Add dose and schedule'}</summary><div className="entry-fields">
   <DoseInput value={m.dose} onChange={v=>patchMedicine(m.id,{dose:v})}/>
   <ChoiceField label="How often, as prescribed" options={frequencies} value={m.frequency} onChange={v=>patchMedicine(m.id,{frequency:v})} placeholder="Type the instructions"/>
   <div className="field"><span>When is it taken? Tap all that apply</span><Chips label="When it is taken" options={medicineTimes} selected={splitList(m.times)} onToggle={v=>patchMedicine(m.id,{times:toggleInList(m.times,v)})}/></div>
   <details className="entry-more"><summary>Type, status and dates</summary><div className="entry-fields"><div className="two-fields">
    <label className="field"><span>Type</span><select value={m.kind} onChange={e=>patchMedicine(m.id,{kind:e.target.value as Medicine['kind']})}>{['Maintenance','Antibiotic','Other'].map(v=><option key={v}>{v}</option>)}</select></label>
    <label className="field"><span>Status</span><select value={m.status} onChange={e=>patchMedicine(m.id,{status:e.target.value as Medicine['status']})}>{['Current','Completed','Stopped','Unconfirmed'].map(v=><option key={v}>{v}</option>)}</select></label>
   </div>
   <div className="two-fields"><label className="field"><span>Start Date</span><input type="date" value={m.start} onChange={e=>patchMedicine(m.id,{start:e.target.value})}/></label><label className="field"><span>End Date</span><input type="date" value={m.end} onChange={e=>patchMedicine(m.id,{end:e.target.value})}/></label></div></div></details>
   </div></details>
  </section>)}
 </>;

 const filled=Object.entries(details).filter(([k,v])=>k in reviewLabels&&v&&!(k==='lmp'&&details.sex==='Male'));
 const blank=Object.keys(reviewLabels).filter(k=>!details[k as keyof ProfileDetails]&&!(k==='lmp'&&details.sex==='Male')).map(k=>reviewLabels[k]);
 const reviewHead=(title:string,target:number)=><div className="review-head"><h3>{title}</h3><button type="button" className="text-btn" onClick={()=>{setError('');setStep(target)}}>Edit</button></div>;
 const review=<>
  <section className="review-section">{reviewHead(draft.name,0)}
   <p>{draft.relationship} · {draft.dob?dateText(draft.dob):'Birth date not recorded'}</p>
   {filled.length>0&&<dl className="review-list">{filled.map(([k,v])=><div key={k}><dt>{reviewLabels[k]}</dt><dd>{k==='lmp'?dateText(String(v)):String(v)}</dd></div>)}</dl>}
   {blank.length>0&&<p className="muted">Not recorded: {blank.join(', ')}</p>}
  </section>
  <section className="review-section">{reviewHead('Medical History',2)}
   {historyKinds.map(kind=>{const items=draft.history.filter(h=>h.kind===kind);return <div key={kind} className="review-group"><h4>{historyTitles[kind]}</h4>
    {kind==='Family history'&&items.length?<dl className="review-list">{familyByPerson(items,relatives).map(([person,list])=><div key={person}><dt>{person}</dt><dd>{list.map(h=>h.title).join(', ')}</dd></div>)}</dl>:items.length?<ol>{items.map(h=><li key={h.id}><strong>{h.title}</strong>{h.details&&<><br/>{h.details}</>}{(h.date||h.facility)&&<><br/>{[h.date&&dateText(h.date),h.facility].filter(Boolean).join(' · ')}</>}</li>)}</ol>:<p>{reportedNone({...draft,details},kind)?'None reported':'Not recorded'}</p>}</div>})}
  </section>
  <section className="review-section">{reviewHead('Medications',3)}
   {draft.medicines.length?<ol>{draft.medicines.map(m=><li key={m.id}><strong>{m.name} {m.dose||'(dose not recorded)'}</strong><br/>{[m.frequency||'Frequency not recorded',splitList(m.times).join(', '),m.status].filter(Boolean).join(' · ')}</li>)}</ol>:<p>{details.medicineStatus==='None reported'?'None reported':'Not recorded'}</p>}
  </section>
  <p className="info-note">Check these details before saving. You can update them later from Profile & Settings. Nothing here is medically verified.</p>
 </>;

 return <form className="entry-form profile-wizard" onSubmit={submit}>
  <div className="setup-progress" aria-label="Profile setup progress">{steps.map((name,i)=><span key={name} aria-current={i===step?'step':undefined} className={i===step?'active':i<step?'done':''}>{i+1}<small>{name}</small></span>)}</div>
  <header><p className="eyebrow">STEP {step+1} OF {steps.length}</p><h2 ref={heading} tabIndex={-1}>{steps[step]}</h2><p className="muted">{hints(self)[step]}</p></header>
  <fieldset disabled={busy} className="setup-fields">{[personal,contact,history,medicines,review][step]}</fieldset>
  {error&&<p role="alert" className="form-error">{error}</p>}
  {saved&&<p role="status" className="step-saved">✓ {saved}</p>}
  <div className="setup-actions">{step>0&&<button type="button" className="outline" disabled={busy} onClick={()=>{setError('');setSaved('');setStep(step-1)}}>Back</button>}<button className="primary" disabled={busy}>{busy?'Saving…':step===4?(onboarding?'Save & open Vessel':'Save profile'):'Save & continue'}</button></div>
  {step<4&&<button type="button" className="text-btn finish-later" disabled={busy} onClick={()=>void save(true)}>{onboarding?'Save & finish later':'Save & close'}</button>}
  <p className="muted setup-note">{step<4?'Next: '+steps[step+1]+'. ':''}Each page is saved when you press Save. You can come back and change anything later.</p>
 </form>;
}

// A tapped name fills in the name only. An antibiotic defaults to that type; dose, frequency and dates are never assumed.
function newMedicine(name:string):Medicine{return {id:crypto.randomUUID(),name,dose:'',frequency:'',start:'',end:'',kind:antibioticNames.has(name)?'Antibiotic':medicineScreen.includes(name)?'Other':'Maintenance',status:'Current'}}
