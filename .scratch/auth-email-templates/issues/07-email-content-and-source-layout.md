Type: grilling
Status: resolved
Blocked by: 02, 03, 04, 06

## Question

Turn the already-decided flows and safety requirements into an implementation-ready email-content/source specification. What exact subject and complete HTML/plain-text copy should each template use (sign-in OTP, signup confirmation, password recovery, password changed, verification method added, verification method removed), and how should the repo organize templates and Supabase CLI configuration so maintainers can apply the same source to hosted Supabase without storing SMTP secrets?

Keep code implementation and hosted-project changes out of this decision. Use only supported Supabase template variables; preserve the agreed 10-minute code lifetime and security-alert link guidance. The result should settle the content and file map needed before writing the actual template files.

## Answer

Approved language: English. Keep the messages brief, direct, non-personalized, and readable on mobile. Use semantic, minimal HTML without image or CSS dependencies. Supabase's documented configuration points to HTML `content_path` files and does not define a separate plain-text template field, so do not maintain duplicate `.txt` files. Keep the prose simple enough to remain understandable in text-first email clients.

### Authentication templates

| Supabase template | Subject | Body copy / supported variable |
|---|---|---|
| `auth.email.template.magic_link` | `Your SariPOS sign-in code` | Heading: `Your SariPOS sign-in code`. Body: `Use this code to sign in to SariPOS:`. Show `{{ .Token }}` prominently. Then: `This code expires in 10 minutes. Never share it with anyone. If you didn't request this code, you can ignore this email.` |
| `auth.email.template.confirmation` | `Confirm your SariPOS account` | Heading: `Confirm your SariPOS account`. Body: `Use this code to confirm your email address and finish creating your SariPOS account:`. Show `{{ .Token }}` prominently. Then: `This code expires in 10 minutes. Never share it with anyone. If you didn't request this code, you can ignore this email.` |
| `auth.email.template.recovery` | `Your SariPOS password reset code` | Heading: `Reset your SariPOS password`. Body: `Use this code to reset your SariPOS password:`. Show `{{ .Token }}` prominently. Then: `This code expires in 10 minutes. Enter it in SariPOS to choose a new password. Never share it with anyone. If you didn't request this reset, you can ignore this email.` |

### Security notification templates

All three notification types are enabled. Use the SariPOS name in the subject and heading; do not include credentials, OTPs, or recovery secrets.

| Supabase notification | Subject | Body copy / supported variable |
|---|---|---|
| `auth.email.notification.password_changed` | `Your SariPOS password was changed` | Heading: `Your SariPOS password was changed`. Body: `The password for your SariPOS account was recently changed. If you made this change, no further action is needed. If you didn't make it, visit SariPOS to reset your password and secure your account.` Link the final instruction to `{{ .SiteURL }}` with link text `Open SariPOS`. |
| `auth.email.notification.mfa_factor_enrolled` | `A verification method was added to your SariPOS account` | Heading: `A verification method was added`. Body: `The {{ .FactorType }} verification method was added to your SariPOS account. If you added it, no further action is needed. If you didn't, visit SariPOS and secure your account.` Link the final instruction to `{{ .SiteURL }}` with link text `Open SariPOS`. |
| `auth.email.notification.mfa_factor_unenrolled` | `A verification method was removed from your SariPOS account` | Heading: `A verification method was removed`. Body: `The {{ .FactorType }} verification method was removed from your SariPOS account. If you removed it, no further action is needed. If you didn't, visit SariPOS and secure your account.` Link the final instruction to `{{ .SiteURL }}` with link text `Open SariPOS`. |

### Source layout and configuration

Keep these six HTML sources under `supabase/templates/auth/`:

- `magic-link.html`
- `confirmation.html`
- `recovery.html`
- `password-changed-notification.html`
- `mfa-factor-enrolled-notification.html`
- `mfa-factor-unenrolled-notification.html`

Add corresponding `content_path` and `subject` entries in `supabase/config.toml` under `[auth.email.template.magic_link]`, `[auth.email.template.confirmation]`, `[auth.email.template.recovery]`, `[auth.email.notification.password_changed]`, `[auth.email.notification.mfa_factor_enrolled]`, and `[auth.email.notification.mfa_factor_unenrolled]`. Set `enabled = true` for each of the three notification sections.

Set email OTP expiry to 600 seconds (`auth.email.otp_expiry = 600` for local Supabase; **Email OTP expiration = 600 seconds** in hosted Auth settings). Supabase uses that email-code expiry for OTPs and other email confirmation/recovery links. The 10-minute copy is valid only when the deployed setting matches.

For hosted Supabase, copy the subjects and HTML into **Authentication → Email Templates**, enable the three corresponding security notifications, and retain the user's configured Google custom SMTP settings in Supabase. Do not put SMTP credentials in `config.toml` or template files. Invite, email-change, and reauthentication templates remain on their existing/default configuration because they are outside this approved set.

Supabase references: [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Customizing email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates), [CLI config: `auth.email.otp_expiry`](https://supabase.com/docs/guides/local-development/cli/config).

## Comments

- User approved English-only copy and the proposed six-template source layout.
