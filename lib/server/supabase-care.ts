import {accessToken,supabaseRequest} from './supabase';
// Care-team calls. Every rule is enforced in the database; these are thin, typed wrappers.
export async function careRpc(name:'vessel_care_list'|'vessel_care_change'|'vessel_care_profiles'|'vessel_care_write'|'vessel_dose_list'|'vessel_dose_mark',body:unknown={}){
 const r=await supabaseRequest('/rest/v1/rpc/'+name,await accessToken(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(r.ok)return {ok:true as const,data:await r.json() as unknown};
 const err=await r.json().catch(()=>({})) as {code?:string};
 return {ok:false as const,code:err.code||''};
}
