import {z} from 'zod';
import {getAppUser,supabaseEnabled,sameOrigin} from '../../../lib/server/supabase';
import {careRpc} from '../../../lib/server/supabase-care';
import {limitedBody} from '../../../lib/server/request-body';
import {entryInput} from '../../health-schema';

const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const role=z.enum(['caregiver','patient','contributor','viewer']);
const kind=z.enum(['records','history','medicines','readings','vaccines']);
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('invite'),profile:z.string().min(1).max(100),email:z.string().trim().email().max(254),label:z.string().trim().min(1).max(80),role}),
 z.object({action:z.enum(['accept','decline','leave','revoke']),access:z.string().uuid()}),
 z.object({action:z.literal('role'),access:z.string().uuid(),role}),
 z.object({action:z.literal('write'),access:z.string().uuid(),kind,entry:z.unknown(),previous:z.record(z.string(),z.unknown()).nullable().optional()}),
]);
const failures:Record<string,[string,number]>={
 '42501':['You do not have permission for this change. Access may have been changed or removed.',403],
 'PT409':['This entry was changed by someone else. Reload the record, then make your change again.',409],
 '40001':['This entry was changed by someone else. Reload the record, then make your change again.',409],
};

export async function GET(request:Request){try{
 if(!supabaseEnabled()||!await getAppUser())return reply({error:'Sign in to view care teams.'},401);
 const shared=new URL(request.url).searchParams.has('profiles');
 const result=await careRpc(shared?'vessel_care_profiles':'vessel_care_list');
 if(!result.ok)return reply({error:'Care team information is unavailable. Please try again.'},result.code==='42501'?403:503);
 return reply(shared?{shared:result.data}:result.data);
 }catch{return reply({error:'Care team information could not be loaded. Please try again.'},503)}}

export async function POST(request:Request){try{
 if(!sameOrigin(request))return reply({error:'Invalid request origin.'},403);
 if(!supabaseEnabled()||!await getAppUser())return reply({error:'Sign in to manage care teams.'},401);
 let decoded:unknown;try{decoded=JSON.parse(new TextDecoder().decode(await limitedBody(request,700000)))}catch{return reply({error:'This entry is too large or could not be read.'},400)}
 const parsed=input.safeParse(decoded);if(!parsed.success)return reply({error:'Check the details and try again.'},400);
 const data=parsed.data;
 if(data.action==='write'){
  // Same field validation as an owner save; attribution is added by the database, never taken from the request.
  const entry=entryInput[data.kind].safeParse(data.entry);
  if(!entry.success)return reply({error:'Some fields are missing, invalid or too long. Check the entry and try again.'},400);
  const result=await careRpc('vessel_care_write',{access:data.access,kind:data.kind,entry:entry.data,previous:data.previous??null});
  if(!result.ok){const [error,status]=failures[result.code]||[result.code==='22023'?'This entry could not be saved. Check the attachment and try again.':'Unable to save. Your entry is still open to retry.',result.code==='22023'?400:503];return reply({error},status)}
  return reply(result.data);
 }
 const result=await careRpc('vessel_care_change',data.action==='invite'?{action:'invite',profile:data.profile,email:data.email,label:data.label,new_role:data.role}:data.action==='role'?{action:'role',access:data.access,new_role:data.role}:{action:data.action,access:data.access});
 if(!result.ok){
  if(data.action==='invite')return reply({error:'Unable to invite this account. They need a confirmed Vessel pilot account, must not already be on this care team, and a record can have only one patient sign-in.'},result.code==='42501'?403:400);
  return reply({error:'This change is unavailable. The invitation may have expired, or it is not yours to change.'},result.code==='42501'?403:400);
 }
 return reply({ok:true});
 }catch{return reply({error:'The change was not confirmed. Refresh before retrying.'},503)}}
