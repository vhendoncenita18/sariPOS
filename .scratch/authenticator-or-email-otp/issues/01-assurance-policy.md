Type: grilling
Status: resolved
Blocked by:

## Question

When a user can enter either an authenticator code or a code sent to Gmail, should SariPOS accept the email-code route as a lower-assurance fallback (AAL1), or must every online session satisfy AAL2?

Supabase Auth supports TOTP and phone as MFA factors. The app's passwordless email OTP establishes AAL1; verifying it after another first-factor sign-in does not use Supabase's MFA challenge/verify factor flow or produce an AAL2 session. Keeping AAL2 gates therefore conflicts with accepting email OTP as an equivalent alternate factor.

Decide among:

1. **Preserve AAL2:** Use enrolled TOTP as the second factor; do not allow email OTP as a bypass. Email remains available for account recovery only under a separate recovery policy.
2. **Allow either, accept AAL1 fallback:** Require TOTP for users who have it, but allow email OTP to continue at AAL1. Remove AAL2-only authorization assumptions and ensure user-facing copy describes the weaker fallback accurately.
3. **Keep email OTP as primary sign-in:** Continue current passwordless email OTP and make TOTP optional as a separate step-up factor. This is not “either code as equivalent MFA” and base sessions remain AAL1 unless TOTP succeeds.

## Context

The user wants an authenticator app and an email OTP to be alternate codes that can each let the user in. Previous user decision selected email OTP only and removing AAL2 gates. Current repo docs still specify that model.

## Answer

Decision: allow either path and accept that email-code sessions are AAL1; protected routes must accept AAL1 sessions. A successful TOTP challenge may produce an AAL2 session. The UI and documentation must not describe email OTP as equivalent-strength MFA or claim that it establishes AAL2. This supersedes the previous target of email OTP as the only sign-in method, but does not yet settle the first factor or exact factor-selection flow.

## Comments

- User selected: “Allow either: email fallback is AAL1; protected routes accept it.”
