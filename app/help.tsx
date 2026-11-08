'use client';
import {useState} from 'react';
import {PlayCircle,Search} from 'lucide-react';

type Topic={q:string;a:string;admin?:boolean};
const topics:{group:string;admin?:boolean;items:Topic[]}[]=[
 {group:'Getting started',items:[
  {q:'How do I sign in?',a:'Open Vessel and type your email. A sign-in email arrives with a link, and sometimes a code. If there is a code, typing it on the same screen is the most reliable way, especially if you use Vessel from your home screen. Each link works once and expires after about an hour.'},
  {q:'Why does it ask me to sign in again?',a:'You stay signed in for 30 days on each phone or browser. Opening the sign-in link in a different app (for example the Gmail app) signs in that app, not the one you use. If your email has a code, type it in the browser you use for Vessel instead.'},
  {q:'How do I add Vessel to my home screen?',a:'On iPhone, open Vessel in Safari, tap Share, then Add to Home Screen. On Android, open it in Chrome, tap the menu, then Add to Home screen. Sign in from the home-screen app, using the code from the email if there is one.'},
  {q:'How do I change text size?',a:'More → Text size & display. Turn on Larger text, and Simple home for fewer choices on the first screen. Extra contrast makes text darker.'},
 ]},
 {group:'Medicines',items:[
  {q:'How do I add a medicine with the right dose?',a:'Add → Medications. Pick the medicine, type the amount and choose the unit (for example 50 and mg). Copy the dose exactly from the prescription or box. Choose how often, and tap when it is taken.'},
  {q:'How does tick-off work?',a:'Records → Medications → Schedule. Each dose has a round button: tap it to mark Given, or tap Skipped. Tap a ticked dose again to undo. Use the arrows to look back over the past month. A tick records what someone reported; it never changes the medicine.'},
  {q:'A medicine is not on the schedule',a:'Its times are not set. Tap the medicine, choose when it is taken, and save. Medicines marked Stopped or Completed are not scheduled.'},
 ]},
 {group:'Readings, documents and history',items:[
  {q:'How do I log vitals?',a:'Add → Vitals. Fill in only what was measured (blood pressure, pulse, temperature, oxygen, blood sugar). Blank boxes are skipped. Everything is saved with the date and time you set.'},
  {q:'How do I add a lab result?',a:'Add → Documents. Take a photo or choose a PDF. Type each test name, result, unit and reference range as printed. Tick “I checked these details against the original” when they match; only checked results appear in Compare results.'},
  {q:'Can Vessel read the document for me?',a:'There is an AI option, “Fill details with AI”, that drafts the details from a photo or PDF. It only works when the family admin has switched it on, and you always check the draft before anything is saved.'},
  {q:'How do I remove a mistake?',a:'Open the entry and use Remove from record. Removal asks you to confirm and cannot be undone. Only the record’s owner can remove entries; care-team members can correct their own entries.'},
 ]},
 {group:'Family, care teams and roles',items:[
  {q:'What can each role do?',a:'Caregiver: see everything, add and correct any entry. Patient: the person the record is about; see everything, add entries, correct their own. Contributor (for example a nurse): see medicines, readings, allergies, doctors and the emergency contact; add readings, medicines and documents. Viewer: see everything, change nothing.'},
  {q:'How do I join someone’s care team?',a:'Sign in, open Family, and review the invitation under “Invitations for you”. Once you accept, use Switch record to open their record.'},
  {q:'How do I invite someone to Vessel?',admin:true,a:'Family → Invite to Vessel. Type their email and name, then ask them to open Vessel and sign in with that email. After they have signed in, add them to the right care team with a role.'},
  {q:'How do I remove someone’s access?',admin:true,a:'To stop them seeing one record, use Remove on that care team. To stop them signing in to Vessel at all, use Remove in Invite to Vessel. Their own records are kept.'},
 ]},
 {group:'Privacy and safety',items:[
  {q:'Who can see my records?',a:'Only your account, and the people you add to a care team, in the role you choose. You can change or remove access at any time. Read the privacy notice from More → Privacy & account.'},
  {q:'Is Vessel a medical device or a doctor?',a:'No. Vessel organises what you and your family enter. It does not diagnose, change medicines or send reminders. Keep your original documents and always check with your doctor.'},
 ]},
];

/** Help & how-to: searchable answers and the tour replay. */
export function HelpCenter({admin,onReplay}:{admin:boolean;onReplay:()=>void}){
 const[q,setQ]=useState('');const term=q.trim().toLowerCase();
 const groups=topics.map(g=>({...g,items:g.items.filter(t=>(!t.admin||admin)&&(!term||(t.q+' '+t.a).toLowerCase().includes(term)))})).filter(g=>(!g.admin||admin)&&g.items.length);
 return <div className="help-center">
  <button type="button" className="primary full" onClick={onReplay}><PlayCircle size={18}/>Replay the welcome tour</button>
  <label className="search-box"><Search size={18}/><input aria-label="Search help" placeholder="Search help, for example “tick” or “sign in”" value={q} onChange={e=>setQ(e.target.value)}/></label>
  {groups.map(g=><section key={g.group}><h3>{g.group}</h3>{g.items.map(t=><details key={t.q} className="help-item" open={!!term}><summary>{t.q}</summary><p>{t.a}</p></details>)}</section>)}
  {!groups.length&&<p className="empty-line">No answers match “{q}”. Try another word.</p>}
 </div>;
}
