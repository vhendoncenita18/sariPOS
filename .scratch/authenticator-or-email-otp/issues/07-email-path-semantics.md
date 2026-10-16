Type: grilling
Status: resolved
Blocked by:

## Question

The requested “email/password, then choose TOTP or emailed code” cannot use Supabase's built-in email OTP as a native MFA factor. Which product behavior is intended?

1. **Separate sign-in paths (recommended):** Email/password + TOTP is the AAL2 path; passwordless email OTP is a separate AAL1 path. The email code does not follow the password prompt.
2. **Custom second step:** Keep email/password first, then require either TOTP or a custom server-bound email challenge. Add a trusted completion marker and enforce it for all app and database access, since Supabase's resulting session stays AAL1.
3. **Password-only fallback:** Email/password can enter at AAL1, with TOTP as optional step-up; email OTP is not offered.

The selected policy accepts AAL1 on protected routes. Clarify whether that means a standalone email OTP login is acceptable, or whether the second prompt must follow successful password verification.

## Answer

Use separate sign-in paths: email/password followed by TOTP for the AAL2 path, or passwordless email OTP as an independent AAL1 path. Do not prompt for password before email OTP, do not call email OTP a second factor, and do not grant access from password alone. Protected routes accept the email OTP AAL1 session or the TOTP AAL2 session. The AAL1 path is explicitly the lower-assurance route.

## Comments

- User selected: “Use separate paths: password + TOTP, or email OTP alone (AAL1).”
