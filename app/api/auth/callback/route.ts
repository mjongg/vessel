import {setting,supabaseEnabled,supabaseRequest} from '../../../../lib/server/supabase';
import {pilotAllowed} from '../../../../lib/server/oauth';
import {appOrigin,clearFlow,cookieValue,sessionCookies,validFlow,validTokens} from '../../../../lib/server/oauth-flow';
export async function GET(request:Request){
 let origin:string;try{origin=appOrigin(setting('VESSEL_APP_URL'));if(!supabaseEnabled()||new URL(request.url).origin!==origin)throw new Error();}catch{return new Response('Sign-in is not configured for this address.',{status:503,headers:{'Cache-Control':'no-store'}})}
 const secure=origin.startsWith('https:');
 function finish(error?:string){const url=new URL(error?'/sign-in':'/',origin);if(error)url.searchParams.set('auth_error',error);const response=new Response(null,{status:303,headers:{Location:url.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});clearFlow(response,secure);return response;}
 const url=new URL(request.url),code=url.searchParams.get('code');
 if(!validFlow(request))return finish('expired');
 if(url.searchParams.has('error'))return finish('cancelled');
 if(!code||code.length>2048)return finish('expired');
 try{
 const exchange=await supabaseRequest('/auth/v1/token?grant_type=pkce',undefined,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({auth_code:code,code_verifier:cookieValue(request,'vessel-pkce')})});
 if(!exchange.ok)return finish('expired');const tokens=await exchange.json();if(!validTokens(tokens))return finish('unavailable');
 if(!await pilotAllowed(tokens.access_token,tokens.user.id)){try{await supabaseRequest('/auth/v1/logout?scope=local',tokens.access_token,{method:'POST'})}catch{}return finish('invite');}
 const response=finish();sessionCookies(response,tokens,secure);return response;
 }catch{return finish('unavailable')}
}
