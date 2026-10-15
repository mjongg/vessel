import {setting,supabaseEnabled,supabaseRequest} from './supabase';
import {appOrigin} from './oauth-flow';
export async function oauthAvailability(){
 const disabled={google:false,apple:false};
 if(!supabaseEnabled()||!setting('VESSEL_APP_URL'))return disabled;
 try{appOrigin(setting('VESSEL_APP_URL'));const response=await supabaseRequest('/auth/v1/settings');if(!response.ok)return disabled;const settings=await response.json() as {external?:{google?:boolean;apple?:boolean}};return {google:settings.external?.google===true,apple:settings.external?.apple===true};}catch{return disabled;}
}
export async function pilotAllowed(token:string,id:string){const response=await supabaseRequest('/rest/v1/pilot_members?select=user_id&user_id=eq.'+encodeURIComponent(id),token);return response.ok&&(await response.json() as unknown[]).length===1;}
