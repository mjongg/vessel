'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,UserRound,HeartPulse,Plus,FolderHeart,Pill,Phone,FileText,Users,UserPlus,LifeBuoy,Sailboat,type LucideIcon} from 'lucide-react';

export type TourAudience='admin'|'member';
type Go={view?:'Home'|'Records'|'Family';tab?:string};
type Step={icon:LucideIcon;title:string;text:string;targets?:string[];go?:Go;admin?:boolean};

// Short captions, one idea each, pointing at the real control on screen.
const steps:Step[]=[
 {icon:Sailboat,title:'Welcome to Vessel',text:'A quick look around. Tap Next to see where everything is.'},
 {icon:UserRound,title:'Whose record',text:'This shows whose health record you are looking at.',targets:['.profile-strip'],go:{view:'Home'}},
 {icon:HeartPulse,title:'The essentials',text:'Allergies, conditions and medicines are always at the top.',targets:['.home-health'],go:{view:'Home'}},
 {icon:Plus,title:'Add something',text:'Tap here to add a reading, document or medicine.',targets:['.mobile-nav .nav-add','.home-entry','.simple-actions'],go:{view:'Home'}},
 {icon:Pill,title:'Tick off medicines',text:'Tap the circle when a dose is given.',targets:['.med-schedule .dose-tick','.med-schedule','.records-workspace'],go:{view:'Records',tab:'Medications'}},
 {icon:FolderHeart,title:'All your records',text:'Results, medicines, history, vaccines and doctors live here.',targets:['.record-tabs'],go:{view:'Records',tab:'Documents'}},
 {icon:Phone,title:'Call a doctor',text:'Doctors and secretaries. Tap Call.',targets:['.phone-book .contact-card','.phone-book'],go:{view:'Records',tab:'Phone book'}},
 {icon:FileText,title:'For your appointment',text:'A summary to show or print for the doctor.',targets:['.home-visit'],go:{view:'Home'}},
 {icon:Users,title:'Your family',text:'Everyone at a glance: medicines today and latest readings.',targets:['.family-card','.family-dashboard'],go:{view:'Family'},admin:true},
 {icon:UserPlus,title:'Invite and share',text:'Invite family, then choose what each person can do.',targets:['.pilot-invites','.care-team','.family-intro'],go:{view:'Family'},admin:true},
 {icon:LifeBuoy,title:'Help is always here',text:'Bigger text, help, and this tour again.',targets:['.mobile-nav button:last-child','.sidebar-bottom'],go:{view:'Home'}},
];
export const tourLength=(a:TourAudience)=>steps.filter(s=>!s.admin||a==='admin').length;

const visible=(el:Element|null):el is HTMLElement=>!!el&&(el as HTMLElement).offsetParent!==null&&el.getBoundingClientRect().width>0;
const findTarget=(targets?:string[])=>{for(const t of targets||[]){const el=[...document.querySelectorAll(t)].find(visible);if(el)return el}return null};

/** A full-screen tour that dims the page and lights up the real control for each step. */
export function SpotlightTour({audience,step,onStep,onDone,go}:{audience:TourAudience;step:number;onStep:(n:number)=>void;onDone:()=>void;go:(g:Go)=>void}){
 const list=steps.filter(s=>!s.admin||audience==='admin');
 const s=list[Math.min(step,list.length-1)],last=step>=list.length-1;
 const[rect,setRect]=useState<DOMRect|null>(null);
 const targets=s.targets,dest=s.go;
 // Go to the right screen, bring the target into view, then keep the highlight on it as the page moves.
 useEffect(()=>{
  const measure=()=>{const el=findTarget(targets);setRect(el?el.getBoundingClientRect():null)};
  if(dest)go(dest);let t2=0;
  const t1=window.setTimeout(()=>{const el=findTarget(targets);if(el&&!el.closest('.mobile-nav,.sidebar-bottom')){const r=el.getBoundingClientRect(),vh=window.innerHeight,lit=Math.min(r.height+20,vh*.5);if(r.top<70||r.top+lit+340>vh)window.scrollTo({top:Math.max(0,r.top+window.scrollY-84),behavior:'instant' as ScrollBehavior})}t2=window.setTimeout(measure,350)},250);
  window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
  return()=>{clearTimeout(t1);clearTimeout(t2);window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true)};
 },[targets,dest,go]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onDone();if(e.key==='ArrowRight'&&!last)onStep(step+1);if(e.key==='ArrowLeft'&&step>0)onStep(step-1)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[step,last,onStep,onDone]);
 const pad=10,vh=typeof window==='undefined'?800:window.innerHeight,vw=typeof window==='undefined'?400:window.innerWidth,cardH=310;
 // Tall sections are lit only down to half the screen, so the caption always has room.
 const hole=rect&&s.targets?{top:Math.max(6,rect.top-pad),left:Math.max(6,rect.left-pad),width:Math.min(vw-12,rect.width+pad*2),height:Math.min(vh*.5,rect.height+pad*2,vh-12-Math.max(6,rect.top-pad))}:null;
 const spaceBelow=hole?vh-(hole.top+hole.height):0,spaceAbove=hole?hole.top:0;
 const cardStyle:React.CSSProperties=!hole?{top:'50%',transform:'translate(-50%,-50%)'}:spaceBelow>=cardH+24?{top:hole.top+hole.height+14}:spaceAbove>=cardH+24?{bottom:vh-hole.top+14}:{bottom:14};
 const Icon=s.icon;
 return <div className="spotlight" role="dialog" aria-modal="true" aria-labelledby="spotlight-title">
  {hole?<div className="spotlight-hole" style={hole}/>:<div className="spotlight-dim"/>}
  <div className={'spotlight-card'+(hole?'':' centered')} style={cardStyle}>
   <div className="spotlight-head"><span className="spotlight-icon"><Icon size={30}/></span><div><p className="spotlight-count">{step+1} of {list.length}</p><h2 id="spotlight-title">{s.title}</h2></div></div>
   <p className="spotlight-text">{s.text}</p>
   <div className="spotlight-dots" aria-hidden="true">{list.map((_,i)=><span key={i} className={i===step?'on':i<step?'done':''}/>)}</div>
   <div className="spotlight-actions">
    {step>0?<button type="button" className="outline" onClick={()=>onStep(step-1)}><ArrowLeft size={20}/>Back</button>:<button type="button" className="text-btn" onClick={onDone}>Skip</button>}
    <button type="button" className="primary" autoFocus onClick={()=>last?onDone():onStep(step+1)}>{last?'Done':'Next'}{!last&&<ArrowRight size={20}/>}</button>
   </div>
   {step>0&&!last&&<button type="button" className="text-btn spotlight-skip" onClick={onDone}>End tour</button>}
  </div>
 </div>;
}
