Type: research
Status: resolved
Blocked by: 04

## Question

Using official Supabase documentation and API behavior, determine whether an AAL1 email-OTP session can remove an inaccessible TOTP factor and enroll/verify a replacement. If it cannot, identify the documented recovery route and its assurance/session requirements. Document implications for factor limits, stale factors, session revocation, and user recovery UX.

## Answer

See [totp-recovery.md](../research/totp-recovery.md). An AAL1 email-OTP session cannot directly remove a verified TOTP factor. The user can enroll and verify a replacement from Security settings; verification raises the session to AAL2 and signs out the user's other sessions. They can then remove the lost factor. Up to 10 factors are supported. If replacement enrollment is impossible, privileged server-side admin factor deletion is a separate high-risk recovery path requiring strong identity checks and an audit trail. Recovery codes are not supported by the stable MFA API.
