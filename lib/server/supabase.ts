import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {getChatGPTUser} from '../../app/chatgpt-auth';
export function setting(name:string):string{return (env as unknown as Record<string,string>)[name]||process.env[name]||'';}
export const supabaseEnabled=()=>setting('VESSEL_BACKEND')==='supabase';
export async function supabaseRequest(path:string,token?:string,init:RequestInit={}){
 const url=setting('SUPABASE_URL'),key=setting('SUPABASE_PUBLISHABLE_KEY');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key)throw new Error('Supabase is not configured.');
 return fetch(url+path,{...init,headers:{apikey:key,...(token?{Authorization:`Bearer ${token}`}:{ }),...init.headers},signal:AbortSignal.timeout(20000),cache:'no-store'});
}
export async function accessToken(){const h=await headers();return h.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('vessel-access='))?.slice(14)||'';}
export async function getAppUser(){
 if(!supabaseEnabled())return getChatGPTUser();
 const token=await accessToken();if(!token)return null;
 const response=await supabaseRequest('/auth/v1/user',token);if(!response.ok)return null;
 const user=await response.json() as {id:string;email?:string};
 const membership=await supabaseRequest('/rest/v1/pilot_members?select=user_id&user_id=eq.'+encodeURIComponent(user.id),token);
 if(!membership.ok||(await membership.json() as unknown[]).length!==1)return null;
 return {userId:user.id,email:user.email||'',displayName:user.email||'Account',fullName:null};
}
export function sameOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin;}
