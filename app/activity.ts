import type {Profile,Reading} from './health-data';

export type ActivityItem={at:string;who:string;what:string};
const vitalTypes=['Blood pressure','Pulse','Temperature','Oxygen saturation','Glucose'] as const;
type Stamped={addedBy?:string;addedAt?:string;editedBy?:string;editedAt?:string};

/** The newest reading of each vital sign, in a fixed order. Symptoms are left out. */
export function latestVitals(readings:Reading[]){
 return vitalTypes.map(t=>readings.filter(r=>r.type===t).sort((a,b)=>b.date.localeCompare(a.date))[0]).filter((r):r is Reading=>!!r);
}

/** Who added or corrected what, newest first. Care-team entries carry server stamps; the admin's own saves fall back to the entry's own date. */
export function recentActivity(p:Profile,limit=6):ActivityItem[]{
 const out:ActivityItem[]=[];
 const push=(e:Stamped,title:string,kind:string,fallback?:{at?:string;who?:string;what?:string})=>{
  if(e.editedAt)out.push({at:e.editedAt,who:e.editedBy||'Someone',what:'corrected '+kind+': '+title});
  if(e.addedAt)out.push({at:e.addedAt,who:e.addedBy||'Someone',what:'added '+kind+': '+title});
  else if(!e.editedAt&&fallback?.at)out.push({at:fallback.at,who:fallback.who||'You',what:fallback.what||'saved '+kind+': '+title});
 };
 for(const r of p.readings){const title=r.type==='Symptom'?r.value:r.type+' '+r.value+(r.unit?' '+r.unit:'');push(r,title,r.type==='Symptom'?'symptom':'reading',{at:r.date,who:!r.author||r.author==='Account owner'?'You':r.author,what:'logged '+title})}
 for(const d of p.records)push(d,d.title,'document',{at:d.updatedAt});
 for(const m of p.medicines)push(m,[m.name,m.dose].filter(Boolean).join(' '),'medicine');
 for(const h of p.history)push(h,h.title,'history');
 for(const v of p.vaccines)push(v,v.name,'vaccination');
 return out.filter(a=>a.at&&!Number.isNaN(Date.parse(a.at))).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,limit);
}
