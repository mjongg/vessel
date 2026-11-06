'use client';
import {useCallback,useEffect,useState} from 'react';
import {vesselFetch} from './api-client';
import {dateText,type Profile} from './health-data';
import {roleDetails,roleNames,sharedId,type CareRole,type SharedProfile} from './care';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';

type Member={id:string;profileId:string;profileName:string;email:string;label:string;role:CareRole;status:'pending'|'accepted'|'expired';expiresAt:string};
type Invitation={id:string;role:CareRole;status:'pending'|'accepted';expiresAt:string;from:string;profileName:string;label:string};
type Change={action:'accept'|'decline'|'leave'|'revoke';id:string;title:string;detail:string};
const roles=Object.keys(roleNames) as CareRole[];

async function fetchTeams(){
 const r=await vesselFetch('/api/care',{cache:'no-store'});
 const d=await r.json() as {error?:string;team:Member[];invitations:Invitation[]};
 if(!r.ok)throw new Error(d.error||'Unable to load care teams.');
 return d;
}

export function CareTeam({profiles,shared,onChanged,onOpen}:{profiles:Profile[];shared:SharedProfile[];onChanged:()=>void;onOpen:(profileId:string)=>void}){
 const[team,setTeam]=useState<Member[]>([]),[invitations,setInvitations]=useState<Invitation[]>([]);
 const[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const[inviteFor,setInviteFor]=useState<Profile|null>(null),[email,setEmail]=useState(''),[label,setLabel]=useState(''),[role,setRole]=useState<CareRole>('caregiver');
 const[confirm,setConfirm]=useState<Change|null>(null);

 const refresh=useCallback(async()=>{
  try{const d=await fetchTeams();setTeam(d.team);setInvitations(d.invitations);setError('')}
  catch(e){setError(e instanceof Error?e.message:'Unable to load care teams.')}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{let active=true;fetchTeams().then(d=>{if(active){setTeam(d.team);setInvitations(d.invitations)}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load care teams.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);

 async function send(body:Record<string,string>,done:string){
  setBusy(true);setError('');setMessage('');
  try{
   const r=await vesselFetch('/api/care',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const d=await r.json() as {error?:string};
   if(!r.ok)throw new Error(d.error||'Unable to save.');
   setInviteFor(null);setConfirm(null);setEmail('');setLabel('');setMessage(done);
   await refresh();onChanged();
  }catch(e){setError(e instanceof Error?e.message:'Unable to save.')}
  finally{setBusy(false)}
 }

 const pending=invitations.filter(i=>i.status==='pending'),accepted=invitations.filter(i=>i.status==='accepted');
 return <section className="card family-sharing care-team">
  <div className="section-title"><div><h2>Care Teams</h2><p className="muted">Give specific people access to one person’s record. You stay in control: change a role or remove access at any time.</p></div></div>
  {loading&&<p role="status">Loading care teams…</p>}
  {error&&!inviteFor&&!confirm&&<p role="alert" className="form-error">{error}</p>}
  {message&&<p role="status">{message}</p>}

  {pending.length>0&&<div className="sharing-list"><h3>Invitations for You</h3>{pending.map(i=><div className="sharing-row" key={i.id}>
   <div><strong>{i.profileName}’s record</strong><p>{roleNames[i.role]} · Invited by {i.from} · Expires {dateText(i.expiresAt)}</p></div>
   <div className="family-actions">
    <button className="primary" disabled={busy} onClick={()=>setConfirm({action:'accept',id:i.id,title:'Join '+i.profileName+'’s care team?',detail:'You will join as '+roleNames[i.role]+'. '+roleDetails[i.role]+' Your entries will be shown as “'+i.label+'”. You can leave at any time.'})}>Review Invitation</button>
    <button className="text-btn" disabled={busy} onClick={()=>setConfirm({action:'decline',id:i.id,title:'Decline this invitation?',detail:'You will not get access to '+i.profileName+'’s record. Your own records do not change.'})}>Decline</button>
   </div></div>)}</div>}

  {accepted.length>0&&<div className="sharing-list"><h3>Records You Help With</h3>{accepted.map(i=>{const open=shared.find(s=>s.access===i.id);return <div className="sharing-row" key={i.id}>
   <div><strong>{i.profileName}</strong><p>{roleNames[i.role]} · Shared by {i.from}</p><p className="muted">{roleDetails[i.role]}</p></div>
   <div className="family-actions">
    {open&&<button className="outline" disabled={busy} onClick={()=>onOpen(sharedId(i.id))}>Open Record</button>}
    <button className="text-btn" disabled={busy} onClick={()=>setConfirm({action:'leave',id:i.id,title:'Leave '+i.profileName+'’s care team?',detail:'You will lose access to this record. Entries you already added stay in the record.'})}>Leave</button>
   </div></div>})}</div>}

  <div className="sharing-list"><h3>Teams You Manage</h3>{profiles.map(p=>{const members=team.filter(m=>m.profileId===p.id);return <div className="care-profile" key={p.id}>
   <div className="sharing-row"><div><strong>{p.name}</strong><p>{members.length?members.length+(members.length===1?' person':' people')+' on this care team':'Only you can see this record'}</p></div>
    <button className="outline" disabled={busy} onClick={()=>{setError('');setRole('caregiver');setInviteFor(p)}}>Add Person</button></div>
   {members.map(m=><div className="sharing-row care-member" key={m.id}>
    <div><strong>{m.label}</strong><p>{m.email} · {m.status==='accepted'?'Active':m.status==='pending'?'Awaiting acceptance · Expires '+dateText(m.expiresAt):'Invitation expired'}</p></div>
    <div className="family-actions">
     <label className="care-role"><span className="sr-only">Role for {m.label}</span><select value={m.role} disabled={busy} onChange={e=>void send({action:'role',access:m.id,role:e.target.value},'Role updated.')}>{roles.map(r=><option key={r} value={r}>{roleNames[r]}</option>)}</select></label>
     <button className="text-btn" disabled={busy} onClick={()=>setConfirm({action:'revoke',id:m.id,title:'Remove '+m.label+' from '+p.name+'’s care team?',detail:'This ends their access now. Entries and files they added stay in the record. Anything they already saw or copied cannot be recalled.'})}>Remove</button>
    </div></div>)}
  </div>})}</div>

  <Dialog open={!!inviteFor} onOpenChange={v=>{if(!v&&!busy)setInviteFor(null)}}><DialogContent><DialogHeader><DialogTitle>Add to {inviteFor?.name}’s Care Team</DialogTitle><DialogDescription>They need their own confirmed Vessel account. No email is sent: ask them to sign in and open Family to accept within seven days.</DialogDescription></DialogHeader>
   <form className="entry-form" onSubmit={e=>{e.preventDefault();if(inviteFor)void send({action:'invite',profile:inviteFor.id,email,label,role},'Invitation created. Ask them to sign in to Vessel and open Family to accept.')}}>
    <label className="field"><span>Their Vessel Email</span><input type="email" required maxLength={254} value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/></label>
    <label className="field"><span>Name Shown on Their Entries</span><input required maxLength={80} placeholder="For example: Auntie, Day nurse" value={label} disabled={busy} onChange={e=>setLabel(e.target.value)}/></label>
    <label className="field"><span>Role</span><select value={role} disabled={busy} onChange={e=>setRole(e.target.value as CareRole)}>{roles.map(r=><option key={r} value={r}>{roleNames[r]}</option>)}</select></label>
    <p className="info-note">{roleDetails[role]} Access covers this one record only, never your other profiles. Only you can remove entries, edit profile details or manage the team. Invite only people authorized to see this person’s health information.</p>
    {error&&<p role="alert" className="form-error">{error}</p>}
    <button className="primary" disabled={busy}>{busy?'Creating Invitation…':'Create Invitation'}</button>
   </form></DialogContent></Dialog>

  <Dialog open={!!confirm} onOpenChange={v=>{if(!v&&!busy)setConfirm(null)}}><DialogContent><DialogHeader><DialogTitle>{confirm?.title}</DialogTitle><DialogDescription>Care team access</DialogDescription></DialogHeader>
   <p>{confirm?.detail}</p>{error&&<p role="alert" className="form-error">{error}</p>}
   <div className="family-actions"><button className="outline" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button><button className="primary" disabled={busy} onClick={()=>confirm&&void send({action:confirm.action,access:confirm.id},confirm.action==='accept'?'You joined the care team. The record is now in your profile list.':'Access updated.')}>{busy?'Saving…':'Confirm'}</button></div>
  </DialogContent></Dialog>
 </section>;
}
