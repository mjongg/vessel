'use client';
import {vesselFetch} from './api-client';
import {useEffect,useState} from 'react';
import {fileKey} from './file-key';
type PreviewProps={file?:File|null;id?:string;name?:string};
// Remount per source so each preview starts from a clean loading state.
export function FilePreview(props:PreviewProps){if(!props.file&&!props.id)return null;return <Preview key={props.file?fileKey(props.file):'id-'+props.id} {...props}/>}
function Preview({file,id,name}:PreviewProps){const[url,setUrl]=useState(''),[mime,setMime]=useState(''),[error,setError]=useState('');useEffect(()=>{let active=true,objectUrl='';const controller=new AbortController();async function read(){try{const blob=file||await vesselFetch('/api/files?id='+encodeURIComponent(id!),{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Preview unavailable. Try downloading the original.');return r.blob()});if(!active||!blob)return;setMime(blob.type);objectUrl=URL.createObjectURL(blob);setUrl(objectUrl)}catch(e){if(active)setError(e instanceof Error?e.message:'Preview unavailable')}}if(file||id)read();return()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)}},[file,id]);if(!file&&!id)return null;return <section className="file-preview"><h3>Original document</h3>{error?<p role="alert">{error}</p>:!url?<p>Loading preview…</p>:mime==='application/pdf'?<iframe title={'Original document '+(name||file?.name||'')} src={url}/>:mime.startsWith('image/')?<img src={url} alt={'Original document '+(name||file?.name||'')}/>:<p>Preview unavailable for this file type.</p>}</section>}
