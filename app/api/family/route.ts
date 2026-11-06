import {z} from 'zod';
import {getAppUser,accessToken,supabaseEnabled,supabaseRequest,sameOrigin} from '../../../lib/server/supabase';
import {limitedBody} from '../../../lib/server/request-body';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('invite'),email:z.string().trim().email().max(254),label:z.string().trim().min(1).max(80)}),
 z.object({action:z.enum(['accept','decline','leave','revoke']),invitation:z.string().uuid()})
]);
async function rpc(name:string,body:unknown){return supabaseRequest('/rest/v1/rpc/'+name,await accessToken(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
export async function GET(request:Request){try{
 if(!supabaseEnabled()||!await getAppUser())return reply({error:'Sign in to view family invitations.'},401);
 const id=new URL(request.url).searchParams.get('invitation');
 if(id&&!z.string().uuid().safeParse(id).success)return reply({error:'Invalid invitation.'},400);
 const result=await rpc(id?'vessel_family_overview':'vessel_family_access_list',id?{invitation:id}:{});
 if(!result.ok)return reply({error:'Shared overview is unavailable. Access may have changed.'},result.status===403?403:503);
 return reply(await result.json());
 }catch{return reply({error:'Family access could not be loaded. Please try again.'},503)}}
export async function POST(request:Request){try{
 if(!sameOrigin(request))return reply({error:'Invalid request origin.'},403);
 const user=await getAppUser();if(!supabaseEnabled()||!user)return reply({error:'Sign in to manage family invitations.'},401);
 let decoded:unknown;try{decoded=JSON.parse(new TextDecoder().decode(await limitedBody(request,2000)))}catch{return reply({error:'Invalid invitation request.'},400)}
 const parsed=input.safeParse(decoded);if(!parsed.success)return reply({error:'Check the email, family name, and invitation.'},400);
 if(parsed.data.action==='invite'&&(!('familyDashboard' in user)||user.familyDashboard!=='admin'))return reply({error:'Only the family admin can invite members.'},403);
 const result=await rpc('vessel_family_access_change',parsed.data);
 if(!result.ok){const err=await result.json() as {code?:string};return reply({error:parsed.data.action==='invite'?'Unable to invite this account. Use another confirmed Vessel pilot account; check whether they already have access.':'This invitation is unavailable, expired, or not yours to change.'},err.code==='42501'?403:400)}
 return reply({ok:true});
 }catch{return reply({error:'The change was not confirmed. Refresh the invitation list before retrying.'},503)}}
