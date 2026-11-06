'use client';
import type {HistoryItem} from './health-data';
import {allergyGroups,allergyReactions,allergySeverities,conditionGroups,conditionStatuses,familyIllnessGroups,hospitalizationGroups,relatives,surgeryGroups,type Group} from './pick-lists';
import {composeHistory,historyNote,splitList,toggleInList} from './entry-helpers';
import {Chips,GroupedChips} from './pickers';

type Kind=HistoryItem['kind'];
export const historyKinds:Kind[]=['Allergy','Condition','Surgery','Hospitalization','Family history'];
export const historyTitles:Record<Kind,string>={Allergy:'Allergies',Condition:'Conditions & Past Illnesses',Surgery:'Surgeries',Hospitalization:'Hospitalizations','Family history':'Family History'};
const groupsFor:Record<Kind,Group[]>={Allergy:allergyGroups,Condition:conditionGroups,Surgery:surgeryGroups,Hospitalization:hospitalizationGroups,'Family history':familyIllnessGroups};
export const historyGroups=(kind:Kind)=>groupsFor[kind];
const nouns:Record<Kind,string>={Allergy:'allergies',Condition:'conditions',Surgery:'surgeries',Hospitalization:'reasons for admission','Family history':'illnesses'};

const Labeled=({label,children}:{label:string;children:React.ReactNode})=><div className="field"><span>{label}</span>{children}</div>;
const yearInput=(entry:HistoryItem,set:(patch:Partial<HistoryItem>)=>void,label:string)=><label className="field"><span>{label}</span><input inputMode="numeric" maxLength={4} placeholder="e.g. 2019" value={entry.year||''} onChange={e=>set({year:e.target.value.replace(/\D/g,'').slice(0,4)})}/></label>;

/** The follow-up questions for one history entry, answered by tapping wherever possible. */
export function HistoryEntryFields({entry,onChange}:{entry:HistoryItem;onChange:(entry:HistoryItem)=>void}){
 const set=(patch:Partial<HistoryItem>)=>onChange(composeHistory({...entry,...patch}));
 const k=entry.kind;
 return <>
  {k==='Allergy'&&<><Labeled label="What happens? Tap all that apply"><Chips label="Reaction" options={allergyReactions} selected={splitList(entry.reactions)} onToggle={v=>set({reactions:toggleInList(entry.reactions,v)})}/></Labeled>
   <Labeled label="How severe was it?"><Chips label="Severity" options={allergySeverities} selected={entry.severity?[entry.severity]:[]} onToggle={v=>set({severity:entry.severity===v?'':v})}/></Labeled></>}
  {k==='Condition'&&<><Labeled label="Status"><Chips label="Status" options={conditionStatuses} selected={entry.status?[entry.status]:[]} onToggle={v=>set({status:entry.status===v?'':v})}/></Labeled>{yearInput(entry,set,'Year diagnosed (if known)')}</>}
  {k==='Family history'&&<Labeled label="Which relatives? Tap all that apply"><Chips label="Relatives" options={[...new Set([...relatives,...splitList(entry.relative)])]} selected={splitList(entry.relative)} onToggle={v=>set({relative:toggleInList(entry.relative,v)})}/></Labeled>}
  {(k==='Surgery'||k==='Hospitalization')&&<div className="two-fields">{yearInput(entry,set,'Year (if known)')}<label className="field"><span>Hospital / Clinic</span><input maxLength={300} value={entry.facility} onChange={e=>set({facility:e.target.value})}/></label></div>}
  <details className="form-disclosure entry-more"><summary>Add a note or exact date</summary>
   <label className="field"><span>{k==='Family history'?'Note (for example, age at diagnosis)':k==='Allergy'?'Note (for example, when it happened or what treated it)':'Note'}</span><textarea rows={2} maxLength={11000} value={historyNote(entry)} onChange={e=>set({note:e.target.value})}/></label>
   {k!=='Family history'&&<label className="field"><span>Exact date (if known)</span><input type="date" value={entry.date} onChange={e=>set({date:e.target.value})}/></label>}
  </details>
 </>;
}

/** Tap common options to add entries of one kind, then answer the follow-ups for each. */
export function HistoryPicker({kind,entries,source,onChange}:{kind:Kind;entries:HistoryItem[];source:string;onChange:(entries:HistoryItem[])=>void}){
 const mine=entries.filter(h=>h.kind===kind);
 const matches=(h:HistoryItem,group:string,title:string)=>h.kind===kind&&h.title===title&&(kind!=='Allergy'||!h.category||h.category===group);
 const add=(group:string,title:string)=>onChange([...entries,composeHistory({id:crypto.randomUUID(),kind,title,details:'',date:'',facility:'',source,note:'',...(kind==='Allergy'?{category:group}:{})})]);
 const toggle=(group:string,title:string)=>entries.some(h=>matches(h,group,title))?onChange(entries.filter(h=>!matches(h,group,title))):add(group,title);
 const picker=(groups:Group[],other:string)=><GroupedChips label={nouns[kind]} groups={groups} selected={(g,v)=>entries.some(h=>matches(h,g,v))} onToggle={toggle} onOther={v=>{if(!mine.some(h=>h.title.toLowerCase()===v.toLowerCase()))add(groups[0].group,v)}} otherLabel={other}/>;
 return <div className="history-picker">
  {kind==='Allergy'
   ?allergyGroups.map(g=><section key={g.group} className="allergy-kind"><h4>{g.group==='Drug'?'Drug Allergies':g.group==='Food'?'Food Allergies':'Environmental Allergies'}</h4>{picker([g],'Other '+g.group.toLowerCase()+' allergy')}</section>)
   :picker(historyGroups(kind),'Not on the list? Type it here')}
  {mine.length>0&&<div className="picked-entries"><h4>{mine.length===1?'1 added':mine.length+' added'} — add details if you know them</h4>
   {mine.map(h=><section className="setup-entry" key={h.id}><div className="picked-head"><strong>{h.title}{h.kind==='Allergy'&&h.category?<span className="tag">{h.category}</span>:null}</strong><button type="button" className="text-btn" onClick={()=>onChange(entries.filter(x=>x.id!==h.id))}>Remove</button></div>
    <HistoryEntryFields entry={h} onChange={next=>onChange(entries.map(x=>x.id===h.id?{...next,source}:x))}/></section>)}</div>}
 </div>;
}
