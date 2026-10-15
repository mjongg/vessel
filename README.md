# Vessel

Personal medical records with managed family profiles. Purple, accessible interface for documents, laboratory comparisons, medical history, medications, vaccinations, vital signs and appointment summaries.

**Release status:** pre-release, invite-only pilot preparation. Do not use as the only copy of medical records. Live authentication, backup recovery and AI extraction must be verified before real patient use. See [launch readiness](research/family-pilot-launch.md).

## Local development

Node 22.13+ required.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wet_lily_hollister.sql
npm run dev
```

Apply the local migration only once to a fresh database. Preview: http://127.0.0.1:5173/ . Local demo authentication is a development mock account. Do not expose the development server publicly. Local database and file state are ignored by Git.

## Supabase family pilot

Supabase provides Auth, Postgres and private Storage. The web application still needs its Cloudflare/Vinext frontend/server host; connecting a GitHub repository to Supabase does not publish this website.

- Apply the migrations in `supabase/migrations` to a new project, in order.
- Disable public sign-ups. Configure SMTP and email OTP templates with `{{ .Token }}`.
- Create invited Auth users and add their UUIDs to `pilot_members`. Pilot enrollment does not share medical records across accounts.
- Set server runtime variables listed in `.env.example`. For local Cloudflare development use ignored `.dev.vars` or supported process environment. For production use the host's secret manager.
- Private bucket: `vessel-records`. Only the owning, invited account may access its files. Uploaded files are read back and hashed before confirmation.
- Pilot allowance: 1 GB/account, 10 MB/file. The current UI still synchronizes a whole account snapshot (8 MB request limit); pagination and incremental updates remain required for long-term scale.
- Never commit API secrets, database passwords, authentication tokens or patient data. No service-role key is used by the application.

## AI-assisted uploads

Implemented behind an off-by-default server switch. Configure an OpenAI API key and an account-supported model that handles PDF/image inputs with structured output. Validate with synthetic documents first.

Flow: upload original → explicit processing consent → category, fields, results and summary suggestions → confirm patient → review editable fields → save. Extraction never changes medications or diagnoses automatically. Unknown values remain blank; reference ranges are copied from the report. The API uses `store:false`, which does not itself guarantee zero provider retention. Review provider controls and privacy requirements before enabling real-record processing.

AI limits: 5 MB/file and 10 attempts/account/hour. Manual entry remains available.

## Checks

```sh
./node_modules/.bin/tsc --noEmit
node --experimental-strip-types --test tests/health.test.mjs tests/merge.test.mjs tests/nearby.test.mjs tests/schema.test.mjs
npm run build
```

With the **local demo** running, `python3 tests/api-check.py` checks authentication, save conflicts and a fictional attachment round-trip. It writes one local test file and increments the existing account revision. Do not run it against a production account.

## Current limits

Managed profiles are within one account; cross-account caregiver sharing is not implemented. No diagnosis, voice entry, doctor booking, automated vaccination schedule, DICOM viewer or full offline reopening. Nearby directory requests may fail; Google Maps fallback remains available. Drafts survive closing a form, not reloading a tab. Profile JSON export excludes attachment bytes and is not a full backup.

Database backups and uploaded-file backups are separate. A restore drill and production access tests are release requirements. See the launch-readiness document for outstanding work and evidence; a successful build is not a production-readiness claim.
