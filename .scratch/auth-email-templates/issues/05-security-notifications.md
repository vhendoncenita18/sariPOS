Type: grilling
Status: resolved
Blocked by: 01

## Question

Which Supabase security-notification emails should SariPOS customize (password changed, MFA factor added/removed, email changed), and what response/support guidance should they show?

These are separate from OTP, signup-confirmation, and reset emails. Keep notifications factual and avoid including codes, passwords, or recovery secrets.

## Answer

Customize the Supabase **Password changed**, **Verification method added**, and **Verification method removed** security notification templates. Enable the corresponding project-level security notifications. Keep each email factual; do not include a password, OTP, TOTP seed, or recovery secret. The exact alert copy is a follow-up decision.

## Comments

- User selected: “Customize password and TOTP security alerts too.”
