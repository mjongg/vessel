# Vessel family pilot — readiness, 15 October 2026

## Current status
Local implementation and tests in progress. No public deployment or real patient records transferred; AI remains disabled. The user-created vessel Supabase project is healthy in Sydney (ap-southeast-2). Both the foundation migration and anonymous-RPC restriction migration were applied successfully. Live user authentication and file round-trips are not yet tested. The user chose invite-only family access in MJ's Org. The Supabase connector is connected, but get_cost returned UNAVAILABLE, preventing supported project creation through that connector. User created vessel through the dashboard in Sydney; its configured region was preserved.

## Changes in this pass
- Removed fictional seed data from initial rendering and load-error paths.
- Kept IDs stable across document, reading and profile retries; explicit empty/loading state.
- Unified purple design, headings, controls, responsive cards, and rem-based text sizing.
- Search now includes readings and vaccinations. Fixed missing birth-date display and edit-profile title.
- Added optional Supabase server adapter, invite-only email-code sign-in, HttpOnly session cookies and refresh endpoint, owner-scoped record access and private file storage.
- Prepared transactional normalized profiles/entries migration, revision checks, metadata-only audit events, pilot membership checks and private storage policies. Existing local D1/R2 data remains unchanged.
- Added file upload read-back/hash verification on Supabase, bounded request reads, and storage usage display.
- Added AI extraction endpoint and review UI: consent per file, owner check, provider toggle, 5 MB AI limit, 10 requests/account/hour, strict JSON schema, source quotes, patient confirmation and editable draft. No diagnosis, prescribing, inferred ranges, automatic medication changes, or autonomous saving. Model output remains untrusted.

## Configure a NEW Supabase project
1. For a new environment, create Vessel in the chosen organization and region. The current pilot project exists in Sydney. User must see and accept pricing. Keep database password private.
2. Apply `supabase/migrations/202610150001_family_pilot.sql`; this is a new-project migration, not a patch for existing tables.
3. Disable public sign-ups in Supabase Auth. Configure trusted SMTP with adequate rate limits and the email OTP template to include `{{ .Token }}`. The UI supports emailed codes, not magic-link callbacks.
4. Provision invited Auth users using the dashboard; add their UUIDs to `public.pilot_members`. No anonymous signup, no automatic allowlist enrollment, no public buckets. Do not send invitations until the intended email recipients are supplied.
5. Configure server-side runtime variables: `VESSEL_BACKEND=supabase`, `SUPABASE_URL=https://<project-ref>.supabase.co`, `SUPABASE_PUBLISHABLE_KEY=<publishable key>`. No service-role key in the web client or this repository.
6. Test sign-in, expiry/refresh, revocation, sign-out, two-account isolation, guessed file IDs, and direct REST/RPC/storage access. Confirm storage quota behavior through direct API access too.
7. For AI only after privacy/provider review: `VESSEL_AI_ENABLED=true`, `OPENAI_API_KEY=<server secret>`, `OPENAI_MODEL=<account-supported model accepting PDFs/images and structured outputs>`. No default model is silently selected. Use synthetic documents first, including illegible pages, multiple patients, rotated images, non-medical files and prompt-injection text. `store:false` is set, but this is not a promise of zero provider retention; review actual provider account settings.
8. Deploy the web frontend/server on an appropriate host with HTTPS. Supabase provides backend services; provisioning a database does not deploy this existing Cloudflare/Vinext web frontend.

## Capacity and recovery — not yet signed off
- File allowance is provisionally 1 GB/account; 10 MB/file (PDF/JPEG/PNG/WebP), 5 MB/file for AI. Pending uploads count toward allowance. This is an application allowance, not a purchased storage-plan guarantee.
- Relational entries are prepared, but the client still loads/saves a whole account snapshot. Supabase request limit is 8 MB; legacy local limit remains 1.5 MB. Schema still limits 30 profiles, 1,000 documents/profile and 3,000 readings/profile. Long-term use requires paginated reads, incremental mutations and capacity tests before these boundaries.
- Abandoned uploads and replacement versions need an explicit retention/deletion process. Do not purge objects until references and retention are confirmed. Uploading may leave pending/orphan objects on uncertain network failures.
- Exported profile JSON does NOT contain original file bytes and is not a complete backup. There is no full archive import yet.
- Supabase database backups do not back up Storage file contents. Configure independent encrypted file backups, database backups, retention, access monitoring and a restore drill in a separate environment. Verify restored originals by SHA-256 and document references, not just file counts.
- No system can promise that storage will never fail. Do not discard originals or treat this as the only copy until backup/recovery is demonstrated.

## Product scope still incomplete
- Managed profiles within one account work; cross-account sharing/invites/revocable caregiver roles are not implemented. Inviting an account to the pilot does not grant it another account's health data.
- Nearby directory uses Photon/Overpass; Maps fallback exists. Directory availability, completeness, telephone data and opening hours are not guaranteed.
- Offline: loaded page and downloaded summary only; reload requires a connection. Drafts are memory-only and do not survive browser reload.
- Voice entry, doctor booking, automatic vaccination schedules, DICOM viewing, multi-file/multi-patient splitting, verified OCR and provider clinical review are not completed.
- Patient-facing privacy notice, consent and caregiver authorization, deletion/account closure, incident process, legal review for the Philippines and monitoring still need completion before real records/public release.

## Evidence
Existing 10 unit tests pass; 5 extraction-schema tests pass; TypeScript check passes. Local API test passes authentication, record round-trip, stale-save rejection, malformed JSON, origin rejection, file round-trip and anonymous file denial. Browser checks cover Home, record tabs and family profiles; more checks recorded as performed. Supabase migrations applied successfully. Security advisor anonymous-function warnings were addressed with a follow-up migration; authenticated security-definer functions are intentional and still require isolation tests. No live Auth, Storage or OpenAI round-trip is claimed. Nearby lookup retested with a public landmark and returned 503; disabled AI returned 503 as expected.

Sources: https://supabase.com/docs/guides/platform/backups ; https://supabase.com/docs/guides/deployment/going-into-prod ; https://supabase.com/docs/guides/storage/security/access-control ; https://supabase.com/docs/guides/auth/auth-email-passwordless ; https://developers.openai.com/api/docs/guides/file-inputs ; https://developers.openai.com/api/docs/guides/structured-outputs
