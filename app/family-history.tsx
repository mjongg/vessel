'use client';
import {useState} from 'react';
import type {HistoryItem} from './health-data';
import {commonHistory,familyIllnessGroups,familyScreen,relativeGroups} from './pick-lists';
import {byName,composeHistory,historyNote,splitList,toggleInList} from './entry-helpers';
import {Chips,OptionSelect} from './pickers';

const screen=[...familyScreen].sort(byName);
const close=relativeGroups.slice(0,2).flatMap(g=>g.items);

/** Family history by person. Each illness stays one entry listing its relatives, so summaries and search are unchanged. */
export function FamilyByRelative({entries,source,onChange}:{entries:HistoryItem[];source:string;onChange:(entries:HistoryItem[])=>void}){
 const[all,setAll]=useState(false);
 const mine=entries.filter(h=>h.kind==='Family history');
 const illnessesOf=(person:string)=>mine.filter(h=>splitList(h.relative).includes(person)).map(h=>h.title);
 function toggle(person:string,title:string){
  const entry=mine.find(h=>h.title.toLowerCase()===title.toLowerCase());
  if(!entry)return onChange([...entries,composeHistory({id:crypto.randomUUID(),kind:'Family history',title,details:'',date:'',facility:'',source,note:'',relative:person})]);
  const relative=toggleInList(entry.relative,person);
  // An illness with no relatives left is removed, unless it carries a note someone wrote.
  if(!relative&&!historyNote(entry).trim())return onChange(entries.filter(h=>h.id!==entry.id));
  onChange(entries.map(h=>h.id===entry.id?composeHistory({...h,relative,source}):h));
 }
 const legacy=[...new Set(mine.flatMap(h=>splitList(h.relative)))].filter(r=>!relativeGroups.some(g=>g.items.includes(r)));
 const groups=[...relativeGroups,...(legacy.length?[{group:'Other relatives',items:legacy}]:[])];
 const shown=all?groups:groups.map(g=>({...g,items:g.items.filter(p=>close.includes(p)||illnessesOf(p).length)})).filter(g=>g.items.length);
 const unlinked=mine.filter(h=>!splitList(h.relative).length);
 return <div className="family-people">
  <p className="muted">Open a person and tap their illnesses.</p>
  {shown.map(g=><section key={g.group}><h4>{g.group}</h4>{g.items.map(person=>{const has=illnessesOf(person);return <details className="family-person" key={person} open={has.length>0||undefined}>
   <summary><strong>{person}</strong><span>{has.length?has.join(', '):'None added'}</span></summary>
   <div className="family-person-fields">
    <Chips label={'Illnesses for '+person} options={screen} selected={screen.filter(s=>has.includes(s))} onToggle={v=>toggle(person,v)}/>
    <OptionSelect label="Something else?" groups={familyIllnessGroups} common={commonHistory['Family history']} isTaken={v=>has.includes(v)} onPick={(_,v)=>toggle(person,v)}/>
    {has.filter(h=>!screen.includes(h)).length>0&&<Chips label={'Other illnesses for '+person} options={has.filter(h=>!screen.includes(h))} selected={has} onToggle={v=>toggle(person,v)}/>}
   </div>
  </details>})}</section>)}
  {!all&&<button type="button" className="text-btn type-own" onClick={()=>setAll(true)}>Add grandparents, aunts, uncles, cousins or children</button>}
  {unlinked.length>0&&<section><h4>Relative not recorded</h4><p>{unlinked.map(h=>h.title).join(', ')}</p></section>}
  {mine.length>0&&<details className="family-notes"><summary>Add a note (for example, age at diagnosis)</summary>{mine.map(h=><label className="field" key={h.id}><span>{h.title}</span><input maxLength={1000} value={historyNote(h)} onChange={e=>onChange(entries.map(x=>x.id===h.id?composeHistory({...x,note:e.target.value}):x))}/></label>)}</details>}
 </div>;
}
