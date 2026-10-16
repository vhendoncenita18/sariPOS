# Passwordless email OTP for SariPOS app sign-in

SariPOS uses Supabase passwordless email OTP as its only app sign-in method and does not require MFA/AAL2. OTP establishes AAL1 only. Operational routes require the signed `amr` claim to include `otp`; store membership, role authorization, trusted operations, and RLS remain mandatory. Because Supabase may still accept password sign-in for existing email identities outside the app UI, RLS policies and trusted functions must also require the OTP `amr` method and must not depend on AAL2.
