Type: grilling
Status: resolved
Blocked by: 01

## Question

For new email/password accounts, should signup confirmation use Supabase's confirmation link (`{{ .ConfirmationURL }}`) or a code-entry flow (`{{ .Token }}`), and what app callback should it return to?

Specify the subject/body, confirm action label, destination, and expired/invalid-link recovery. This is distinct from the passwordless OTP sign-in email.

## Answer

Use the Supabase **Confirm signup** template with a numeric `{{ .Token }}`. Show the code in the new account's signup screen and verify it there, rather than sending a clickable link. Keep the subject and body specific to account confirmation so the user can distinguish it from the sign-in OTP. Apply the same clear expiry, never-share, and ignore-if-unrequested guidance; configure the token lifetime to match the stated value. This is separate from the **Magic Link / OTP** template used for passwordless sign-in.

## Comments

- User selected: “Use a numeric code and enter it on the signup screen.”
