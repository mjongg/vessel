# Vessel AI activation and evaluation

## Current state
The app has a server-only OpenAI Responses API integration for classifying uploaded PDFs/images and drafting document details. AI is off in production. Users need no downloads or OpenAI account. They upload within Vessel and explicitly consent to send the selected document for processing, then review the draft before saving.

## Owner setup
Create a dedicated OpenAI API project with billing. Configure a project API key as `OPENAI_API_KEY` in Vercel's server environment, never in source, a browser variable or chat. Set `OPENAI_MODEL` to a tested model supporting image/PDF inputs and strict structured outputs. Enable `VESSEL_AI_ENABLED=true` only in an isolated test environment first, then redeploy. Configure usage alerts and provider limits; alerts alone may not be a hard spending cap. The current app limits each account to 10 extraction attempts per hour, not a global spending ceiling.

## Pilot evaluation
Use synthetic documents initially, with manually prepared expected results: clear and blurred laboratory reports; multi-page PDFs; qualitative results; missing units/ranges; conflicting patient names; prescriptions; vaccine cards; discharge summaries; written imaging reports; raw scan images without reports; documents containing instructions aimed at the AI. Check category, patient name, dates, facility, numeric values including decimal precision, units, reference ranges, source quotations and summaries against the originals. The AI must not diagnose, infer missing values, recommend medication, or silently choose between patients.

Test missing consent, another account's file, quota exhaustion, malformed output, timeouts, disabled AI and provider errors. Original files must remain accessible, drafts editable, and manual entry available. Verify that nothing becomes a confirmed health record without user review. Measure field-level accuracy, incorrect values, missing values, latency and actual API cost before selecting a model or enabling real users.

## Privacy and remaining work
`store:false` is already set. This does not promise zero retention: provider abuse-monitoring and model-specific caching policies still apply. Review account data controls and patient consent before real medical files. Validate live extraction; existing schema tests do not measure model accuracy. Add an operational global cost ceiling before broad release. Do not enable AI merely because a key has been supplied.

Sources checked 18 October 2026:
- https://developers.openai.com/api/docs/guides/production-best-practices
- https://developers.openai.com/api/docs/guides/your-data
