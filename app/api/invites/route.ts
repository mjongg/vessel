import {z} from 'zod';
import {getAppUser,supabaseEnabled,sameOrigin} from '../../../lib/server/supabase';
import {careRpc} from '../../../lib/server/supabase-care';
import {limitedBody} from '../../../lib/server/request-body';

// Invite to Vessel. The database decides who is the family admin; this route only validates and forwards.
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('invite'),email:z.string().trim().toLowerCase().email().max(254),label:z.string().trim().min(1).max(80)}),
 z.object({action:z.literal('remove'),email:z.string().trim().toLowerCase().email().max(254)}),
]);

export async function GET(){try{
 if(!supabaseEnabled()||!await getAppUser())return reply({error:'Sign in to manage invitations.'},401);
 const result=await careRpc('vessel_invite_list');
 if(!result.ok)return reply({error:'Only the family admin can see invitations.'},result.code==='42501'?403:503);
 return reply({invites:result.data});
 }catch{return reply({error:'Invitations could not be loaded.'},503)}}

export async function POST(request:Request){try{
 if(!sameOrigin(request))return reply({error:'Invalid request origin.'},403);
 if(!supabaseEnabled()||!await getAppUser())return reply({error:'Sign in to manage invitations.'},401);
 let decoded:unknown;try{decoded=JSON.parse(new TextDecoder().decode(await limitedBody(request,2000)))}catch{return reply({error:'Invalid request.'},400)}
 const parsed=input.safeParse(decoded);if(!parsed.success)return reply({error:'Enter a valid email address and a name.'},400);
 const d=parsed.data;
 const result=await careRpc('vessel_invite_change',{action:d.action,target_email:d.email,target_label:d.action==='invite'?d.label:null});
 if(!result.ok)return reply({error:result.code==='42501'?'Only the family admin can do this.':d.action==='remove'?'This person could not be removed. You cannot remove yourself.':'This invitation could not be saved. Check the email address.'},result.code==='42501'?403:400);
 return reply({ok:true});
 }catch{return reply({error:'Not saved. Check your connection and try again.'},503)}}
