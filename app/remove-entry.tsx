'use client';
import {useState} from 'react';

/** Removal always takes a second, explicit tap, and says plainly that it cannot be undone. */
export function RemoveEntry({what,detail,onRemove}:{what:string;detail?:string;onRemove:()=>Promise<void>}){
 const[asking,setAsking]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function remove(){setBusy(true);setError('');try{await onRemove()}catch(e){setError(e instanceof Error?e.message:'Unable to remove. Please retry.');setBusy(false)}}
 if(!asking)return <button type="button" className="text-btn danger remove-entry" onClick={()=>setAsking(true)}>Remove from record</button>;
 return <div className="remove-confirm" role="group" aria-label="Confirm removal"><p><strong>Remove {what}?</strong> This cannot be undone.{detail&&' '+detail}</p>{error&&<p role="alert" className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="outline" disabled={busy} onClick={()=>setAsking(false)}>Keep it</button><button type="button" className="danger-btn" disabled={busy} onClick={remove}>{busy?'Removing…':'Yes, remove'}</button></div></div>;
}
