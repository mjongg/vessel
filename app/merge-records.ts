import type {State} from './health-data';
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
// Three-way merge: independent additions/edits are safe; competing edits require review.
export function mergeRecords(base:State,local:State,remote:State):State{
type Keyed={id:string};
const keyed=(x:unknown):x is Keyed=>!!x&&typeof (x as {id?:unknown}).id==='string';
const plain=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object';
function merge(b:unknown,l:unknown,r:unknown,path:string):unknown{if(equal(l,b))return r;if(equal(r,b)||equal(l,r))return l;if(Array.isArray(b)&&Array.isArray(l)&&Array.isArray(r)&&[...b,...l,...r].every(keyed)){const B=b as Keyed[],L=l as Keyed[],R=r as Keyed[];const ids=[...new Set([...R,...L,...B].map(x=>x.id))];return ids.map(id=>merge(B.find(x=>x.id===id),L.find(x=>x.id===id),R.find(x=>x.id===id),path+'/'+id)).filter(x=>x!==undefined)}if(plain(b)&&plain(l)&&plain(r)&&!Array.isArray(b)){return Object.fromEntries([...new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])].map(k=>[k,merge(b[k],l[k],r[k],path+'/'+k)]))}throw new Error('The same detail changed in another window. Your draft is kept. Review the latest record before applying your change.');}
return merge(base,local,remote,'records') as State;
}
