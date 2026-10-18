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

## Connection status — 18 October 2026
The Vercel create-project API reported success for `vessel` (`prj_D1Dl0ubvMbbBDt0DodcoqJJQoz8E`) under `mjonggs-projects` (`team_2caqefiGhgf7stlBm8JBv1Rx`). A subsequent project lookup with that explicit team returned HTTP 403 scope access denied. The Git link and settings therefore remain unverified; no deployment was created. Local project-link metadata is stored in ignored `.vercel/project.json` so this project can be reused after access is corrected.

Git HTTPS push still has no local credentials; the GitHub connector's tree-write request returned HTTP 403 Resource not accessible by integration. No source was pushed. Authenticate Git for `mjongg/vessel` or grant the GitHub installation repository write access. Reauthorize Vercel for the intended team before resuming. Do not create another project merely because lookup is blocked.

Both Next.js and Cloudflare builds passed. All 34 unit tests passed. The locally running Next.js production build served the home page/manifest and rejected anonymous and forged preview-identity headers on health, file and storage routes. This does not verify live Supabase auth/storage or native share-sheet behavior.
