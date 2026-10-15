# Vessel: clinical product brief and pilot plan

Research date: September 28, 2026. Product direction grounded in the founder’s clerkship/internship experience. Vessel is a working name, not a cleared trademark.

## Product principle

A person owns a usable medical history. Family and caregiver assistance is a first-class extension of that individual record. No family setup is required to receive the core value.

The primary outcome is a better prepared consultation: the patient and physician can locate the relevant history and original evidence without reconstructing everything from memory.

## What the clinical observations change

- **Medication reconciliation comes first.** Store exact medicine names, dose with unit, route/instructions, frequency, dates, current/past/unconfirmed status, and eventually a prescription or packaging source. Never infer hypertension or another diagnosis solely from a drug. Several conditions may share a treatment.
- **Unknown is explicit.** Unrecorded allergies do not mean “no known allergies.” Separate unknown, patient-reported, caregiver-reported, document-derived, and clinician-verified information. The current prototype uses patient/caregiver/document source labels and user-reviewed records; it does not claim clinician verification.
- **Caregiver continuity matters.** Separate patient identity from uploader identity. Future multi-account access must record who added or corrected information and allow revocation. The prototype contains managed profiles only; it does not simulate successful invitations.
- **History is chronological but consultation summaries are prioritized.** Lead with allergies and reactions, conditions, current medications, recent antibiotic exposure, surgeries, hospitalizations, and relevant family history. Keep the complete timeline accessible. Source documents remain authoritative evidence for review.
- **Vaccination is lifelong.** Include pediatric and adult records, product, dose/series, date, facility, source, and a clinician-advised follow-up date. Do not label someone fully immunized from incomplete uploads.
- **Surgery and hospitalization are distinct events.** Link them later rather than collapsing one into the other. The founder’s appendectomy and hospitalization examples are examples, not personal facts.

## Antibiotic history: three or six months?

There is no universal single look-back period for every encounter. IDSA’s current AMR guidance specifically considers antibiotic exposure during the preceding three months when selecting initial treatment, and prior organisms/susceptibilities in the preceding twelve months. This is a clinical context, not a reason to erase older courses or apply one rule to every disease.

Product choice: retain the full medication history. Default an antibiotic filter to three months, with six-month and all-time views. Keep courses of unknown date visible. Preserve exact dates, indication if known, and evidence; do not guess missing doses. Future clinical summaries should distinguish incomplete or overlapping courses.

Source: https://www.idsociety.org/practice-guideline/amr-guidance/

## Simple entry and chat

Two complementary paths:

1. Large visible actions: View records, Record something, Prepare for a visit.
2. A short sentence that stages a structured entry for confirmation.

“My BP is 120/70” can be parsed locally. General AI is not necessary for this narrowly defined sentence. The preview supports exact BP, temperature in Celsius, and glucose with an explicit unit. Unsupported or ambiguous sentences lead to manual fields. No inferred diagnosis, hidden change to another person, or automatic clinical advice.

Confirmation must show selected person, measurement, unit, actual observation time, and context. Never silently use the upload time as the date of an old result. Voice input is a later option; it needs microphone consent, a reliable transcription path, and confirmation of names, values, and units.

## Offline scope

Implemented: a self-contained downloadable visit summary that opens without Wi-Fi; loaded records remain usable while the page remains open; sentence parsing is local. Forms can remain open during a connection loss, with an explicit unsaved error.

Not implemented: offline reopening of the full app, device-encrypted record cache, durable offline queues, background synchronization, account switching while offline, or conflict resolution across caregiver devices.

Production design must distinguish saved on this device, waiting to sync, and saved to account; use an idempotent operation log, timestamps, conflict handling, and revocation policy. Encrypt and lock any local health cache. Account logout, shared phones, lost devices, and revoked caregiver access need explicit behavior. Do not cache authenticated health pages indiscriminately through a service worker.

## Document handling

The prototype stores PDFs and common image attachments plus manually entered metadata and lab values. It does not perform OCR or AI extraction. A later extractor must be tested on a consented, representative corpus of Philippine records, including multipage scans, poor photographs, mixed units, scanned handwriting, and negative/trace/categorical results.

