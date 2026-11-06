# Shared family overview

Admins create in-app invitations for existing, confirmed Vessel pilot accounts. Each invitation is bound to the verified account ID at creation, expires after seven days if unaccepted, and requires acceptance. No email is sent. Admins can revoke, recipients can decline or leave. Current and future managed profiles are included; this scope is stated before creating the invitation.

The overview projects only name, relationship to the managing account, document count, and monitoring on/off status. Profile IDs, birth dates, medical entries, files, contact details, and editing permissions are excluded. Existing owner-only record and storage access is unchanged. Shared snapshots are rechecked on every open; previously viewed or copied information cannot be recalled.

Implementation: owner/recipient-bound access rows with RLS enabled and direct table grants revoked. Public RPC wrappers use SECURITY INVOKER; private SECURITY DEFINER functions enforce authenticated pilot membership, explicit participant checks, pending expiry, and admin metadata for creation. The private functions are needed solely for the restricted cross-owner projection and the confirmed-user lookup. Each access change writes an audit event. No service-role key is used by the app.

Validation: tests/sql/family-sharing.sql uses three fictional accounts in a transaction that rolls back. It checks pending and expired invitation denial, outsider denial, admin-only creation, recipient acceptance, four-field projection, clinical-data exclusion, owner-only record isolation, revocation, and anonymous execution denial.

Supabase advisor review: the new access table intentionally has no policies and no direct grants; only checked RPCs can touch it. Existing public SECURITY DEFINER warnings and password-protection warning predate this change. References: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy and https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable . Sign-in currently uses email links/codes.

Repository-wide lint remains blocked by existing errors in unrelated components. The new sharing component and API pass targeted lint. Production build, TypeScript, existing automated tests, and database integration tests pass.
