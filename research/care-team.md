# Care teams

Added 6 November 2026. Status: **migration applied to the live `vessel` Supabase project on 6 November 2026 and database access checks passed there.** The app code is not deployed yet, and the care-team screens have not been used in a signed-in browser session.

## What it does

The account that holds a profile is that profile's admin. The admin can add other Vessel accounts to **one profile's** care team. Members never see the admin's other profiles. Access is by invitation to an existing, confirmed pilot account; it expires after seven days if not accepted, and no email is sent.

| Role | Can see | Can add | Can correct |
| --- | --- | --- | --- |
| Caregiver | Whole record | Any entry | Any entry |
| Patient (the person the record is about; one per record) | Whole record | Any entry | Only their own |
| Contributor (for example a nurse) | Readings, medications, allergy history, their own uploads; contact details withheld | Readings, medications, documents | Only their own |
| Viewer | Whole record | Nothing | Nothing |

Only the admin can remove entries, edit profile details, contacts and monitoring settings, change roles, or remove people. Members can leave at any time.

**For MJ's clinical review:** a contributor sees allergy history and current medications so that someone logging medications is not blind to allergies. Conditions, surgeries, admissions, vaccines and other people's documents are withheld from that role. Confirm this split is right for a nurse.

## How it works

- `supabase/migrations/20261106120000_care_team.sql` adds `vessel_care_access` (RLS on, no policies, no direct grants) and checked functions: `vessel_care_list`, `vessel_care_change`, `vessel_care_profiles`, `vessel_care_write`, `vessel_file_info`.
- A member's save sends **one entry at a time** with the version it was loaded with. The database refuses a write over a newer change (`40001`), stamps who added or corrected the entry (`addedBy`, `editedBy` — never taken from the request), and bumps the admin's account revision so the admin's stale snapshot is rejected and merged instead of overwriting the member's entry.
- A member's upload stays in the member's own storage folder and counts toward the member's allowance. A file is readable by whoever can read the record that references it. A member cannot attach a file they did not upload, and a former member's uploads stay readable by the admin.
- Every access change and member write is recorded in `vessel_audit` with the acting account and profile.
- App: `/api/care`, `app/care.ts`, `app/care-diff.ts`, `app/care-team.tsx` (Family → Care Teams). Shared profiles appear in the profile switcher marked "Shared with you". The app reloads when its tab becomes visible again so the admin sees entries made by others.

## Validation

- `tests/care-team.db.test.mjs` applies every migration to an in-process Postgres (PGlite) with stand-ins for Supabase's `auth` and `storage` schemas, then checks with six fictional accounts: owner-only invitations, pending invitations granting nothing, per-role visibility, server-side attribution, stale-save rejection, role limits on writes, attachment rules including the storage policy, role change, revoke, leave, signed-out denial and audit rows.
- `tests/care-diff.test.mjs` checks that only added or changed entries are sent and that removals and profile edits are refused.
- TypeScript, lint, the full test suite and the Vercel build pass. In the local demo, onboarding and an own-profile save were rechecked in a browser at phone width.

## Live database, 6 November 2026

- Applied through the dashboard SQL Editor. The editor contents were checked against the repository file by SHA-256 before running; Supabase reported success.
- Confirmed afterwards: `vessel_care_access` has RLS on, no policies and no grants to `anon`/`authenticated`; the audit table has `actor` and `profile_id`; all twelve functions exist; `anon` can execute none of them; storage has `care_file_read` beside the two existing policies; existing rows were unchanged (1 account, 1 profile, 0 entries).
- `tests/sql/care-team-live.sql` ran on the live database and ended with `CARE CHECKS PASSED: 21 of 21`. It is one statement that always raises at the end, so its fictional accounts and rows roll back; a follow-up count confirmed no test users, access rows or audit rows remained.
- Not done: the migration is not recorded in `supabase_migrations.schema_migrations` (it was run by hand); the storage policy was not exercised with a real uploaded object; the security advisor page would not load in the session and still needs reading.

## Limits and what remains

- The live check runs inside the database with simulated sessions. Still needed: the same isolation checks through real signed-in sessions (two or more accounts, direct REST/RPC/Storage calls), and a read of the Supabase security advisor.
- The care-team screens need a real signed-in walkthrough; the local demo has no Supabase and cannot show them.
- A member with a valid session could call the write function directly and skip the app's field validation. The database still enforces role, ownership, size and attachment rules, but not field formats.
- A save that changes several entries is sent one entry at a time; a failure part-way leaves the earlier ones saved.
- The admin sees others' entries on reload or when returning to the tab, not live.
- The older four-field family overview is unchanged and separate.
