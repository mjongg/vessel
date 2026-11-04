# Family dashboard

The session API reads vessel_family_dashboard from authenticated app metadata. The admin value selects the detailed dashboard; all other accounts get the compact overview. This setting is presentation only and grants no additional data access. Email addresses and user IDs are not hard-coded into application code.

Both views use only the profiles already returned by the owner-scoped health API. Existing RLS, file ownership, and save authorization remain unchanged. There are no cross-account invitations or shared caregiver permissions in this release.

The detailed dashboard includes conditions, reported allergies, current medication entries, the latest recorded vital, saved vaccine follow-up dates, documents awaiting review, and shortcuts to each profile’s record, monitoring, and doctor summary. Dates are displayed without inferring an appointment or clinical urgency. Other accounts receive profile counts and their own profile cards.
