import {appOrigin,createFlow,flowCookie,validTokens,sessionCookies,clearFlow} from '../../../lib/server/oauth-flow';
import {oauthAvailability} from '../../../lib/server/oauth';
import {getAppUser,supabaseEnabled,supabaseRequest,setting,sameOrigin} from '../../../lib/server/supabase';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){try{const user=await getAppUser();return reply({mode:supabaseEnabled()?'supabase':'demo',signedIn:!!user,email:user?.email||'',providers:await oauthAvailability(),aiEnabled:setting('VESSEL_AI_ENABLED')==='true'&&!!setting('OPENAI_API_KEY')&&!!setting('OPENAI_MODEL')});}catch{return reply({error:'Unable to connect to your account.'},503)}}
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Invalid origin.'},403);
 if(!supabaseEnabled())return reply({error:'Supabase sign-in has not been configured.'},503);
 try{
 const raw=await request.text();if(raw.length>2000)return reply({error:'Request too large.'},413);
 const {action,email,code}=JSON.parse(raw);let response:Response;
 if(action==='send'){
  if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email))return reply({error:'Enter a valid email address.'},400);
  const origin=appOrigin(setting('VESSEL_APP_URL'));
  if(new URL(request.url).origin!==origin)return reply({error:'Please use the main Vessel website to sign in.'},403);
  const flow=await createFlow(),callback=new URL('/api/auth/callback',origin);callback.searchParams.set('flow',flow.state);
  response=await supabaseRequest('/auth/v1/otp?redirect_to='+encodeURIComponent(callback.href),undefined,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,create_user:false,code_challenge:flow.challenge,code_challenge_method:'s256'})});
  if(response.status>=500)return reply({error:'Email delivery is temporarily unavailable. Please try again.'},503);
  if(response.status===429)return reply({error:'Too many attempts. Please wait before requesting another code.'},429);
  const result=reply({message:'If this email has been invited, a sign-in email will arrive shortly. Open its link in this browser within 10 minutes. If it contains a code instead, enter it below.'});
  for(const [name,value] of [['vessel-pkce',flow.verifier],['vessel-flow',flow.state]])result.headers.append('Set-Cookie',flowCookie(name,value,origin.startsWith('https:')));
  return result;
 }
 if(action==='logout'){
  const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('vessel-access='))?.slice(14);
  if(token)await supabaseRequest('/auth/v1/logout',token,{method:'POST'});
  const r=reply({ok:true});for(const name of ['vessel-access','vessel-refresh'])r.headers.append('Set-Cookie',`${name}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0; Secure`);return r;
 }
 if(action==='refresh'){
  const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('vessel-refresh='))?.slice(15);
  if(!token)return reply({error:'Please sign in again. Your open forms are kept.'},401);
  response=await supabaseRequest('/auth/v1/token?grant_type=refresh_token',undefined,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:token})});
 }else if(action==='verify'){
  if(typeof email!=='string'||email.length>254||typeof code!=='string'||!/^\d{6,10}$/.test(code))return reply({error:'Enter the code from your email.'},400);
  response=await supabaseRequest('/auth/v1/verify',undefined,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,token:code,type:'email'})});
 }else return reply({error:'Unknown action.'},400);
 if(!response.ok)return reply({error:'Sign-in could not be verified. Request a new code and try again.'},401);
 const data=await response.json();if(!validTokens(data))return reply({error:'Invalid sign-in response. Please try again.'},503);
 const allowed=await supabaseRequest('/rest/v1/pilot_members?select=user_id&user_id=eq.'+encodeURIComponent(data.user.id),data.access_token);
 if(!allowed.ok||(await allowed.json() as unknown[]).length!==1){await supabaseRequest('/auth/v1/logout?scope=local',data.access_token,{method:'POST'});return reply({error:'This account has not been invited to the family pilot.'},403);}
 const r=reply({ok:true});const secure=new URL(request.url).protocol==='https:'?'; Secure':'';
 sessionCookies(r,data,!!secure);clearFlow(r,!!secure);return r;
 }catch{return reply({error:'Sign-in is temporarily unavailable. Please try again.'},503)}
}
