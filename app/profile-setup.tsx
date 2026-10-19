
'use client';
import {VesselLogo} from './vessel-logo';
import {ProfileEditor} from './profile-editor';
import {DraftContext,clearDraft} from './drafts';
import type {Profile} from './health-data';
export function ProfileSetup({profile,onSave}:{profile:Profile;onSave:(p:Profile)=>Promise<void>}){
 const key='onboarding:'+profile.id;
 return <main className="signin-page"><div className="signin-brand"><VesselLogo/></div><section className="card onboarding-card"><div className="onboarding-intro"><span className="eyebrow">WELCOME TO VESSEL</span><h1>Set Up Your Health Profile</h1><p>A few details now make your records easier to use at your next appointment.</p></div><DraftContext.Provider value={key}><ProfileEditor key={profile.id} existing={profile} onboarding onSave={async p=>{await onSave(p);clearDraft(key)}}/></DraftContext.Provider></section></main>
}
