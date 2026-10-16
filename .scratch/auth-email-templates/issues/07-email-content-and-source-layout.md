Type: grilling
Status: open
Blocked by: 02, 03, 04, 06

## Question

Turn the already-decided flows and safety requirements into an implementation-ready email-content/source specification. What exact subject and complete HTML/plain-text copy should each template use (sign-in OTP, signup confirmation, password recovery, password changed, verification method added, verification method removed), and how should the repo organize templates and Supabase CLI configuration so maintainers can apply the same source to hosted Supabase without storing SMTP secrets?

Keep code implementation and hosted-project changes out of this decision. Use only supported Supabase template variables; preserve the agreed 10-minute code lifetime and security-alert link guidance. The result should settle the content and file map needed before writing the actual template files.
