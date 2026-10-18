# Sharing files and vaccine documentation

## Receiving files
Install Vessel from an HTTPS deployment in a supported browser (not just a bookmark). On Android Chrome, open a supported file in another app, select Share, then Vessel. Choose a profile and review the existing upload form before confirming. One PDF, JPG, PNG or WebP, up to 4 MB, is accepted per share. Other formats and multiple files are rejected without saving.

Safari on iOS/iPadOS does not support the manifest share target. A native app with an iOS share extension is needed for that system integration. Use Files/Photos → save, then Vessel → Upload as the web fallback. Installation guidance is under Account, storage & privacy.

The share worker only intercepts its two share endpoints. It does not cache records, authentication responses, pages or API results. Pending files have opaque IDs and remain in this browser's Cache Storage until retrieved/deleted or purged on the next share/read after their ten-minute expiry. They are not encrypted by Vessel independently of the browser/device. Once opened, the pending cache copy is removed and the file remains in the tab's draft memory. Closing/reloading that tab loses the file. Authentication remains required to upload/save. This is not general offline support.

## Vaccination entries
Optional lot/batch number and one photo/PDF attachment. Existing cards can be replaced. Upload uses the existing authenticated file endpoint with format signatures and size checks. The form reviews the person, vaccine, date, lot number and attachment before confirmation. If saving metadata fails, its uploaded file ID is retained in the draft for retry. Cards are patient-supplied supporting documentation, not verified certificates. Downloaded doctor summaries include the lot number and indicate when a card is stored, without embedding the file.

## Validation and remaining device testing
Share-worker tests cover handoff, deletion, unsupported/empty/multiple files, expiry, and non-interception of normal app requests. Schema tests cover retained attachment fields, lot limits, and legacy entries. Type check and production build pass. Browser preview verified the vaccine attachment picker and lot field. Actual installation and native share-menu discovery still need a supported Android device and deployed HTTPS origin; this Mac preview cannot confirm OS integration.

Sources: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target and https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Share_data_between_apps
