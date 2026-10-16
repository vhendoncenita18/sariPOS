# Supabase TOTP recovery after losing an authenticator

## Finding

An AAL1 email-OTP session **cannot directly unenroll a verified TOTP factor** through the user's normal MFA API. Supabase requires the current session to be AAL2 to unenroll a verified factor. ([`mfa.unenroll()`](https://supabase.com/docs/reference/javascript/auth-mfa-unenroll))

The selected recovery flow can still work without bypassing that check:

1. User signs in with email OTP (AAL1).
2. From Security settings, enroll a replacement TOTP factor. Enrollment starts from an AAL1 session; the user scans the QR/secret and verifies a code.
3. Successful verification promotes the current session to AAL2 and logs out all the user's other active sessions.
4. With that AAL2 session, user unenrolls the inaccessible old factor. ([TOTP enrollment guide](https://supabase.com/docs/guides/auth/auth-mfa/totp), [`mfa.enroll()`](https://supabase.com/docs/reference/javascript/auth-mfa-enroll), [`mfa.unenroll()`](https://supabase.com/docs/reference/javascript/auth-mfa-unenroll))

Supabase allows up to 10 factors per user, so the replacement can be enrolled before removing the old one. Recovery codes are not supported in the stable MFA API; Supabase recommends registering another factor as a backup. ([MFA API limits and factors](https://supabase.com/docs/reference/javascript/auth-mfa))

## Product implications

- Keep TOTP optional and manage enrollment in Security settings, as selected.
- Email OTP alone remains a valid AAL1 sign-in under the chosen access policy. If the user only needs app access, they can continue on that path; the old factor remains enrolled until they replace and remove it.
- Explain that verifying a replacement signs out other sessions, so the user may need to sign in again on other devices.
- If the user cannot enroll/verify a replacement but still needs the old verified factor removed, the documented admin `deleteFactor` API can delete it; deleting a verified factor logs the user out of all active sessions. Treat this as a privileged account-recovery operation, only on a trusted server, with strong identity checks and an audit trail. ([Admin `deleteFactor`](https://supabase.com/docs/reference/javascript/auth-admin-deletefactor), [Admin API key guidance](https://supabase.com/docs/guides/auth/server-side))

## Assurance distinction

Email OTP is a conventional sign-in method at AAL1. Verifying a TOTP factor raises that session to AAL2. If operational routes accept either level, email-based recovery does not mean the user has completed MFA; authorization must continue to reflect the explicitly selected policy. ([AAL definitions](https://supabase.com/docs/reference/javascript/auth-mfa-getauthenticatorassurancelevel), [MFA enforcement guide](https://supabase.com/docs/guides/auth/auth-mfa))
