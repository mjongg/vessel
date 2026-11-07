const limit=4000000;

/** Phone photos are often over the upload limit. Shrinks only those, keeping them readable; PDFs and small files pass through untouched. */
export async function fitUpload(file:File):Promise<File>{
 if(file.size<=limit||!file.type.startsWith('image/'))return file;
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file)}catch{return file}
 const name=file.name.replace(/\.[^.]+$/,'')+'.jpg';
 for(const longest of [3200,2600,2000]){
  const scale=Math.min(1,longest/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d')?.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob|null>(done=>canvas.toBlob(done,'image/jpeg',.85));
  if(blob&&blob.size<=limit){bitmap.close();return new File([blob],name,{type:'image/jpeg'})}
 }
 bitmap.close();return file;
}