Extracted drafts must preserve the original file, page/location, test name, specimen, collection time, reporting time, unit, reference interval, laboratory, and review status. Compare equivalent measurements only. Lab flags use the original applicable reference interval; a flag does not diagnose disease.

Actual CT/MRI image sets require DICOM-aware storage/viewing. Reading a written imaging report does not interpret the image. “All record types” means accepting and organizing documents; it is not a promise of validated extraction for every file format.

## Vaccination reminders and referrals

Use dates advised by a clinician first. Calendar exports remind the user and are not appointment confirmations. Automated scheduling later requires Philippine pediatric and adult schedules, explicit guideline versions, age/risk history, contraindication logic, clinician governance, and appropriate catch-up handling. Do not apply a US schedule blindly to Philippine users.

Sources:
- Philippine adult immunization CPG: https://pmc.ncbi.nlm.nih.gov/articles/PMC13316248/
- DOH National Immunization Program: https://doh.gov.ph/wp-content/uploads/2023/08/Booklet-4-Conducting-Immunization-Sessions.pdf
- CDC adult immunization standards (supports assessment workflow, not a Philippine schedule): https://cdc.gov/vaccines-adults/hcp/imz-standards/index.html

Referral/booking should initially link to verified partner contact or booking paths with an explicit user action. No fabricated doctor availability and no referral sent in the prototype. Clinical advice and commercial referral incentives should remain clearly separated.

## Privacy work before real patient use

This is a preliminary implementation plan, not a legal compliance certification. A private hosted prototype is not by itself ready for health-data processing in clinical service.

Confirm controller and processor roles, appoint the responsible privacy lead/DPO, conduct a privacy impact assessment, determine applicable NPC registration obligations, establish lawful bases and understandable notices, and review vendors/subprocessors and cross-border flows. For a barangay pilot, define the startup’s and clinic/LGU’s actual responsibilities in writing.

Required implementation work includes verified authentication, patient/caregiver authorization, dependent/guardian controls, minimum necessary access, encrypted transport/storage, account recovery, audit trails, backups and recovery testing, retention/deletion and export processes, incident response, and contracts governing any AI or document-processing provider. Consent must be specific to the use; joining a family must not silently open records. Do not present patient agreement as a substitute for all other lawful-processing and security duties.

Sources:
- Data Privacy Act: https://privacy.gov.ph/data-privacy-act/
- NPC DPO guidance: https://privacy.gov.ph/appointing-a-data-protection-officer/
- NPC privacy impact assessment and compliance pillars: https://privacy.gov.ph/5-pillars-of-compliance-2/
- NPC registration: https://privacy.gov.ph/pips-and-pics/register/

## Barangay pilot proposal

Start with one willing clinic and its authorized clinical/privacy contacts. This is a proposal, not an established partnership.

1. Observe staff and patient workflows using fictional records. Include older adults with low digital confidence and independent adults, not only tech-comfortable caregivers.
2. Test five tasks: find a medication dose, identify an allergy and reaction, retrieve an old report, enter a BP reading, and prepare a visit summary.
3. Resolve privacy/security and clinical governance requirements before enrollment with identifiable records. Maintain existing care/documentation pathways and make participation voluntary, without affecting eligibility for care.
4. Run a small, supported cohort (proposed: 20–30 consenting adults/households over 4–6 weeks). Train staff without adding hidden data-entry burdens. Establish support and incident contacts.
5. Measure task success without assistance, time to retrieve information, correction rates, wrong-person entry near misses, clinician usefulness, return at the next healthcare event, and staff effort. Predetermine pause criteria for access failures, data loss, or critical extraction errors.
6. Expand only after reviewing findings with the clinic and participants.

WHO supports needs-based implementation planning and staged monitoring/evaluation:
- https://www.who.int/publications/i/item/9789240010567
- https://www.who.int/publications-detail-redirect/9789241511766

## Current prototype boundary

Working: server-backed private demo profiles and records, file attachments, manual lab comparison, history and medicine editing, monitoring entries, controlled-format quick entry with confirmation, vaccine calendar export, offline-readable summary, simple home and display preferences.

Not delivered as production capabilities: OCR/AI extraction, independent family account sharing, clinician booking, automated vaccine schedule, encrypted offline app, clinical interoperability, full revision audit or production compliance. Use fictional records until those requirements are complete.
