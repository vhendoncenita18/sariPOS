Type: grilling
Status: resolved
Blocked by: 05

## Question

For password-changed and TOTP-factor-added/removed notification emails, should copy only report the change, or also give a clear response if it was unexpected?

Recommended: subject names the exact event; body states the account change and says “If you didn't make this change, sign in to SariPOS and review your security settings.” Link to `{{ .SiteURL }}` if desired. For factor notifications, use Supabase's `{{ .FactorType }}`. Do not invent a support email or claim the user can reverse a change directly from the email.

## Answer

Include the action guidance in each alert: “If you didn't make this change, sign in to SariPOS and review your security settings.” Link the call to action to `{{ .SiteURL }}`. For verification-method alerts, name the factor using `{{ .FactorType }}`. Do not imply that an email link can undo a security change and do not add an unverified support address.

## Comments

- User selected: include the action guidance and a link to SariPOS.
