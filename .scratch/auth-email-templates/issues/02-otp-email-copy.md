Type: grilling
Status: resolved
Blocked by:

## Question

What should the user see in the email-code sign-in email: subject, brief explanation, numeric code presentation, expiry/resend guidance, and what to do if they did not request it?

Supabase supports `{{ .Token }}` for a numeric OTP and `{{ .Email }}` / `{{ .SiteURL }}` for contextual content. Decide brand voice and the amount of safety guidance; keep the message transactional and readable without images or CSS.

## Answer

Use subject **“Your SariPOS sign-in code”**. Show `{{ .Token }}` prominently, explain that the code is for signing in and expires after 10 minutes, tell recipients never to share it, and say they can ignore the email if they did not request it. Configure Supabase's email OTP expiry to 600 seconds so the stated lifetime matches token validity. Keep the HTML lightweight, with a plain readable code and no image dependency.

## Comments

- User selected: “Use it and set 10-minute OTP expiry.”
