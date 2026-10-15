import {sameOrigin,setting,supabaseEnabled} from '../../../../lib/server/supabase';
import {oauthAvailability} from '../../../../lib/server/oauth';
import {appOrigin,createFlow,flowCookie,isProvider} from '../../../../lib/server/oauth-flow';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Invalid origin.'},403);
 if(!supabaseEnabled())return reply({error:'Account sign-in is not configured yet.'},503);
 try{
 const raw=await request.text();if(raw.length>200)return reply({error:'Request too large.'},413);
 const {provider}=JSON.parse(raw);if(!isProvider(provider))return reply({error:'Unsupported sign-in provider.'},400);
 const origin=appOrigin(setting('VESSEL_APP_URL'));
 if(new URL(request.url).origin!==origin)return reply({error:'Please sign in from the configured Vessel address.'},403);
 if(!(await oauthAvailability())[provider])return reply({error:'This sign-in option has not been activated yet. Use email instead.'},503);
 const flow=await createFlow(),callback=new URL('/api/auth/callback',origin);callback.searchParams.set('flow',flow.state);
 const base=setting('SUPABASE_URL');if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base))throw new Error('Invalid Supabase URL');
 const authorize=new URL('/auth/v1/authorize',base);authorize.searchParams.set('provider',provider);authorize.searchParams.set('redirect_to',callback.href);authorize.searchParams.set('code_challenge',flow.challenge);authorize.searchParams.set('code_challenge_method','s256');
 const response=reply({url:authorize.href});const secure=origin.startsWith('https:');response.headers.append('Set-Cookie',flowCookie('vessel-pkce',flow.verifier,secure));response.headers.append('Set-Cookie',flowCookie('vessel-flow',flow.state,secure));return response;
 }catch{return reply({error:'Unable to start sign-in. Please try again.'},503)}
}
