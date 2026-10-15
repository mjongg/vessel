'use client';
import {SignIn} from '../sign-in';
export default function SignInPage(){return <SignIn onSignedIn={()=>window.location.assign('/')}/>}
