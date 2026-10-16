## Destination

Define the authentication policy and implementation route for SariPOS sign-in when a user may continue with either an authenticator code or an email code, including the resulting assurance level and protected-route policy.

## Notes

- Follow `rules/requirements.md`, `rules/tech-stack.md`, `rules/end-to-end-workflow.md`, `rules/user-flow-and-database-policies.md`, `rules/design-notes.md`, and `logs/activity-log.md`.
- Existing app uses passwordless Supabase email OTP. Existing project rules explicitly classify that as AAL1 and remove AAL2 gates; the new target adds password + TOTP at AAL2 as a separate path.
- Supabase MFA documentation currently describes App Authenticator (TOTP) and Phone as supported MFA factors. Email sign-in OTP is a conventional AAL1 method, not an MFA factor.
- Keep this effort in planning until the sign-in semantics, factor lifecycle, and access enforcement are decided. Do not alter auth code or policy docs yet.

## Decisions so far

- [Choose assurance behavior for TOTP-or-email-code sign-in](issues/01-assurance-policy.md): Accept either path; email fallback is AAL1 and protected routes accept it. TOTP may establish AAL2.
- [Choose the first factor and sign-in sequence](issues/02-first-factor.md): Email/password was selected before research exposed the native-factor limitation; the later resolved path decision makes it TOTP-only, with email OTP as a separate AAL1 route.
- [Determine a secure email-code fallback implementation](issues/03-email-fallback-implementation.md): Supabase email OTP is an independent AAL1 sign-in, not a native second factor bound to the password session; a mandatory second step needs a custom gate and separate data-access enforcement.
- [Choose independent email sign-in or custom second-step email challenge](issues/07-email-path-semantics.md): Use separate paths: email/password + TOTP (AAL2) or passwordless email OTP (AAL1); password alone is not a valid path.
- [Specify enrollment and account recovery](issues/04-factor-lifecycle.md): TOTP is optional and managed in Security settings; lost-authenticator recovery uses email OTP, then TOTP re-enrollment.
- [Define signup and migration to password sign-in](issues/06-account-migration.md): New accounts use email/password; existing OTP users keep that path and may set a password in Security settings. Password sign-in requires TOTP to reach AAL2.
- [Verify Supabase TOTP replacement after email-OTP recovery](issues/08-totp-recovery-research.md): AAL1 users can enroll and verify a replacement; that raises the session to AAL2, after which the old factor can be removed.
- [Research signed JWT claims for OTP and TOTP assurance](issues/09-jwt-claims-research.md): Accept verified AAL2, or AAL1 only when signed `amr` includes `otp`; reject password-only AAL1. Validate this policy against project tokens and keep RLS restrictive.

## Not yet specified

- Target-project token validation and inventory of middleware, server guards, RLS policies, and trusted database functions that need this claim rule. Repository policy SQL is absent and external policy claims are unverified.

## Out of scope

- Phone MFA and paid SMS delivery, unless the destination is changed.

## Frontier

- [Plan application and database enforcement for AAL1/AAL2 sessions](issues/05-session-enforcement.md)
