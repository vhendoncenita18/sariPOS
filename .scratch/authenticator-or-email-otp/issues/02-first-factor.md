Type: grilling
Status: resolved
Blocked by:

## Question

What first factor should users complete before choosing an authenticator code or an emailed code?

The current app is passwordless email OTP, and a verified email OTP creates an AAL1 session. It cannot be used both as the first factor and as a distinct second factor. Account creation and existing-user migration must follow the selected flow.

## Answer

Use email and password as the first factor. After successful password sign-in, offer the user either their enrolled TOTP authenticator challenge or a code sent to their email. Email fallback is accepted as AAL1 under the resolved assurance policy; TOTP can elevate to AAL2. Account creation and existing-account migration remain to be specified.

## Comments

- User selected: “Email and password first, then choose TOTP or email code.”
- Superseded by [Choose independent email sign-in or custom second-step email challenge](07-email-path-semantics.md): the final flow is separate sign-in paths, because Supabase email OTP is not a native factor challenge bound to the password session.
