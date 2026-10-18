# Patient profile onboarding

First login opens a five-step profile setup: personal details, contact and emergency contact, medical history, medications, and review. Existing profiles also see setup once if they have no onboardingCompletedAt value.

Only the full name is required. Unknown information can remain blank. Allergy and medication status distinguish unknown from explicitly reported none. Medical entries remain patient/caregiver reported; setup does not verify or infer diagnoses.

Profile & settings opens the same editor. Contact email does not change authentication email. Emergency contacts receive no access or notifications. Existing records, vaccines, readings, and contacts are retained. Profile metadata uses the existing owner-scoped storage; no schema migration is needed.

The completion timestamp is written only after successful save. Unsaved edits stay in memory in the current tab and are cleared after saving. Closing or reloading discards them. Prescriptions, vaccine cards, and other documents can be uploaded through the existing record flows after setup.

Validation: production build, TypeScript, schema tests, and a browser walkthrough using an isolated fictional profile (no live patient writes).
