# Vessel account emails

Prepared designs; not yet activated in Supabase. Enable a verified custom SMTP sender first, then paste the HTML and corresponding subject from subjects.json into Authentication → Emails. Keep link tracking disabled for authentication links. No medical content or recipient details are embedded in these templates.

Run `python3 scripts/build-email-templates.py` to regenerate all templates. `design/email-preview.html` is a nonfunctional sign-in example with a fictional code. The logo image is a public PNG; the text wordmark and every action remain readable when images are blocked.

## Mapping

| File | Supabase template |
| --- | --- |
| invite.html | Invite user |
| magic-link.html | Magic link or OTP |
| confirmation.html | Confirm sign up |
| email-change.html | Change email address |
| recovery.html | Reset password |
| reauthentication.html | Reauthentication |
| password-changed.html | Password changed |
| email-changed.html | Email address changed |
| phone-changed.html | Phone number changed |
| identity-linked.html | Sign-in method linked |
| identity-unlinked.html | Sign-in method removed |
| mfa-added.html | Verification method added |
| mfa-removed.html | Verification method removed |

Designing a template does not enable the corresponding app feature. Vessel currently uses invite-only email sign-in. Password reset, self-service email changes and MFA account settings need implemented return flows before enabling them. Do not change authentication settings merely to send these templates.

## Acceptance checks before activation

Send invitation and sign-in test messages to the owner's approved address. Check Gmail web/mobile and Apple Mail, light/dark appearance, disabled images, narrow screens, readable type, and large buttons. Check both the actual one-time link and code, expired links, repeated use and the same-browser requirement. Use real Supabase-generated placeholders; never replace ConfirmationURL with a hardcoded sign-in URL. Review notification emails without simulating security changes on a real account.

For production delivery, verify sender domain SPF/DKIM and DMARC, configure the SMTP credentials in Supabase only, and verify bounce handling and rate limits. Replace the image host if Vessel moves domains. No tracking pixels or external fonts are used.
