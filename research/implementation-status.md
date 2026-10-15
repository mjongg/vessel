# Vessel redesign and implementation status

29 September 2026

## Implemented

- Warm ivory, forest teal, peach and lavender visual system; editorial headings, custom CSS health-card illustration, responsive action cards and revised navigation styling.
- Mobile quick actions before the large visit banner; visible text on the Add button and persistent save status.
- In-memory drafts scoped by patient, form and record; reopen recovery, discard action, browser leave warning. Files remain in the open tab; no sensitive draft contents are written to localStorage.
- Three-way merge for independent concurrent changes; conflicting changes to the same field are rejected rather than overwritten.
- Reading corrections with reason and previous measurement/context; BP systolic and diastolic charts with time-scaled x-axis, measurement/unit/date filters, and readable entries.
- Lab comparison cards plus cumulative table, test search and date filters. Exact name/unit grouping retained deliberately; no unvalidated clinical equivalence or conversion.
- Profile creation and editing, including an individual profile. New server accounts start empty; existing fictional demo records are preserved.
- Search across saved documents, notes, entered lab values, medications and history.
- In-app PDF/image preview, optional unknown record date, file signature validation, lab validation before upload, uploaded-file reuse on retry.
- Complete document snapshots retained for subsequent edits; JSON download for an earlier version and current profile export.
- Visit reason/questions, selectable reports with values/ranges/flags, visible uncertain medications, precise reading times and HTML export with print/save-PDF. Original files are separate. Visit preparation is kept in memory while navigating this tab.
- Calendar event includes a one-day-before alarm request; delivery still depends on the calendar app.
- Server validation strengthened for real dates, numeric readings and reference ranges.

## Verified

- TypeScript checks and production build passed.
- Eight unit tests passed, including concurrent independent additions and rejected competing changes.
- Local API checks passed for authentication, saved-record round-trip, revision conflicts, malformed input, origin rejection, file round-trip and anonymous file denial.
- Desktop and 390px mobile browser checks; fixed SVG hydration mismatch.
- Live upload draft dismissal/reopen retained the entered title.
- Selected lab report visibly added its actual values and reference ranges to visit preview.
- Fictional reading correction saved successfully through the UI.

## Not complete / dependencies

The entire competitive backlog is not complete. No production-ready claim is made.

- OCR/AI document extraction is not connected. Requires a selected processing architecture, model/service configuration if hosted, evaluation reports and clinical review. Upload currently supports one PDF or image; batch scanning, crop/rotate, handwriting validation and DICOM remain outstanding.
- Separate caregiver accounts, consent grants, invitations, revocation, access audit and handover notifications remain unimplemented. Current profiles belong to a single signed-in account. Hosted identity in this starter depends on Sites/ChatGPT auth; an independent production identity system is not configured.
- Persistent encrypted offline records/drafts, background synchronization, conflict resolution UI and device recovery remain unimplemented. A downloaded summary works offline. In-tab drafts do not survive reload or closing the tab.
- Direct PDF generation, expiring share links, embedded selected source files, structured medication reconciliation, full event timeline, record deletion/restore, and broader emergency fields remain outstanding.
- Uploaded-file reuse reduces duplicate retries, but abandoned uploads still require lifecycle cleanup. File signature checks are not malware scanning.
- Complete backup/restore verification, real-patient privacy/security review and clinical usability validation are outstanding.
- Automatic vaccine scheduling, delivered notifications, voice recognition, Filipino localization and booking require separate implementation and validation.
- The app remains a local fictional-data prototype. No hosted deployment was performed.
