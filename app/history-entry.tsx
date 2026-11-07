'use client';
import {useState} from 'react';
import type {HistoryItem} from './health-data';
import {allergyGroups,allergyReactions,allergySeverities,commonAllergies,commonHistory,commonReactions,commonRelatives,conditionGroups,conditionScreen,conditionStatuses,familyIllnessGroups,familyScreen,forSex,hospitalizationGroups,relatives,surgeryGroups,type Group} from './pick-lists';
import {byName,composeHistory,historyNote,splitList,toggleInList} from './entry-helpers';
import {Chips,ChoiceField,NoneButton,OptionSelect,ShortChips} from './pickers';

type Kind=HistoryItem['kind'];
export const historyKinds:Kind[]=['Allergy','Condition','Surgery','Hospitalization','Family history'];
export const historyTitles:Record<Kind,string>={Allergy:'Allergies',Condition:'Conditions & Past Illnesses',Surgery:'Surgeries',Hospitalization:'Hospitalizations','Family history':'Family History'};
const groupsFor:Record<Kind,Group[]>={Allergy:allergyGroups,Condition:conditionGroups,Surgery:surgeryGroups,Hospitalization:hospitalizationGroups,'Family history':familyIllnessGroups};
export const historyGroups=(kind:Kind)=>groupsFor[kind];
const noneLabels:Record<Kind,string>={Allergy:'No known allergies',Condition:'No known conditions',Surgery:'No previous surgeries',Hospitalization:'No previous hospitalizations','Family history':'No known family illnesses'};
const addLabels:Record<Kind,string>={Allergy:'Has allergies',Condition:'Has conditions or past illnesses',Surgery:'Has had surgery',Hospitalization:'Has been hospitalized','Family history':'Has family illnesses'};
const allergyTitle=(group:string)=>group==='Environmental'?'Environmental allergy':group+' allergy';
const screens:Partial<Record<Kind,string[]>>={Condition:[...conditionScreen].sort(byName),'Family history':[...familyScreen].sort(byName)};
const reactions=[...allergyReactions].sort(byName),family=[...relatives].sort(byName);

const Labeled=({label,children}:{label:string;children:React.ReactNode})=><div className="field"><span>{label}</span>{children}</div>;
// What a clinician asks next for the two conditions tracked most closely.
const noteLabel=(h:HistoryItem)=>h.kind==='Family history'?'Note (for example, age at diagnosis)':h.kind==='Allergy'?'Note (for example, when it happened or what treated it)':h.title==='Hypertension'?'Note (for example, usual and highest blood pressure)':/^Type [12] diabetes/.test(h.title)?'Note (for example, usual blood sugar, latest HbA1c and its date)':'Note';

/** The follow-up questions for one history entry. */
export function HistoryEntryFields({entry,onChange}:{entry:HistoryItem;onChange:(entry:HistoryItem)=>void}){
 const set=(patch:Partial<HistoryItem>)=>onChange(composeHistory({...entry,...patch}));
 const k=entry.kind;
 const year=(label:string)=><label className="field"><span>{label}</span><input inputMode="numeric" maxLength={4} placeholder="e.g. 2019" value={entry.year||''} onChange={e=>set({year:e.target.value.replace(/\D/g,'').slice(0,4)})}/></label>;
 return <>
  {k==='Allergy'&&<><Labeled label="What happens? Tap all that apply"><ShortChips label="Reaction" common={commonReactions} options={reactions} selected={splitList(entry.reactions)} onToggle={v=>set({reactions:toggleInList(entry.reactions,v)})}/></Labeled>
   <ChoiceField label="How severe was it?" options={allergySeverities} value={entry.severity||''} onChange={v=>set({severity:v})}/></>}
  {k==='Condition'&&<div className="two-fields"><ChoiceField label="Status" options={conditionStatuses} value={entry.status||''} onChange={v=>set({status:v})}/>{year('Year diagnosed (if known)')}</div>}
  {k==='Family history'&&<Labeled label="Which relatives? Tap all that apply"><ShortChips label="Relatives" common={commonRelatives} options={[...new Set([...family,...splitList(entry.relative)])]} selected={splitList(entry.relative)} onToggle={v=>set({relative:toggleInList(entry.relative,v)})}/></Labeled>}
  {(k==='Surgery'||k==='Hospitalization')&&<div className="two-fields">{year('Year (if known)')}<label className="field"><span>Hospital / Clinic</span><input maxLength={300} value={entry.facility} onChange={e=>set({facility:e.target.value})}/></label></div>}
  <label className="field"><span>{noteLabel(entry)}</span><textarea rows={2} maxLength={11000} value={historyNote(entry)} onChange={e=>set({note:e.target.value})}/></label>
  {k!=='Family history'&&<label className="field"><span>Exact date (if known)</span><input type="date" value={entry.date} onChange={e=>set({date:e.target.value})}/></label>}
 </>;
}

