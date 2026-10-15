# Vessel: product review and competitive priorities

Reviewed 28 September 2026. Scope: local prototype, selected live browser flows, implementation, and competitors' official product documentation. Competitors were not tested through authenticated accounts. Advertised capability is not evidence of usability, accuracy, adoption, or security superiority. No application changes were made during this review.

## Verdict

Vessel has an approachable individual-first structure. It is a working prototype, not yet competitive with mature personal health record products. Its opportunity is to make scattered Philippine records useful during consultations and caregiver handovers. Uploads, family profiles, and visit summaries alone are not novel. No evidence currently supports “better in every aspect.”

Keep Home / Records / Family, prominent patient identity, reviewed-versus-unreviewed labels, confirmation before saving parsed entries, and explicit unknown information. Prove differentiation through reduced work and fewer errors.

## Competitive benchmarks

| Product | Verified advertised strength | Implication for Vessel |
| --- | --- | --- |
| Guava | Document imports, lab extraction, tracking, family managers, visit preparation | Closest direct benchmark; manual data entry is a major current gap. |
| MyChart | Linked participating organizations and temporary browser-based record access | Provider integration, provenance, and controlled sharing set a much higher bar than a downloadable summary. |
| mWell | Health ID includes labs, prescriptions, vaccines and automatically stored mWell consultation records | A Philippine record wallet already exists; local context alone is not differentiation. |
| NowServing | Online and in-person doctor discovery and booking | An established care-access workflow; build a useful portable history before duplicating a booking network. |

