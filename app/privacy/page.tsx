import Link from 'next/link';
import {VesselLogo} from '../vessel-logo';

export const metadata={title:'Privacy notice — Vessel'};

export default function Privacy(){
 return <main className="legal-page"><Link href="/" aria-label="Vessel home"><VesselLogo/></Link>
  <h1>Privacy notice</h1><p>Family pilot version, November 2026. This notice has not yet had legal review.</p>
  <h2>What Vessel is</h2><p>Vessel is an invite-only pilot that helps a family keep medical records in one place. It is run by MJ Ong. It is not a hospital, clinic or medical device, and it does not give medical advice.</p>
  <h2>What is stored</h2><ul><li>Your email address, used to sign in.</li><li>What you enter: names, birth dates, contacts, allergies, conditions, medicines, readings, vaccinations and doctors’ contacts.</li><li>Files you upload, such as lab results and prescriptions.</li><li>A log of account activity that records what kind of change happened, not its medical content.</li></ul>
  <h2>Where it is stored</h2><p>Records and files are stored with Supabase in Sydney, Australia, and the app runs on Vercel. Both act as service providers, and data is encrypted in transit.</p>
  <h2>Who can see it</h2><p>Only your account can open your records, unless you invite someone to a care team. Each invited person sees what their role allows, and you can remove them at any time. The people running the pilot can technically reach the database to keep it working; they do not browse records.</p>
  <h2>Other people’s records</h2><p>Only add someone else’s information if you care for them and they, or the person legally responsible for them, agree.</p>
  <h2>AI features</h2><p>AI document reading is switched off. If it is switched on later, this notice will say which provider is used, and a document will only be sent after you choose to send it.</p>
  <h2>Keep your own copies</h2><p>Vessel is still being tested. Keep your original documents. Do not rely on Vessel as your only copy, or in an emergency.</p>
  <h2>Your choices</h2><p>You can correct or remove entries, and download a profile’s data, from within the app. Downloads do not include uploaded files. To see what is held about you, or to close your account and have your data deleted, ask the person who invited you. In the Philippines, the Data Privacy Act of 2012 (Republic Act No. 10173) gives you rights over your personal data, including the right to complain to the National Privacy Commission.</p>
 </main>;
}
