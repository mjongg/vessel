# Vessel — CLAUDE.md

## Project
Vessel is a personal + family medical-records web app by MJ Ong (medical student): documents with lab values, medical history, medications, vaccinations, vital-sign readings, visit summaries, nearby-care lookup, and an opt-in AI upload assistant. One signed-in account manages up to 30 profiles. Across accounts there is only a consent-based shared family overview (name, relationship, document count, monitoring on/off — see `research/shared-family-overview.md`); scoped care-team access to one profile (caregiver / patient / contributor / viewer — see `research/care-team.md`) is built; its migration is applied to the live database and passed database-level checks there (2026-11-06), but the app code is not deployed and the screens are unverified with real sign-ins.

**Maturity (honest):** a working local prototype heading toward an invite-only family pilot — not production. README says "pre-release... Do not use as the only copy of medical records." Live email auth, Storage round-trips, backup/restore drill, and AI extraction are unverified in production (see `research/family-pilot-launch.md`, `research/implementation-status.md`). Default demo mode uses a mock identity; no real patient data is in the repo.

## Stack & commands
Next.js 16 / React 19 / TypeScript 5.9 (strict) / Tailwind v4 / shadcn (new-york, vendored) / zod / drizzle / recharts. Node >= 22.13. Two deployment targets share one `app/`:
- **Cloudflare/Vinext (original starter):** `npm run dev` → http://127.0.0.1:5173 (Vite + Miniflare, D1 sqlite via drizzle, R2, mock auth). `npm run build`, `npm start`. First-time local DB: apply `drizzle/0000_wet_lily_hollister.sql` once (README).
- **Vercel/Next + Supabase (pilot target):** `npm run dev:vercel` → http://localhost:3000, `npm run build:vercel`, `npm run start:vercel`. `vercel.json` uses these.
- `npm run typecheck` (tsc --noEmit) · `npm run lint` (eslint 9, next core-web-vitals + ts) · `npm test` (node:test, `tests/*.test.mjs`, runs with `--experimental-strip-types`; 70 tests, including `care-team.db.test.mjs`, which applies every migration to an in-process Postgres via PGlite) · `tests/sql/family-sharing.sql` (rolled-back check for a real database) · `npm run db:generate` (drizzle-kit).
- `python3 tests/api-check.py` and `tests/workflow-check.py`: integration checks against the running local demo only; never against a production account.
- Env names (from `.env.example`, server-only): `VESSEL_BACKEND`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VESSEL_AI_ENABLED`, `ANTHROPIC_API_KEY`, `VESSEL_APP_URL`. Never read or print a real `.env*` / `.dev.vars`.

## Architecture
- `app/` — Next App Router; `page.tsx` renders one client shell `health-app.tsx` (~43 KB). Feature modules sit flat beside it: `health-forms`, `family-dashboard`, `care-team` (+ `care.ts`, `care-diff.ts`), `profile-setup`/`profile-editor`, `upload-assistant`, `file-preview`, `phone-book`, `medication-schedule` (+ `doses.ts`, medicine tick-off), `storage-panel`, `drafts`, `share-setup`, `sign-in`, `vitals-form`, `remove-entry`, `fit-upload`, `privacy/`, `brand`, `vessel-logo`.
- `app/health-data.ts` — domain types + parsers (`categories`, `RecordItem`, `Medicine`, `HistoryItem`, `Reading`, `Vaccine`, `DoctorContact`). `app/health-schema.ts` — zod validation for the whole account state (`stateInput`). `app/extraction-schema.ts` — strict AI output schema. `app/merge-records.ts` — three-way merge; same-field conflicts are rejected, not overwritten.
- `app/api/` — route handlers: `session` (email OTP, refresh, logout), `auth/oauth` + `auth/callback` (PKCE), `health` (load/save snapshot with revision check), `care` (care-team invitations, roles, shared profiles, single-entry writes), `files`, `storage`, `doses` (tick-off, via `vessel_dose_list`/`vessel_dose_mark`), `extract` (AI on Claude `claude-opus-5-5`, off unless `VESSEL_AI_ENABLED=true` and `ANTHROPIC_API_KEY` are set). `app/share-target/route.ts` + `public/share-worker.js` for PWA share.
- `lib/server/` — `supabase.ts`, `supabase-records.ts`, `supabase-files.ts`, `oauth*.ts`, `request-body.ts`; `runtime.ts` (Node/Vercel) vs `runtime-cloudflare.ts` (aliased in `vite.config.ts`).
- **Data model:** whole-account JSON snapshot `{revision, state:{profiles[]}}`; each profile has `records|history|medicines|readings|vaccines`. Supabase normalizes it into `vessel_accounts/profiles/entries/files/audit/ai_usage` via SECURITY DEFINER RPCs (`vessel_load`, `vessel_save` with optimistic `revision`, `vessel_reserve/finish/cancel_file`, `vessel_use_ai`). RLS: `owner = auth.uid()` AND `is_pilot_member()`. Local D1 schema is just `health_states` + `health_files` (`db/schema.ts`).
- **Auth:** demo mode = mock ChatGPT headers (`app/chatgpt-auth.ts`, `build/sites-vite-plugin.ts`); Supabase mode = invite-only email code / Google / Apple with HttpOnly `vessel-access`/`vessel-refresh` cookies, same-origin checks, `pilot_members` allowlist. No service-role key anywhere.
- `components/ui/` — shadcn vendored verbatim (lint rules relaxed there; don't hand-edit). `research/` — product/launch docs. `design/` — review screenshots + logo SVG. `supabase/email-templates/` — branded auth emails.

## Design system
**Observed:** `app/globals.css` (148 dense lines) imports Tailwind v4 + `vendor/shadcn-tailwind-4.13.0.css`, then layers several `:root` overrides (blue → warm ivory/indigo → violet → "soft clinical"). Effective tokens: `--primary #252746`, `--vessel-purple #6852ac`, `--vessel-ink #24243b`, `--vessel-muted #595268`, `--border/--vessel-border #cbc4d8`, `--background #f6f5ef`, `--radius 1rem`. Fonts: body `'Avenir Next', Avenir, 'Segoe UI', sans-serif`; headings/vitals `Georgia, serif` (`.page-heading h1`, `.visit-banner h2`, `.vital-value strong`); `--font-sans` token still says Arial. Breakpoints used: 400/480/540/600/650/767/1000/1150px; reduced-motion honored; `.high-contrast` mode; 3px focus outlines; 48px min touch targets in forms.
**Owner standard (apply going forward):** editorial neutral palette; Instrument Serif (or similar serif) for headings; clinical clarity over decoration; mobile-first. When touching styles, consolidate toward one `:root` block rather than adding another override layer, and prefer tokens over hard-coded hex.

