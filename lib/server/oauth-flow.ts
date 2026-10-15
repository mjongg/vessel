// PKCE helpers are independent of the runtime so the security boundaries can be tested.
export type OAuthProvider='google'|'apple';
export const isProvider=(value:unknown):value is OAuthProvider=>value==='google'||value==='apple';
export function appOrigin(value:string){
 const url=new URL(value);
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))throw new Error('Invalid app URL');
 return url.origin;
}
function base64url(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
export async function createFlow(){const verifier=base64url(crypto.getRandomValues(new Uint8Array(32)));return {verifier,state:base64url(crypto.getRandomValues(new Uint8Array(32))),challenge:base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))};}
export function cookieValue(request:Request,name:string){return request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';}
export function validFlow(request:Request){const url=new URL(request.url),state=url.searchParams.get('flow'),verifier=cookieValue(request,'vessel-pkce');return !!state&&/^[A-Za-z0-9_-]{43}$/.test(state)&&state===cookieValue(request,'vessel-flow')&&/^[A-Za-z0-9_-]{43}$/.test(verifier);}
export function flowCookie(name:string,value:string,secure:boolean,age=600){return `${name}=${value}; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=${age}${secure?'; Secure':''}`;}
export function clearFlow(response:Response,secure:boolean){for(const name of ['vessel-pkce','vessel-flow'])response.headers.append('Set-Cookie',flowCookie(name,'',secure,0));}
export type AuthTokens={access_token:string;refresh_token:string;expires_in:number;user:{id:string}};
export function validTokens(data:unknown):data is AuthTokens{const d=data as AuthTokens;return !!d&&typeof d.access_token==='string'&&/^[A-Za-z0-9._~-]+$/.test(d.access_token)&&typeof d.refresh_token==='string'&&/^[A-Za-z0-9._~-]+$/.test(d.refresh_token)&&Number.isFinite(d.expires_in)&&d.expires_in>0&&typeof d.user?.id==='string';}
export function sessionCookies(response:Response,data:AuthTokens,secure:boolean){response.headers.append('Set-Cookie',`vessel-access=${data.access_token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(Math.min(data.expires_in,3600))}${secure?'; Secure':''}`);response.headers.append('Set-Cookie',`vessel-refresh=${data.refresh_token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure?'; Secure':''}`);}
