// Retry only an explicit authentication rejection, before an endpoint performs a write.
let refresh:Promise<boolean>|null=null;
export async function vesselFetch(url:string,init?:RequestInit):Promise<Response>{
 const response=await fetch(url,init);if(response.status!==401||!url.startsWith('/api/')||url.startsWith('/api/session'))return response;
 if(!refresh)refresh=fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'refresh'})}).then(r=>r.ok).catch(()=>false).finally(()=>{refresh=null});
 return await refresh?fetch(url,init):response;
}
