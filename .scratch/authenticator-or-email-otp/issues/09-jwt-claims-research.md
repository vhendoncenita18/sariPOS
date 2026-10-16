Type: research
Status: resolved
Blocked by:

## Question

Using official Supabase docs and source, determine the signed JWT claim shapes for password-only AAL1, email-OTP AAL1, and password + verified TOTP AAL2 sessions. Recommend a server-verifiable allow condition for operational access that accepts email OTP AAL1 and TOTP AAL2 but rejects password-only AAL1; note how claims should be checked in Next.js and PostgreSQL RLS.

## Answer

See [jwt-claims.md](../research/jwt-claims.md). Recommended condition: accept signed `aal === 'aal2'`, or signed `aal === 'aal1'` with `amr` containing `{ method: 'otp' }`. This rejects password-only AAL1 and allows email OTP AAL1. Supabase documents `aal` and `amr` claim formats, but this exact app policy is a design inference; verify emitted tokens in the target project. Use verified claims server-side, and restrictive RLS policies with both `USING` and `WITH CHECK`; continue membership and role checks independently.
