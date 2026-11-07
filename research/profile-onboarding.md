# Patient profile onboarding

First login opens a five-step profile setup: personal details, contact and emergency contact, medical history, medications, and review. Existing profiles also see setup once if they have no onboardingCompletedAt value.

Only the full name is required. Unknown information can remain blank. Allergy and medication status distinguish unknown from explicitly reported none. Medical entries remain patient/caregiver reported; setup does not verify or infer diagnoses.

Profile & settings opens the same editor. Contact email does not change authentication email. Emergency contacts receive no access or notifications. Existing records, vaccines, readings, and contacts are retained. Profile metadata uses the existing owner-scoped storage; no schema migration is needed.

The completion timestamp is written only after successful save. Unsaved edits stay in memory in the current tab and are cleared after saving. Closing or reloading discards them. Prescriptions, vaccine cards, and other documents can be uploaded through the existing record flows after setup.

Validation: production build, TypeScript, schema tests, and a browser walkthrough using an isolated fictional profile (no live patient writes).

## Update, 7 November 2026
Every page has Save & continue, which saves to the account without finishing setup; Save & finish later (or Save & close when editing) ends early. History sections open with a one-tap "none" answer, and "none" stays distinct from unanswered. Lists open on a short set of common options, with the full list and a typed entry one step away. Options that cannot apply to the recorded sex are hidden; family history is never filtered. Medicine suggestions are reordered by conditions already entered; this never infers a condition or fills in a dose. Doses are an amount plus a unit, and a bare number cannot be saved.

The medicine schedule groups current medicines by the times someone entered (Morning, Noon, Evening, Bedtime, As needed). Times are never derived from the frequency text. Ticking doses off is not built: it needs its own dose log table so caregivers and nurses can record doses without editing the medicine entry.

For MJ's clinical review: all lists in `app/pick-lists.ts`, including women's health medicines, which option applies to which sex, and the condition-to-medicine suggestions.
