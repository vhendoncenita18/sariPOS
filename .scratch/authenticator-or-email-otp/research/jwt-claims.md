# Supabase JWT assurance and authentication method claims

## Documented claims

Supabase access tokens carry an `aal` string (`aal1` or `aal2`) and an optional `amr` array of `{ method, timestamp }` entries. Supabase defines `aal1` as conventional single-factor sign-in, including password and email OTP; `aal2` means an additional factor was verified. The `amr` entries are ordered newest first.

| Flow | Expected claims | Authorization meaning |
| --- | --- | --- |
| Email + password, no MFA | `aal: "aal1"`; `amr` includes `{ method: "password", ... }` | Reject for this product’s online operational access |
| Email OTP code | `aal: "aal1"`; `amr` includes `{ method: "otp", ... }` | Accept as the email-code path |
| Password then verified TOTP | `aal: "aal2"`; `amr` includes recent `{ method: "totp", ... }` and prior `{ method: "password", ... }` | Accept as the password + TOTP path |

Supabase documents OTP as any one-time-password sign-in (email code, SMS code, or magic link). The first-party MFA documentation shows the password + TOTP AMR shape and provides an RLS example requiring `aal2`. The exact paths above combine those documented claim definitions; validate emitted tokens against this project’s configured OTP flow before relying on them.

## Recommended allow condition

The desired rule is: allow every valid `aal2` session, or allow `aal1` only when its signed AMR contains `otp`. This rejects password-only `aal1`. In RLS, use a **restrictive** policy so an existing permissive policy cannot bypass this condition; include the condition in both `USING` and `WITH CHECK` for mutable tables.

```sql
-- Apply per table and command scope as appropriate.
create policy "allow email OTP or AAL2"
on public.some_table
as restrictive
for all
to authenticated
using (
  (select auth.jwt()->>'aal') = 'aal2'
  or (
    (select auth.jwt()->>'aal') = 'aal1'
    and coalesce((select auth.jwt()->'amr') @> '[{"method":"otp"}]'::jsonb, false)
  )
)
with check (
  (select auth.jwt()->>'aal') = 'aal2'
  or (
    (select auth.jwt()->>'aal') = 'aal1'
    and coalesce((select auth.jwt()->'amr') @> '[{"method":"otp"}]'::jsonb, false)
  )
);
```

For Next.js server or middleware checks, validate the Supabase token with `supabase.auth.getClaims()` (or use the session-aware server client and `getUser()` for identity), then apply the same rule to claims. Do not authorize by decoding an unverified JWT. Preserve independent user/store membership and role checks; this assurance condition is not an authorization substitute.

## Sources

- [Supabase JWT Claims Reference](https://supabase.com/docs/guides/auth/jwt-fields) — claim fields, `aal` values, AMR methods and shape.
- [Supabase Multi-Factor Authentication](https://supabase.com/docs/guides/auth/auth-mfa) — AAL meanings, restrictive RLS example, MFA AMR example and OTP method semantics.
- [Supabase TOTP MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp) — check `currentLevel` and `nextLevel` after conventional sign-in to decide whether to present MFA.
- [Supabase `verifyOtp` reference](https://supabase.com/docs/reference/javascript/auth-verifyotp) — email OTP verification API.
- [Supabase JWT guide](https://supabase.com/docs/guides/auth/jwts) — verify signatures using `supabase.auth.getClaims()` or a trusted JWT library.