Sources: [Guava plans](https://guavahealth.com/plans), [Guava FAQ](https://guavahealth.com/faq), [MyChart sharing](https://www.mychart.org/l/en-us/features/share/), [mWell Health ID](https://www.mwell.com.ph/health-id), [NowServing](https://nowserving.ph/).

Guava lists free uploads, tracking, sharing and portal sync; Premium lists automatic lab import and family managers at US$8/month or US$78/year. Vessel must validate affordability against that baseline, rather than assume a cheaper subscription will win. Guava documents photo/scan extraction and curated printable visit summaries. Accuracy on Philippine documents remains untested in this review.

mWell announced its acquisition of KonsultaMD in February 2025; do not count them as independent corporate competitors. [Acquisition announcement](https://www.mwell.com.ph/articles/mwell-acquires-ayala-groups-konsultamd).

These sources do not establish that the competing businesses are failing. Adoption and retention require independent evidence. MyChart is not a universal US record system: the linked-organization feature depends on participation.

## Prioritized findings and acceptance criteria

### P0 — Reliable records before real patient use

1. **Draft loss:** closing a partially completed form dismisses it without warning; unmounting loses local form state. Reproduced with an unsaved fictional title. Preserve drafts by patient and form, warn before discarding, and expose recovery. Test close, Escape, reload, network loss and profile switching. Decide how device persistence is protected on shared phones.
2. **Saving visibility:** mobile CSS hides the footer span containing save status. Show persistent Saved / Saving / Unsaved / Offline states at all widths. A failed save must preserve all entered values.
3. **Correction and accountability:** readings lack edit/delete controls; document versions retain only part of the previous information. Add corrections with actor, time, reason and previous values. Do not silently overwrite history.
4. **Production ownership:** the demo begins with fictional profiles, with no complete create/edit-my-own-profile onboarding. Separate demonstration data from new accounts; test a new individual account with no family members.
5. **Actual sharing:** managed profiles currently live in one account. Implement separate caregiver identities, explicit adult consent, scoped view/edit rights, revocation, dependent authority and access history. Test unauthorized access and wrong-patient operations, including attachments.
6. **Storage integrity:** whole-account optimistic-concurrency saves protect against silent overwrites but require better conflict recovery. Uploading a file before the record is committed can leave an orphan after failure. Add recoverable conflicts, retry-safe upload/commit handling and cleanup. Strengthen server validation for dates, readings and ranges. Verify backup restoration, complete export and deletion before a patient pilot.

### P1 — Turn paper into a usable record

Current upload accepts one PDF/JPG/PNG/WebP up to 10 MB; extraction is not connected. Title and date require manual entry; the original downloads separately.

Build: photo/PDF upload → document and patient identification → extracted draft → review beside original → save. Include multipage scans, rotation, unknown/approximate dates, upload progress and retry. Preserve original text and source page for every extracted field. Never infer a missing dose, unit, date or reference range. Flag possible wrong-patient documents before committing. Handwriting and unreadable fields should be marked for manual review.

Measure patient identity, analyte, value, unit, date and reference-range accuracy separately on consented/deidentified representative PH reports. Include poor photographs and multiple laboratories. Define release thresholds with clinical reviewers and count missed/incorrect values, not only average accuracy. No automatic diagnosis or imaging interpretation is needed for document organization.

Support broad storage categories but advertise structured extraction only for validated formats. A CT report PDF and a full DICOM imaging study have different storage and viewing needs.

### P1 — A consultation summary clinicians can scan

Current summary places current medicines after several history sections, lists documents without their lab values, omits original attachments, and loses measurement time in the export. It downloads HTML with print-to-PDF rather than generating a ready PDF. Unconfirmed medicines need a visible reconciliation section.

Build a concise first page with identity, allergies/reactions, current medications and doses, major conditions, relevant procedures/admissions, and date/source of last review. Add visit reason/questions and chosen recent results. Put the longer history and selected source documents in an appendix. Keep uncertain information visibly uncertain. Let users preview exactly what will be shared; later add revocable expiring links with explicit access controls. Downloaded copies cannot be revoked.

Acceptance: clinicians can locate allergy status and medication dose without scrolling through unrelated history; unknowns remain visible; exported values/timestamps match source records; only the selected patient's chosen information is included.

### P1 — Comparisons that preserve meaning

Current cumulative lab table matches exact names and units. It lacks synonym mapping, specimens/methods and flexible report reference formats. A very wide date table is awkward on mobile.

Add test search, date filters, source links, controlled synonym mapping and explicit comparability checks. Preserve reported units/ranges; support qualitative results and one-sided ranges. Do not silently combine clinically different tests or convert units without validated rules. Use text plus symbols alongside color for flags. On mobile, show one selected test across dates with an optional table.

### P1 — Daily monitoring people can trust

Current graph plots only systolic BP, with evenly spaced points and no numeric axis; glucose and diastolic trends are absent. Date strings are lexically sorted, which can misorder mixed offsets. Entries cannot currently be corrected.

Add correct chronological timestamp sorting, both BP components, glucose context, metric/date filters, labeled axes and a readable table. Allow grouped readings from one observation session. Out-of-usual-range input should support deliberate confirmation rather than silently changing or automatically discarding a legitimate measurement. Verify device/timezone behavior and correction history.

### P1 — Easier first use and older-adult use

Keep the modern blue palette but prioritize readable content: compact mobile heading, visible-label primary actions, larger default supporting text, clear active patient and persistent save status. Offer simpler display during onboarding. Use three home actions: View my summary / Add a record / Log a reading. Keep monitoring on Home and within the person's record, with Family always available.

Test keyboard, screen reader, zoom, contrast and touch targets; the presence of a large-text toggle is not proof of accessibility. Add Filipino labels after terminology testing. Validate with older adults using their own phones, including those who prefer notebook entry. A voice/chat input should remain optional and require confirmation of patient, measurement and time.

### P2 — Caregiver continuity, history and vaccines

Add “Since your last visit” changes and a handover view with who recorded each item. Structure allergy substance/reaction and explicit unknown versus no-known status; link operations to admissions where appropriate. Medication reconciliation needs source, strength, actual dose, route/instructions, current status and last verification.

Vaccine entries and manually supplied calendar dates work, but there is no scheduling engine or appointment booking. An exported calendar event is not a guaranteed delivered reminder. Expand to validated reminder delivery and clinician-reviewed schedules later, including source documentation and adult vaccines.

### P2 — Offline and search

A downloaded summary works offline; the full app cannot reliably reopen/save offline, and unsaved forms are volatile. Start with protected, opt-in offline essentials plus a visible pending-sync queue and conflict recovery. Test reconnection, device loss and sign-out behavior.

Current search covers document metadata only. Add search across extracted report text, tests, medicines and history, with patient scope visible. A full timeline should connect a consultation/admission to its prescriptions, results and discharge papers.

## What to build next

1. Resolve draft loss, save feedback, onboarding and correction workflows. Establish production data/permission requirements in parallel.
2. Deliver upload-to-reviewed-record for a bounded set of common laboratory reports, prescriptions and discharge summaries.
3. Improve consultation summaries and cumulative results, then test them with clinicians.
4. Add genuine consent-based caregiver access and handovers.
5. Validate offline essentials, broader extraction, vaccine reminders and integrations in measured increments.

Avoid expanding into booking, insurance, billing and wellness features before the core record workflow demonstrates repeat use.

## How to demonstrate an advantage

Run equivalent fictional-record tasks against Vessel, Guava and relevant locally accessible services. Include the real alternatives: paper folders, phone photos and notebooks. Use older adults, individual patients, primary/rotating caregivers and clinicians; counterbalance product order and record assisted versus unassisted results.

Proposed targets, not achieved results:

- Find an allergy or medicine dose within 15 seconds.
- Save routine BP within 20 seconds once signed in.
- At least 90% unassisted completion of the core tasks after brief onboarding.
- Clinicians find key history within 60 seconds, with fewer clarification questions than the baseline.
- No wrong-patient saves, unauthorized access, silent lost drafts or silently altered critical fields in the release test suite.

Measure upload-to-verified-record time, field errors, corrections, low-connectivity failures, summary usefulness and support burden. Track return at the next consultation or monitoring period, rather than expecting every healthy user to open the app daily. Report sample size and uncertainty; a small usability pilot does not establish population-wide superiority.

The strongest positioning to test: **Your medical history, ready whenever care happens.** The individual record must be useful on its own; invited family support should make it more useful without requiring account sharing.
