'use client';
import {useCallback,useEffect,useState} from 'react';
import {UserPlus} from 'lucide-react';
import {vesselFetch} from './api-client';
import {dateText} from './health-data';

type Invite={email:string;label:string;invitedAt:string;status:'pending'|'joined'|'removed'};
const statusText={pending:'Invited · not signed in yet',joined:'Has a Vessel account',removed:'Access removed'};

/** The family admin's list of who may join Vessel. Joining gives an account only; access to a record still comes from a care team. */
export function PilotInvites(){
 const[invites,setInvites]=useState<Invite[]>([]),[email,setEmail]=useState(''),[label,setLabel]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[removing,setRemoving]=useState<string|null>(null);
 const load=useCallback(async()=>{try{const r=await vesselFetch('/api/invites',{cache:'no-store'});const d=await r.json() as {invites?:Invite[];error?:string};if(!r.ok)throw new Error(d.error);setInvites(d.invites||[])}catch(e){setError(e instanceof Error&&e.message?e.message:'Invitations could not be loaded.')}},[]);
 // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the invite list from the server
 useEffect(()=>{void load()},[load]);
 async function send(body:Record<string,string>,done:string){setBusy(true);setError('');setMessage('');try{const r=await vesselFetch('/api/invites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(d.error);setMessage(done);setEmail('');setLabel('');setRemoving(null);await load()}catch(e){setError(e instanceof Error&&e.message?e.message:'Not saved.')}finally{setBusy(false)}}
 const active=invites.filter(i=>i.status!=='removed');
 return <section className="card pilot-invites"><div className="section-title"><div><h2>Invite to Vessel</h2><p className="muted">Add someone’s email so they can create their own Vessel account. They sign in with a link or code sent to that email. To let them see a record, add them to that record’s care team below.</p></div></div>
  <form className="entry-form invite-form" onSubmit={e=>{e.preventDefault();void send({action:'invite',email,label},'Invited. Ask '+(label||'them')+' to open Vessel and sign in with '+email+'.')}}>
   <div className="two-fields"><label className="field"><span>Their email</span><input type="email" required maxLength={254} autoComplete="off" value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/></label><label className="field"><span>Name</span><input required maxLength={80} placeholder="For example: Auntie Claire" value={label} disabled={busy} onChange={e=>setLabel(e.target.value)}/></label></div>
   <button className="primary" disabled={busy}><UserPlus size={17}/>{busy?'Saving…':'Invite'}</button>
  </form>
  {error&&<p role="alert" className="form-error">{error}</p>}{message&&<p role="status" className="success-note">{message}</p>}
  {active.length>0&&<ul className="invite-list">{active.map(i=><li key={i.email}><div><strong>{i.label}</strong><p>{i.email}</p><small>{statusText[i.status]} · invited {dateText(i.invitedAt)}</small></div>
   {removing===i.email?<div className="remove-confirm"><p><strong>Remove {i.label}’s access to Vessel?</strong> They will no longer be able to sign in. Their own records are kept.</p><div className="modal-actions"><button type="button" className="outline" disabled={busy} onClick={()=>setRemoving(null)}>Keep</button><button type="button" className="danger-btn" disabled={busy} onClick={()=>void send({action:'remove',email:i.email},'Removed.')}>Yes, remove</button></div></div>
   :<button type="button" className="text-btn danger" disabled={busy} onClick={()=>setRemoving(i.email)}>Remove</button>}</li>)}</ul>}
 </section>;
}
