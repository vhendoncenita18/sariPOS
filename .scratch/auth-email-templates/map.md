## Destination

Implement the approved content specification as version-controlled SariPOS authentication email templates and Supabase CLI configuration. Applying settings to hosted Supabase remains a separate deployment task.

## Notes

- Follow `rules/requirements.md`, `rules/tech-stack.md`, `rules/design-notes.md`, `rules/end-to-end-workflow.md`, `rules/user-flow-and-database-policies.md`, and `logs/activity-log.md`.
- The separate auth map at [authenticator-or-email-otp](../authenticator-or-email-otp/map.md) decides email OTP alone is an AAL1 sign-in path and email/password + TOTP is the AAL2 path. New accounts use email/password; existing OTP users may keep OTP and add a password.
- The user configured custom SMTP in hosted Supabase. SMTP credentials and provider settings stay in Supabase; do not copy secrets into repository source.
- Supabase hosted projects edit templates in the Dashboard. Supabase CLI/self-hosted projects use `supabase/config.toml` plus local HTML templates. The repository is canonical; hosted Dashboard changes will be applied from it.
- Current design notes call for simple, accessible, restrained SariPOS branding and no auth sidebar. Emails should be concise and readable on mobile and plain-text fallback should remain understandable.
- Research references: [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Password-based Auth](https://supabase.com/docs/guides/auth/passwords), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
- The approved source specification is recorded in issue 07; local template/config implementation is tracked in issue 08.

## Decisions so far

- User has configured custom SMTP and wants emails for OTP and forgot-password flows. Repository source is canonical; hosted Dashboard application is a separate task.
- [Choose where template source is maintained](issues/01-template-source.md): Repo HTML/config is canonical; apply its content to the hosted Supabase Dashboard. SMTP credentials stay in Supabase.
- [Define the OTP email users receive](issues/02-otp-email-copy.md): Subject “Your SariPOS sign-in code,” prominent `{{ .Token }}`, safety copy, and a 10-minute expiry matched by Supabase configuration.
- [Define signup confirmation content and redirect](issues/03-signup-confirmation.md): Use the Confirm signup template with numeric `{{ .Token }}` entered on the signup screen; keep it distinct from sign-in email.
- [Define the forgot-password email and recovery journey](issues/04-password-recovery-email.md): Use a numeric code from the Reset password template, enter it in SariPOS, then set and confirm a new password; keep request feedback generic.
- [Choose security notification emails](issues/05-security-notifications.md): Customize password-changed and TOTP-factor-added/removed notifications; enable their project-level settings and never include secrets.
- [Write the password and TOTP security-alert copy](issues/06-security-alert-copy.md): Each alert includes guidance to sign in and review Security settings if the change was unexpected, with a SariPOS link.
- [Specify complete email content and source layout](issues/07-email-content-and-source-layout.md): Approved six English templates, minimal HTML source files and `config.toml` mappings, 600-second email-code expiry, and hosted Dashboard application using existing custom SMTP.
- [Implement the approved email template sources](issues/08-implement-email-template-sources.md): Add six HTML sources and local `config.toml` mappings without changing hosted Supabase.

## Not yet specified

- None for the local source implementation. Applying settings to hosted Supabase remains pending.

## Out of scope

- SMTP provider credentials, delivery-domain setup, DNS records, and provider-side billing; the user already configured SMTP and these settings are external to repository source.
- Marketing emails or promotional content.
- Applying the approved settings to the hosted Supabase Dashboard; SMTP configuration remains hosted-only.

## Frontier

- [Implement the approved email template sources](issues/08-implement-email-template-sources.md)
Type: grilling
Status: open
Blocked by: 02, 03, 04, 06

- [Create versioned HTML templates and Supabase CLI configuration](issues/08-implement-email-template-sources.md): Add the six approved email sources and local Auth config; hosted Dashboard settings remain pending.
