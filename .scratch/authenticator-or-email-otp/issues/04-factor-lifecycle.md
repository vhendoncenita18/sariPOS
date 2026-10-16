Type: grilling
Status: resolved
Blocked by: 02

## Question

Specify when TOTP enrollment is offered or required, how a user without an enrolled factor signs in through email fallback, and how factor disablement, lost authenticator recovery, and account recovery work without turning email fallback into an undisclosed stronger factor.

## Answer

TOTP is optional. Users enroll and manage it in Security settings; the password sign-in path is for users with an enrolled TOTP factor, while email OTP remains available as the AAL1 path. A user who loses their authenticator signs in with email OTP, enrolls and verifies a replacement, then removes the inaccessible old factor after the new factor raises the session to AAL2. Verification signs out other active sessions. See [TOTP recovery research](../research/totp-recovery.md).

## Comments

- User selected: “Make TOTP optional; enroll in Security settings; recover through email OTP and re-enroll.”
