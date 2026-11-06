# Family dashboard

The session API reads vessel_family_dashboard from authenticated app metadata. The admin value selects the detailed dashboard; all other accounts get the compact overview. This setting selects the detailed view and permits creating overview invitations. It never grants access to another account’s medical records. Email addresses and user IDs are not hard-coded into application code.

Both views use only the profiles already returned by the owner-scoped health API. Existing RLS, file ownership, and save authorization remain unchanged. Shared overviews use separate, accepted invitations; see shared-family-overview.md.

The detailed dashboard includes conditions, reported allergies, current medication entries, the latest recorded vital, saved vaccine follow-up dates, documents awaiting review, and shortcuts to each profile’s record, monitoring, and doctor summary. Dates are displayed without inferring an appointment or clinical urgency. Other accounts receive profile counts and their own profile cards.
