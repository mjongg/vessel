export async function limitedBody(request:Request,max:number):Promise<Uint8Array>{
 if(Number(request.headers.get('content-length')||0)>max)throw new Error('Request too large');
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks:Uint8Array[]=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>max){await reader.cancel();throw new Error('Request too large')}chunks.push(value)}}finally{reader.releaseLock()}
 const result=new Uint8Array(length);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.length}return result;
}
