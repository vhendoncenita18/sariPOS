## Destination

Produce an approved content and configuration specification for version-controlled SariPOS authentication email templates and user flows, ready for later implementation and configuration in hosted Supabase using the user's custom SMTP provider.

## Notes

- Follow `rules/requirements.md`, `rules/tech-stack.md`, `rules/design-notes.md`, `rules/end-to-end-workflow.md`, `rules/user-flow-and-database-policies.md`, and `logs/activity-log.md`.
- The separate auth map at [authenticator-or-email-otp](../authenticator-or-email-otp/map.md) decides email OTP alone is an AAL1 sign-in path and email/password + TOTP is the AAL2 path. New accounts use email/password; existing OTP users may keep OTP and add a password.
- The user configured custom SMTP in hosted Supabase. SMTP credentials and provider settings stay in Supabase; do not copy secrets into repository source.
- Supabase hosted projects edit templates in the Dashboard. Supabase CLI/self-hosted projects use `supabase/config.toml` plus local HTML templates. The repository is canonical; hosted Dashboard changes will be applied from it.
- Current design notes call for simple, accessible, restrained SariPOS branding and no auth sidebar. Emails should be concise and readable on mobile and plain-text fallback should remain understandable.
- Research references: [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Password-based Auth](https://supabase.com/docs/guides/auth/passwords), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
- No email HTML, subject lines, callback routes, or template configuration have been changed yet.

## Decisions so far

- User has configured custom SMTP and wants emails for OTP and forgot-password flows. Source ownership and code-based flows are decided; complete copy and repository layout remain open.
- [Choose where template source is maintained](issues/01-template-source.md): Repo HTML/config is canonical; apply its content to the hosted Supabase Dashboard. SMTP credentials stay in Supabase.
- [Define the OTP email users receive](issues/02-otp-email-copy.md): Subject “Your SariPOS sign-in code,” prominent `{{ .Token }}`, safety copy, and a 10-minute expiry matched by Supabase configuration.
- [Define signup confirmation content and redirect](issues/03-signup-confirmation.md): Use the Confirm signup template with numeric `{{ .Token }}` entered on the signup screen; keep it distinct from sign-in email.
- [Define the forgot-password email and recovery journey](issues/04-password-recovery-email.md): Use a numeric code from the Reset password template, enter it in SariPOS, then set and confirm a new password; keep request feedback generic.
- [Choose security notification emails](issues/05-security-notifications.md): Customize password-changed and TOTP-factor-added/removed notifications; enable their project-level settings and never include secrets.
- [Write the password and TOTP security-alert copy](issues/06-security-alert-copy.md): Each alert includes guidance to sign in and review Security settings if the change was unexpected, with a SariPOS link.

## Not yet specified

- Exact subjects and full copy for each email, plain-text variants, template file layout, and the matching Supabase configuration.

## Out of scope

- SMTP provider credentials, delivery-domain setup, DNS records, and provider-side billing; the user already configured SMTP and these settings are external to repository source.
- Marketing emails or promotional content.

## Frontier

- [Specify complete email content and source layout](issues/07-email-content-and-source-layout.md)
Type: grilling
Status: open
Blocked by: 02, 03, 04, 06
