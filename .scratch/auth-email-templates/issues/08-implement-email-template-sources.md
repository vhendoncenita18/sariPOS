Type: implementation
Status: resolved
Blocked by: 07

## Task

Implement the approved authentication email templates as local, version-controlled HTML sources and Supabase CLI configuration. Do not change hosted project settings or SMTP credentials.

## Answer

Added six HTML templates under `supabase/templates/auth/` and `supabase/config.toml` entries for their documented Auth sections. Config sets email OTP expiry to 600 seconds and enables password-changed, factor-enrolled, and factor-unenrolled notifications. No SMTP credentials were added. Hosted Supabase still needs the approved subjects, HTML, notification enablement, and expiry applied in its Dashboard.

## Verification

- `git diff --check` passed.
- Parsed `supabase/config.toml` using Python `tomllib` and confirmed all six template sections, file references, enabled notification flags, and the 600-second expiry.
- Confirmed templates only use the approved `{{ .Token }}`, `{{ .SiteURL }}`, and `{{ .FactorType }}` variables.

## Comments

- Copy and source layout approved by the user.