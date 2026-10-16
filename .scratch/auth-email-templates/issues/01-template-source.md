Type: grilling
Status: resolved
Blocked by:

## Question

Where should the canonical OTP, signup-confirmation, and password-recovery email HTML live?

Supabase hosted projects accept template edits in the Dashboard. Supabase CLI/local configurations support versioned HTML files referenced by `supabase/config.toml`. Choose whether repo source is canonical and manually/API-applied to hosted Supabase, or whether the Dashboard remains canonical and the repo only documents copy. Keep SMTP credentials out of source either way.

## Answer

Keep email HTML and the Supabase template configuration in the repository as the canonical source. Apply the finished template content and settings to the hosted Supabase Dashboard. Do not put SMTP credentials in the repo; SMTP configuration stays in Supabase.

## Comments

- User selected: “Keep HTML in the repo and apply it to hosted Supabase.”
