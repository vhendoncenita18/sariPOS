Type: grilling
Status: resolved
Blocked by: 01

## Question

What should the forgot-password email and recovery screen do for password-based accounts?

Supabase's documented flow sends a recovery email with a redirect to a public request page and an authenticated password-update page. Choose a one-click confirmation link or numeric recovery code, then define the subject/body, callback path, password entry/confirmation UX, expired-link handling, and generic request feedback that does not reveal whether an address has an account.

## Answer

Use the Supabase **Reset password** template with a numeric `{{ .Token }}`. The user enters the recovery code in SariPOS, then sets and confirms a new password in the in-app reset form. Configure the recovery code expiry to match the planned 10-minute OTP lifetime. Tell recipients not to share the code and to ignore the email if they did not request a reset. The request screen must show the same generic confirmation whether or not the email belongs to an account.

## Comments

- User selected: “Use a numeric code then set a new password in SariPOS.”
