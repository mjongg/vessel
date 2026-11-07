import type {HistoryItem,Profile} from './health-data';

export const byName=(a:string,b:string)=>a.localeCompare(b);

// Philippines first, then places family members commonly live or work, then alphabetical.
export const countryCodes:[string,string][]=[
 ['+63','Philippines'],['+1','United States / Canada'],['+61','Australia'],['+44','United Kingdom'],['+65','Singapore'],['+852','Hong Kong'],['+971','United Arab Emirates'],['+966','Saudi Arabia'],['+974','Qatar'],['+965','Kuwait'],['+81','Japan'],['+82','South Korea'],['+886','Taiwan'],['+86','China'],
 ['+973','Bahrain'],['+880','Bangladesh'],['+673','Brunei'],['+855','Cambodia'],['+33','France'],['+49','Germany'],['+91','India'],['+62','Indonesia'],['+353','Ireland'],['+972','Israel'],['+39','Italy'],['+853','Macau'],['+60','Malaysia'],['+31','Netherlands'],['+64','New Zealand'],['+47','Norway'],['+968','Oman'],['+34','Spain'],['+46','Sweden'],['+41','Switzerland'],['+66','Thailand'],['+84','Vietnam'],
];

/** Splits a stored phone number into a known country code and the rest. Numbers without a known code keep the default. */
export function splitPhone(value:string,fallback='+63'):{code:string;number:string}{
 const text=value.trimStart();
 const code=countryCodes.map(c=>c[0]).sort((a,b)=>b.length-a.length).find(c=>text.startsWith(c));
 return code?{code,number:text.slice(code.length).replace(/^\s/,'')}:{code:fallback,number:text};
}
/** An empty number stays empty, so "not recorded" is never stored as a bare country code. */
export const joinPhone=(code:string,number:string)=>number.trim()?code+' '+number.trimStart():'';

// Several choices are stored in one field separated by "; " (some option names contain commas).
export const splitList=(value?:string)=>(value||'').split('; ').filter(Boolean);
export const toggleInList=(value:string|undefined,item:string)=>{const list=splitList(value);return (list.includes(item)?list.filter(x=>x!==item):[...list,item]).join('; ')};

/** True only when someone answered "none" and no entry has been added since, so a later entry can never leave a stale "none" on show. */
export function reportedNone(profile:Profile,kind:HistoryItem['kind']){
 if(profile.history.some(h=>h.kind===kind))return false;
 return kind==='Allergy'?profile.details?.allergyStatus==='None known':splitList(profile.details?.noneReported).includes(kind);
}

/** The free-text note for an entry. Entries saved before structured fields existed keep their whole description as the note. */
export const historyNote=(h:HistoryItem)=>h.note??h.details;

/**
 * Rebuilds the readable description shown throughout the app from the structured choices plus the note,
 * so summaries, search and exports keep working from `title` and `details` alone.
 */
export function composeHistory(h:HistoryItem):HistoryItem{
 // The note is kept exactly as typed: this runs on every keystroke, and trimming here would delete each space as it is entered.
 const note=historyNote(h);
 const parts=h.kind==='Allergy'?[h.category&&h.category+' allergy',h.reactions&&'Reaction: '+h.reactions,h.severity&&h.severity!=='Unknown'&&'Severity: '+h.severity]
  :h.kind==='Condition'?[h.status&&'Status: '+h.status,h.year&&'Since '+h.year]
  :h.kind==='Family history'?[h.relative&&'Relative: '+h.relative]
  :[h.year&&'Year: '+h.year];
 return {...h,note,details:[...parts,note.trim()].filter(Boolean).join(' · ')};
}

const doseUnitsPattern=/^(.*\S)\s+(mg|mcg|g|mL|IU|units|tablet\(s\)|capsule\(s\)|puff\(s\)|drop\(s\)|sachet\(s\)|patch\(es\))$/;
/** Splits a stored dose such as "50 mg". Anything written another way stays whole in the amount, so no wording is lost. */
export function splitDose(value:string){const m=value.match(doseUnitsPattern);return m?{amount:m[1],unit:m[2]}:{amount:value,unit:''}}
export const joinDose=(amount:string,unit:string)=>amount.trim()?(unit?amount.trim()+' '+unit:amount):'';
/** True for a bare number such as "50" or "5/160": without a unit that dose is unsafe to read. */
export const doseNeedsUnit=(dose:string)=>/^[\d.,/\s-]+$/.test(dose.trim())&&!!dose.trim();

export const medicineTimes=['Morning','Noon','Evening','Bedtime','As needed'];
/** The structured choices on an entry as label and value pairs, for reading rather than editing. */
export function historyFacts(h:HistoryItem):[string,string][]{
 const list=(v?:string)=>splitList(v).join(', ');
 return ([['Type',h.category],['Reaction',list(h.reactions)],['Severity',h.severity==='Unknown'?'':h.severity],['Status',h.status],['Relatives',list(h.relative)],[h.kind==='Condition'?'Since':'Year',h.year]] as [string,string|undefined][]).filter((f):f is [string,string]=>!!f[1]);
}

/** Family history read by person, closest relatives first. Illnesses with no relative recorded come last. */
export function familyByPerson(items:HistoryItem[],order:string[]):[string,HistoryItem[]][]{
 const people=[...new Set(items.flatMap(h=>splitList(h.relative)))].sort((a,b)=>{const x=order.indexOf(a),y=order.indexOf(b);return (x<0?99:x)-(y<0?99:y)});
 const rows=people.map(p=>[p,items.filter(h=>splitList(h.relative).includes(p))] as [string,HistoryItem[]]);
 const unlinked=items.filter(h=>!splitList(h.relative).length);
 return unlinked.length?[...rows,['Relative not recorded',unlinked]]:rows;
}

/** What is wrong with a reading, or '' if it can be saved. These only catch typing slips; they say nothing about whether a value is healthy. */
export function checkReading(type:string,value:string){
 if(type==='Symptom')return '';
 if(type==='Blood pressure'){const m=value.match(/^(\d{2,3})\/(\d{2,3})$/);return !m||+m[1]<=+m[2]||+m[1]<40||+m[1]>300||+m[2]<20||+m[2]>200?'Check the blood pressure. Use systolic/diastolic, for example 120/70.':''}
 const n=Number(value);
 if(!value.trim()||!Number.isFinite(n)||n<=0)return 'Enter a positive number for '+type.toLowerCase()+'.';
 if(type==='Temperature'&&(n<25||n>45))return 'Check the temperature in °C.';
 if(type==='Oxygen saturation'&&n>100)return 'Oxygen saturation cannot exceed 100%.';
 return '';
}

/** The vitals someone actually filled in, each as its own reading. A blank box is skipped, never saved as zero or normal. */
export function vitalsToSave(v:{systolic:string;diastolic:string;pulse:string;temperature:string;oxygen:string;glucose:string;glucoseUnit:string}){
 const bp=v.systolic.trim()||v.diastolic.trim()?v.systolic.trim()+'/'+v.diastolic.trim():'';
 return ([['Blood pressure',bp,'mmHg'],['Pulse',v.pulse.trim(),'bpm'],['Temperature',v.temperature.trim(),'°C'],['Oxygen saturation',v.oxygen.trim(),'%'],['Glucose',v.glucose.trim(),v.glucoseUnit]] as const).filter(([,value])=>value).map(([type,value,unit])=>({type,value,unit}));
}