/** An added entry: its own numbered block. A new entry opens ready to fill in; one that already has details starts folded. */
function EntryCard({entry,onChange,onRemove}:{entry:HistoryItem;onChange:(entry:HistoryItem)=>void;onRemove:()=>void}){
 const[open,setOpen]=useState(!entry.details);
 return <section className="entry-card"><div className="picked-head"><strong>{entry.title}</strong><button type="button" className="text-btn" onClick={onRemove}>Remove</button></div>
  <details className="entry-more" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{open?'Hide details':entry.details||'Add details (optional)'}</summary><div className="entry-fields"><HistoryEntryFields entry={entry} onChange={onChange}/></div></details></section>;
}

/** One history section: a one-tap "none" answer, or open it to choose entries. Left alone, the answer stays unknown. */
export function HistorySection({kind,entries,source,sex,none,onNone,onChange}:{kind:Kind;entries:HistoryItem[];source:string;sex?:string;none:boolean;onNone:(value:boolean)=>void;onChange:(entries:HistoryItem[])=>void}){
 const mine=entries.filter(h=>h.kind===kind);
 const add=(group:string,title:string)=>{
  if(mine.some(h=>h.title.toLowerCase()===title.toLowerCase()))return;
  onChange([...entries,composeHistory({id:crypto.randomUUID(),kind,title,details:'',date:'',facility:'',source,note:'',...(kind==='Allergy'?{category:group}:{})})]);
 };
 const remove=(id:string)=>onChange(entries.filter(h=>h.id!==id));
 const card=(h:HistoryItem)=><EntryCard key={h.id} entry={h} onRemove={()=>remove(h.id)} onChange={next=>onChange(entries.map(x=>x.id===h.id?{...next,source}:x))}/>;
 const taken=(v:string)=>mine.some(h=>h.title===v);
 const screen=screens[kind];
 const groups=kind==='Family history'?historyGroups(kind):forSex(historyGroups(kind),sex);
 const known=new Set(allergyGroups.map(g=>g.group));
 return <section className="history-card">
  <h3>{historyTitles[kind]}{mine.length>0&&<span className="tag">{mine.length}</span>}</h3>
  {!mine.length&&<NoneButton label={noneLabels[kind]} on={none} onChange={onNone}/>}
  {!none&&<details className="form-disclosure" open={mine.length>0||undefined}><summary>{addLabels[kind]}</summary>
   {kind==='Allergy'
    ?<>{allergyGroups.map(g=><div key={g.group} className="allergy-kind"><OptionSelect label={allergyTitle(g.group)} groups={[g]} common={commonAllergies[g.group]} onPick={add} isTaken={taken} otherLabel={'Type the '+g.group.toLowerCase()+' allergy'}/>{mine.filter(h=>h.category===g.group).map(card)}</div>)}{mine.filter(h=>!h.category||!known.has(h.category)).map(card)}</>
    :<>{screen&&<div className="field"><span>Tap any that apply</span><Chips label={historyTitles[kind]} options={screen} selected={screen.filter(taken)} onToggle={v=>{const h=mine.find(x=>x.title===v);if(h)remove(h.id);else add('',v)}}/></div>}
     <OptionSelect label={screen?'Something else?':'Choose from the list'} groups={groups} common={commonHistory[kind]} onPick={add} isTaken={taken}/>
     {mine.map(card)}</>}
  </details>}
 </section>;
}
