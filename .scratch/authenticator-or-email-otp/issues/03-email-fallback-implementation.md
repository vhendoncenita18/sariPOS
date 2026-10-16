Type: research
Status: resolved
Blocked by: 02

## Question

Given the selected first-factor flow, what supported Supabase/Next.js architecture can send and verify an email code as the accepted AAL1 fallback without claiming it is a Supabase MFA factor or allowing a forged client-side “verified” state?

Record session/cookie behavior, code issuance and expiry, resend/rate-limit handling, replay protection, and how to keep the weaker path distinct from TOTP's AAL2 result. Prefer a supported Supabase Auth API. If no suitable supported API exists, document the trusted server-side alternative and its operational/security costs before implementation.

## Answer

Research is captured in [email-fallback.md](../research/email-fallback.md). Supabase's built-in `signInWithOtp` + `verifyOtp` is passwordless sign-in and yields AAL1; it is not an email MFA factor, is not documented as bound to a prior password attempt, and does not promote an existing password session to AAL2. The API flow can therefore implement an independent email-code sign-in path, but cannot implement the user's requested “password, then choose email as a second factor” as a native Supabase MFA challenge. Enforcing a required post-password email step would need a custom trusted challenge/session gate; because the resulting auth JWT remains AAL1, direct Data API/RLS access also needs a server-verifiable completion marker. Decide whether to change the product sequence before specifying that custom mechanism.
