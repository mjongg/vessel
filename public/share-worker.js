/* Only receives explicitly shared files. Never caches pages, APIs, or saved records. */
const PENDING='vessel-share-pending-v1';
const TTL=10*60*1000;
const types=['application/pdf','image/jpeg','image/png','image/webp'];
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function clean(cache){for(const key of await cache.keys()){const value=await cache.match(key);if(Number(value?.headers.get('X-Expires')||0)<Date.now())await cache.delete(key);}}
async function receive(request){
 try{
  if(Number(request.headers.get('Content-Length')||0)>4400000)throw Error('Too large');
  // Bound the body before parsing multipart data.
  const reader=request.body.getReader();let length=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>4400000){await reader.cancel();throw Error('Too large');}chunks.push(value);}
  const form=await new Response(new Blob(chunks),{headers:{'Content-Type':request.headers.get('Content-Type')||''}}).formData();
  const files=form.getAll('file');if(files.length!==1)throw Error('Share one file');
  const file=files[0];if(!(file instanceof File)||!types.includes(file.type)||!file.size||file.size>4000000)throw Error('Unsupported file');
  const cache=await caches.open(PENDING);await clean(cache);
  // Cap pending files, including across simultaneous shares.
  if((await cache.keys()).length>=5)throw Error('Too many pending shares');
  const token=crypto.randomUUID();
  await cache.put(new URL('/share-pending/'+token,self.location.origin),new Response(file,{headers:{'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name.slice(0,180)),'X-Expires':String(Date.now()+TTL)}}));
  return Response.redirect(new URL('/?share='+token,self.location.origin),303);
 }catch{return Response.redirect(new URL('/?shareError=1',self.location.origin),303);}
}
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
 if(url.pathname==='/share-target'&&event.request.method==='POST'){event.respondWith(receive(event.request));return;}
 if(url.pathname.startsWith('/share-pending/'))event.respondWith((async()=>{
  const cache=await caches.open(PENDING);await clean(cache);
  if(event.request.method==='DELETE'){await cache.delete(event.request.url);return new Response(null,{status:204});}
  if(event.request.method!=='GET')return new Response(null,{status:405});
  const response=await cache.match(event.request.url);if(!response)return new Response('Shared file expired',{status:404});
  const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');return new Response(response.body,{headers});
 })());
});
