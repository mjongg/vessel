# Deploy Vessel to Vercel

## Configuration
The repository root is the `vessel` checkout, so Vercel's Root Directory is `.`. Import `mjongg/vessel`, choose Next.js, and retain the build settings in `vercel.json`:
- Install: `npm ci`
- Build: `npm run build:vercel`
- Output: Next.js default (do not set `dist`)
- Node.js: 22.x or a supported newer version

The Node runtime uses Supabase only and does not accept local preview identity headers. The existing `npm run dev` and `npm run build` retain the Cloudflare preview through a Vite-only runtime alias. Local prototype data is not copied to Vercel or Supabase, and is never committed to Git.

## Server environment variables
Set these in Vercel for the intended production environment, then redeploy:
- `VESSEL_BACKEND=supabase`
- `SUPABASE_URL=https://xnqtagzzlujbwmffupmr.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY`: project's publishable key, supplied through Vercel settings
- `VESSEL_APP_URL`: exact HTTPS production origin, without a trailing slash
- `VESSEL_AI_ENABLED=false` until AI is explicitly configured and tested

Optional AI requires `OPENAI_API_KEY` and `OPENAI_MODEL` as server secrets. Do not expose service-role keys or provider secrets through NEXT_PUBLIC variables or Git.

Configure Supabase's Site URL and allowed callbacks for that same production origin. Email sign-in requires invited Auth users, their `pilot_members` entries, working SMTP, and a numeric OTP email template. Google/Apple require their provider accounts and settings. See account-setup.md. No recipient email has been supplied yet.

## Upload and record limits
The current server-proxied upload flow accepts a maximum of 4 MB per file with a 4.4 MB multipart request cap, below Vercel's 4.5 MB function payload limit. Account record snapshots are capped at 4 MB on Supabase. Larger uploads require a separate direct-to-private-storage flow. Keep original documents. Existing files over the cap need their download path verified before moving their account to this host.

## Verification required after linking
Confirm HTTPS deployment, email login, invite-only access, save/reload, file upload/download, sign-out, expired sessions and isolation between two accounts. Verify backup/restore before using this as the only copy of patient records. Native Share-to-Vessel requires installation and device testing on a supported browser. A successful build alone does not establish launch readiness.

Sources: https://vercel.com/docs/frameworks/full-stack/nextjs ; https://vercel.com/docs/git ; https://vercel.com/docs/functions/limitations

## Deployment status — 18 October 2026
Vessel is connected to `mjongg/vessel` under `mjonggs-projects` (project `prj_D1Dl0ubvMbbBDt0DodcoqJJQoz8E`). Git push and Vercel CLI authorization are working. Production is https://vessel-blond-three.vercel.app. The Supabase URL, publishable key, app origin, backend selection and disabled-AI flag are configured in Vercel production. Supabase Site URL and the browser-bound callback are configured for the production origin.

The first owner has been invited and an empty personal profile created. Personal email and account IDs are not stored in source. Default Supabase email uses magic links; Vessel now requests a PKCE link with HttpOnly browser verification cookies and validates pilot membership before creating a session. Numeric codes remain supported for customized email templates. Links must be opened in the initiating browser within 10 minutes.

37 automated tests and TypeScript checks pass. Production page and anonymous session responses were verified. Live signed-in save/reload, file upload/download, email delivery, two-account isolation and backup recovery still require end-to-end verification. Custom SMTP is required before inviting arbitrary family recipients; Google/Apple and AI remain disabled until separately configured. Database security advisors flag intentionally privileged RPC functions; they check the authenticated owner's ID and pilot membership, but an independent security review is still required before general release.
