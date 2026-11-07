'use client';
import {useId,useState} from 'react';
import type {Group} from './pick-lists';
import {byName,countryCodes,joinDose,joinPhone,splitDose,splitPhone} from './entry-helpers';
import {doseUnits} from './pick-lists';

/** Tap-to-select options. `selected` holds the chosen values; tapping a chosen value clears it. */
export function Chips({label,options,selected,onToggle}:{label:string;options:string[];selected:string[];onToggle:(value:string)=>void}){
 return <div className="chip-row" role="group" aria-label={label}>{options.map(o=><button type="button" key={o} className="chip" aria-pressed={selected.includes(o)} onClick={()=>onToggle(o)}>{o}</button>)}</div>;
}

/** The one-tap "none" answer. Leaving it untapped means the question has not been answered, which is different from none. */
export function NoneButton({label,on,onChange}:{label:string;on:boolean;onChange:(value:boolean)=>void}){
 return <button type="button" className={'none-button'+(on?' on':'')} aria-pressed={on} onClick={()=>onChange(!on)}>{label}</button>;
}

/** A short dropdown of common options (full list one step away), plus a plain link to type something else. Picking adds the value and resets it. */
export function OptionSelect({label,groups,common,onPick,isTaken,otherLabel='Type the name'}:{label:string;groups:Group[];common?:string[];onPick:(group:string,value:string)=>void;isTaken?:(value:string)=>boolean;otherLabel?:string}){
 const id=useId();const[other,setOther]=useState<string|null>(null),[all,setAll]=useState(false);
 const groupOf=(item:string)=>groups.find(g=>g.items.includes(item))?.group;
 const short=[...new Set(common||[])].filter(i=>groupOf(i)).sort(byName);
 const showShort=short.length>0&&!all;
 const sorted=[...groups].sort((x,y)=>byName(x.group,y.group));
 const option=(group:string,item:string)=><option key={group+item} value={group+'\n'+item} disabled={isTaken?.(item)}>{item}</option>;
 const options=(g:Group)=>[...g.items].sort(byName).map(i=>option(g.group,i));
 function addOther(){const value=(other||'').trim();if(!value)return;onPick(groups[0].group,value);setOther(null)}
 return <div className="option-select">
  <label className="field" htmlFor={id}><span>{label}</span>
   <select id={id} value="" onChange={e=>{const v=e.target.value;if(v==='all')setAll(true);else if(v){const[g,item]=v.split('\n');onPick(g,item)}}}>
    <option value="">{showShort?'Choose a common option…':'Choose from the full list…'}</option>
    {showShort?<>{short.map(i=>option(groupOf(i)!,i))}<option value="all">See the full list…</option></>:sorted.length===1?options(sorted[0]):sorted.map(g=><optgroup key={g.group} label={g.group}>{options(g)}</optgroup>)}
   </select>
  </label>
  {other===null?<button type="button" className="text-btn type-own" onClick={()=>setOther('')}>Not on the list? Type it yourself</button>:<div className="chip-other"><label className="field"><span>{otherLabel}</span><input autoFocus maxLength={300} value={other} onChange={e=>setOther(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addOther()}}}/></label><button type="button" className="outline" disabled={!other.trim()} onClick={addOther}>Add</button></div>}
 </div>;
}

/** Common checkboxes first; the rest appear on request. Anything already ticked always stays visible. */
export function ShortChips({label,common,options,selected,onToggle}:{label:string;common:string[];options:string[];selected:string[];onToggle:(value:string)=>void}){
 const[all,setAll]=useState(false);
 const shown=all?options:options.filter(o=>common.includes(o)||selected.includes(o));
 return <><Chips label={label} options={shown} selected={selected} onToggle={onToggle}/>{shown.length<options.length&&<button type="button" className="text-btn type-own" onClick={()=>setAll(true)}>Show more options</button>}</>;
}

/** One value from a short dropdown, or typed through "Other". Order is kept as given, because some lists run in a natural order. */
export function ChoiceField({label,options,value,onChange,placeholder='Type it here'}:{label:string;options:string[];value:string;onChange:(value:string)=>void;placeholder?:string}){
 const id=useId();const[typing,setTyping]=useState(false);
 const custom=typing||(!!value&&!options.includes(value));
 return <div className="field choice-field"><label htmlFor={id}><span>{label}</span></label>
  <select id={id} value={custom?'other':value} onChange={e=>{const v=e.target.value;setTyping(v==='other');onChange(v==='other'?'':v)}}>
   <option value="">Not recorded</option>{options.map(o=><option key={o} value={o}>{o}</option>)}<option value="other">Something else (type it)</option>
  </select>
  {custom&&<input aria-label={label} maxLength={300} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/>}
 </div>;
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

/** Dose as amount + unit, stored together as "50 mg". Nothing is pre-selected: a unit is never assumed. */
export function DoseInput({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const id=useId();const parsed=splitDose(value);
 // The unit must survive while the amount is still empty, so it is kept here as well as in the stored value.
 const[picked,setPicked]=useState(parsed.unit);
 const unit=parsed.unit||picked;
 return <div className="field dose-field"><label htmlFor={id}><span>Dose, as written on the prescription</span></label><div className="dose-row">
  <input id={id} inputMode="text" maxLength={200} placeholder="Amount, e.g. 50" value={parsed.amount} onChange={e=>onChange(joinDose(e.target.value,unit))}/>
  <select aria-label="Dose unit" value={unit} onChange={e=>{setPicked(e.target.value);onChange(joinDose(parsed.amount,e.target.value))}}><option value="">Unit</option>{doseUnits.map(u=><option key={u} value={u}>{u}</option>)}</select>
 </div></div>;
}
