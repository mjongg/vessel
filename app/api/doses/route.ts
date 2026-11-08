import {z} from 'zod';
import {getAppUser,supabaseEnabled,sameOrigin} from '../../../lib/server/supabase';
import {careRpc} from '../../../lib/server/supabase-care';
import {limitedBody} from '../../../lib/server/request-body';
import {doseSlots,type DoseMark} from '../../doses';

// Medicine tick-off. Every permission rule lives in the database (vessel_dose_list / vessel_dose_mark).
// The local demo keeps marks in memory only, so they vanish when the dev server restarts.
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const target={access:z.string().uuid().nullable().optional(),profile:z.string().min(1).max(100).nullable().optional()};
const listInput=z.object({...target,from:day,to:day});
const markInput=z.object({...target,medicine:z.string().min(1).max(100),day,slot:z.enum(doseSlots),status:z.enum(['given','skipped']).nullable()});
const demo=new Map<string,DoseMark[]>();
const demoKey=(user:string,profile:string)=>user+':'+profile;

export async function GET(request:Request){try{
 const user=await getAppUser();if(!user)return reply({error:'Sign in to see doses.'},401);
 const q=new URL(request.url).searchParams;
 const parsed=listInput.safeParse({access:q.get('access'),profile:q.get('profile'),from:q.get('from'),to:q.get('to')});
 if(!parsed.success)return reply({error:'Invalid request.'},400);
 const {access,profile,from,to}=parsed.data;
 if(!supabaseEnabled())return reply({doses:(demo.get(demoKey(user.userId,profile||''))||[]).filter(d=>d.day>=from&&d.day<=to)});
 const result=await careRpc('vessel_dose_list',{access:access??null,profile:access?null:profile,from_day:from,to_day:to});
 if(!result.ok)return reply({error:'Doses are unavailable right now.'},result.code==='42501'?403:503);
 return reply({doses:result.data});
 }catch{return reply({error:'Doses could not be loaded.'},503)}}

export async function POST(request:Request){try{
 if(!sameOrigin(request))return reply({error:'Invalid request origin.'},403);
 const user=await getAppUser();if(!user)return reply({error:'Sign in to tick off doses.'},401);
 let decoded:unknown;try{decoded=JSON.parse(new TextDecoder().decode(await limitedBody(request,4000)))}catch{return reply({error:'Invalid request.'},400)}
 const parsed=markInput.safeParse(decoded);if(!parsed.success)return reply({error:'Invalid request.'},400);
 const {access,profile,medicine,day:d,slot,status}=parsed.data;
 if(!supabaseEnabled()){
  const key=demoKey(user.userId,profile||'');const rest=(demo.get(key)||[]).filter(x=>!(x.medicineId===medicine&&x.day===d&&x.slot===slot));
  demo.set(key,status?[...rest,{medicineId:medicine,day:d,slot,status,by:'Demo account',at:new Date().toISOString()}]:rest);
  return reply({ok:true});
 }
 const result=await careRpc('vessel_dose_mark',{access:access??null,profile:access?null:profile,medicine,day:d,slot,status});
 if(!result.ok)return reply({error:result.code==='42501'?'Your role cannot tick off doses for this record.':'This dose could not be saved. Check the day and try again.'},result.code==='42501'?403:400);
 return reply({ok:true});
 }catch{return reply({error:'Not saved. Check your connection and try again.'},503)}}
