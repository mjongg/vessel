# Vessel account and provider setup

## What is implemented

- `/sign-in`: email code flow and Google/Apple options. Social buttons enable only when the server can confirm the provider is enabled in Supabase and `VESSEL_APP_URL` is configured.
- `/api/auth/oauth`: same-origin POST starts a Google or Apple PKCE flow.
- `/api/auth/callback`: matches the browser-bound flow, exchanges the authorization code, verifies membership in `pilot_members`, then sets HttpOnly session cookies. Uninvited users do not receive a Vessel session.
- First-time users with an empty record complete a personal profile (name and optional birth date) before the dashboard. Family → Add managed profile creates a separate record within that account, not another person's login.
- `/brand`: three downloadable SVG wordmark studies. These do not replace the current app logo.

## Activation remains required

This checkout is still a local prototype. No real Google/Apple sign-in, live email delivery, deployment, or production onboarding has been verified. Mock tests exercise the redirect and invitation boundaries; they cannot establish that external provider configuration works.

1. Configure the server with `VESSEL_BACKEND=supabase`, the project URL and publishable key, and `VESSEL_APP_URL` set to the exact HTTPS website origin. Keep secrets in the hosting secret manager. There is no service-role key in the browser.
2. In Supabase Auth URL Configuration, set the Site URL. Allow the app callback URL with its flow query, e.g. `https://YOUR-DOMAIN/api/auth/callback?flow=*`. For local development add the equivalent `http://127.0.0.1:5173/api/auth/callback?flow=*`. Test the redirect allowlist and remove development URLs before the public launch.
3. Keep the invited-family policy. Create/confirm the intended user's Auth account through the dashboard, then add that actual user ID to `pilot_members` using the existing admin process. Do not use user-editable metadata for authorization. No invite emails were sent by this implementation.
4. Configure custom SMTP and the email OTP template before inviting family. The app expects a numeric `{{ .Token }}` code; a link-only default template is insufficient. Check delivery, expiry and rate limits. New free Supabase projects may require custom SMTP to customize templates.
5. Google: create a Google Cloud project and an OAuth Web application. Configure consent branding, test users while testing, and only the standard identity scopes. Register `https://xnqtagzzlujbwmffupmr.supabase.co/auth/v1/callback` as the provider redirect. Store the client ID and secret in Supabase's Google provider settings, then enable the provider. No Gmail-reading scope is requested.
6. Apple: an Apple Developer account, eligible App ID with Sign in with Apple, a Services ID, and signing key are required. Register the Supabase domain and the same provider callback URL. Put the Services ID first in the Apple Client IDs list; store the generated client secret in Supabase. Track the required six-month secret renewal. A private relay email is a different identifier: the corresponding actual Auth user must be invited. Never put the Apple signing key in this repo.
7. Test real invited Google, Apple, email and uninvited accounts; cancellation, expired callbacks, logout, refresh and two-account isolation; then profile creation, save/reload and file access in the actual deployment. Existing launch blockers in `family-pilot-launch.md` still apply.

## Sources checked 2026-10-15

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/social-login/auth-apple
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://github.com/supabase/auth/blob/master/openapi.yaml
- https://supabase.com/changelog.md (the upcoming TLS CBC retirement does not require changes to this modern HTTPS implementation)
