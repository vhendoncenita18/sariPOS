Type: grilling
Status: resolved
Blocked by: 02

## Question

How should account creation work after choosing email/password as the first factor, and how should current passwordless-email-OTP users establish a password without losing their account, store membership, or queued-sale ownership?

Specify email verification, password setup/reset, existing users with or without a password, and any session revocation or reauthentication requirement during migration.

## Answer

New accounts use email/password signup. Existing email-OTP users retain email OTP sign-in and may set a password from Security settings; this adds the password path without replacing their email-based access. The password path only grants access after a TOTP factor is verified at AAL2. A password-only AAL1 session must not pass protected-route checks. Email OTP remains the separate AAL1 route. Detailed verification UX and password recovery are implementation follow-ups.

## Comments

- User selected: “New accounts use email/password; existing OTP users keep email OTP and can set a password in Security settings.”
