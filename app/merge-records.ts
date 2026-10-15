import type {State} from './health-data';
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
// Three-way merge: independent additions/edits are safe; competing edits require review.
export function mergeRecords(base:State,local:State,remote:State):State{
function merge(b:any,l:any,r:any,path:string):any{if(equal(l,b))return r;if(equal(r,b)||equal(l,r))return l;if(Array.isArray(b)&&Array.isArray(l)&&Array.isArray(r)&&[...b,...l,...r].every(x=>x&&typeof x.id==='string')){const ids=[...new Set([...r,...l,...b].map(x=>x.id))];return ids.map(id=>merge(b.find(x=>x.id===id),l.find(x=>x.id===id),r.find(x=>x.id===id),path+'/'+id)).filter(x=>x!==undefined)}if(b&&l&&r&&typeof b==='object'&&typeof l==='object'&&typeof r==='object'&&!Array.isArray(b)){return Object.fromEntries([...new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])].map(k=>[k,merge(b[k],l[k],r[k],path+'/'+k)]))}throw new Error('The same detail changed in another window. Your draft is kept. Review the latest record before applying your change.');}
return merge(base,local,remote,'records');
}
