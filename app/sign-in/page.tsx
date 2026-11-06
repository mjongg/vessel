'use client';
import {SignIn} from '../sign-in';
// A full page load after sign-in is deliberate: the shell must start from the new session cookies.
// eslint-disable-next-line @next/next/no-location-assign-relative-destination
export default function SignInPage(){return <SignIn onSignedIn={()=>window.location.assign('/')}/>}
