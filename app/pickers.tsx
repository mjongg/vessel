'use client';
import {useId,useState} from 'react';
import type {Group} from './pick-lists';
import {countryCodes,joinPhone,splitPhone} from './entry-helpers';

/** Tap-to-select options. `selected` holds the chosen values; tapping a chosen value clears it. */
export function Chips({label,options,selected,onToggle}:{label:string;options:string[];selected:string[];onToggle:(value:string)=>void}){
 return <div className="chip-row" role="group" aria-label={label}>{options.map(o=><button type="button" key={o} className="chip" aria-pressed={selected.includes(o)} onClick={()=>onToggle(o)}>{o}</button>)}</div>;
}

/** Grouped options with a filter box for long lists, plus a typed "Other" entry. */
export function GroupedChips({label,groups,selected,onToggle,onOther,otherLabel='Not on the list? Type it here'}:{label:string;groups:Group[];selected:(group:string,value:string)=>boolean;onToggle:(group:string,value:string)=>void;onOther?:(value:string)=>void;otherLabel?:string}){
 const[query,setQuery]=useState(''),[other,setOther]=useState('');const id=useId();
 const total=groups.reduce((n,g)=>n+g.items.length,0),q=query.trim().toLowerCase();
 const shown=groups.map(g=>({...g,items:q?g.items.filter(i=>i.toLowerCase().includes(q)):g.items})).filter(g=>g.items.length);
 function addOther(){const value=other.trim();if(!value||!onOther)return;onOther(value);setOther('')}
 return <div className="chip-picker">
  {total>24&&<label className="field chip-search"><span className="sr-only">Search {label}</span><input type="search" placeholder={'Search '+label.toLowerCase()} value={query} onChange={e=>setQuery(e.target.value)}/></label>}
  {shown.map(g=><div key={g.group} className="chip-group">{groups.length>1&&<h4>{g.group}</h4>}<Chips label={label+': '+g.group} options={g.items} selected={g.items.filter(i=>selected(g.group,i))} onToggle={v=>onToggle(g.group,v)}/></div>)}
  {q&&!shown.length&&<p className="muted">No match. Add it below.</p>}
  {onOther&&<div className="chip-other"><label className="field" htmlFor={id}><span>{otherLabel}</span><input id={id} maxLength={300} value={other} onChange={e=>setOther(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addOther()}}}/></label><button type="button" className="outline" disabled={!other.trim()} onClick={addOther}>Add</button></div>}
 </div>;
}

/** A single value chosen from options, or typed. Used where one field has a few common answers. */
export function ChoiceField({label,options,value,onChange,placeholder='Or type another'}:{label:string;options:string[];value:string;onChange:(value:string)=>void;placeholder?:string}){
 const id=useId();
 return <div className="field choice-field"><label htmlFor={id}><span>{label}</span></label><Chips label={label} options={options} selected={options.includes(value)?[value]:[]} onToggle={v=>onChange(v===value?'':v)}/><input id={id} maxLength={300} placeholder={placeholder} value={options.includes(value)?'':value} onChange={e=>onChange(e.target.value)}/></div>;
}

/** Country code + number, stored together as one string such as "+63 917 123 4567". */
export function PhoneInput({label,value,onChange,autoComplete}:{label:string;value:string;onChange:(value:string)=>void;autoComplete?:string}){
 const id=useId();const parsed=splitPhone(value);
 // The chosen code must survive while the number is still empty, so it is kept here rather than derived from the stored value alone.
 const[code,setCode]=useState(parsed.code);
 const active=parsed.number?parsed.code:code;
 return <div className="field phone-field"><label htmlFor={id}><span>{label}</span></label><div className="phone-row">
  <select aria-label={label+' country code'} value={active} onChange={e=>{setCode(e.target.value);onChange(joinPhone(e.target.value,parsed.number))}}>{countryCodes.map(([c,name])=><option key={c} value={c}>{name} ({c})</option>)}</select>
  <input id={id} type="tel" inputMode="tel" autoComplete={autoComplete} maxLength={40} placeholder={active==='+63'?'917 123 4567':'Number'} value={parsed.number} onChange={e=>onChange(joinPhone(active,e.target.value))}/>
 </div></div>;
}
