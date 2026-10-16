# 05: Enroll the store's first selling device

**What to build:** A store owner can register the current selling browser as the store's operational device and then open a shift on it. The trusted path writes the device record and audit event; Store settings and My session show the resulting state.

**Blocked by:** None (can start immediately).

**Status:** owner enrollment/audit confirmed; cashier shift attribution fix added locally, hosted verification pending

- [x] An owner with a permitted online session can register a nonblank device name through a trusted server operation; store scope and actor come from the authenticated session.
- [x] Cashiers and nonmembers cannot register; the RPC requires permitted online authentication and callers cannot supply a `store_id`.
- [x] The operation creates one active row using the hosted schema, with a generated ID, `revoked_at = NULL`, and no assumed `credential_public_key` semantics.
- [x] An advisory transaction lock plus the existing unique index prevent a second active device; conflicts produce usable feedback.
- [x] The migration revokes direct table writes from `anon` and `authenticated`, grants authenticated SELECT only, and preserves the existing member-read RLS policy.
- [x] Registration writes an actor-attributed `device.registered` audit event in the same transaction.
- [x] Owner-only Store settings exposes the empty state, device-name entry, pending state, success state, and database-error feedback; cashier UI has no enrollment controls.
- [x] The active device appears in My session and can be selected for shift opening.
- [ ] Cashier-opened shifts are attributed to their opener and visible under the own-session policy. Hosted function inspection found the attribution missing; migration `202610160012_record_shift_opener.sql` fixes future opens.
- [ ] Security behavior is covered through the trusted database-operation test seam, with focused UI behavior checks. Do not claim physical browser possession or device attestation.

Local checks: ESLint and TypeScript pass. Hosted checks supplied by the user confirm the member-read policy, authenticated SELECT-only table grant, and `register_store_device(text)` EXECUTE for authenticated but not anon. The user confirmed Store settings enrollment and supplied the actor-attributed `device.registered` audit row for “Front Counter.” Hosted `open_store_shift` omitted `opened_by_user_id`, so migration 012 is required before cashier shifts can display correctly. The current open shift has a null opener; close it as owner using the actual drawer count after the migration, then open a fresh cashier shift. The repository has no configured test runner.