## Conventions observed
- Extremely dense code style: single-line functions, minimal whitespace, lines up to ~5 000 chars; `@/` path alias; named exports; `Response.json(..., {Cache-Control: no-store})` in every route.
- Validation at the boundary with zod; server rejects bad dates, numeric ranges, oversized bodies, cross-origin requests.
- Dates render in Philippine time (`tests/health.test.mjs`). Copy is plain, honest, non-promissory (e.g. "If this email has been invited...").
- Drafts live in memory only; nothing sensitive in localStorage. Every README/research doc lists limits explicitly — keep that habit.
- Commit messages: short imperative sentences ("Add guided patient profile onboarding and settings").

## Clinical data rule
Treat any patient-like data as sensitive. Never commit real records, exports, screenshots of real data, or `.env*`/`.dev.vars`. Use clearly synthetic fixtures (fictional names, impossible-to-match IDs) in tests and demos. Flag anything dosing-, diagnosis-, reference-range-, or medication-status-related for MJ's review before merging — the app deliberately never infers diagnoses, converts units, or changes medications automatically, and AI output is untrusted until a human confirms it. Preserve that.

## Definition of done
`npm run typecheck`, `npm run lint`, and `npm test` clean; for the touched target, `npm run build` or `npm run build:vercel` succeeds; the change is verified in a browser at 390px width (and desktop) with reduced-motion and keyboard order intact; README/research docs updated if limits or setup changed.
