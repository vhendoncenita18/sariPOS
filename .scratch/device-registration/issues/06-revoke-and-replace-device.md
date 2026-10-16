# 06: Revoke or replace the selling device

**What to build:** A store owner can revoke a lost or untrusted device, or replace it with a new operational device after closing any open shift that uses the current device. Historical sales and shifts remain available.

**Blocked by:** 05: Enroll the store's first selling device.

**Status:** ready-for-agent

- [ ] Only an owner with a permitted online session can revoke or replace the active device.
- [ ] Revocation fails with a clear error while an open shift references the device; the UI directs the owner to My session to close the shift first.
- [ ] Successful revocation sets `is_active = false` and `revoked_at` to the server time, and records an actor-attributed `device.revoked` audit event transactionally.
- [ ] Replacement after shift close revokes the previous device and registers the new device without allowing two active rows; preserve historical shifts and sales.
- [ ] The owner sees a confirmation before revocation/replacement and clear pending, success, and failure feedback; cashiers cannot see or invoke these controls.
- [ ] Registration/revocation writes remain inaccessible through direct `anon`/`authenticated` table mutations.
- [ ] Database behavior is covered for owner success, cashier/nonmember/anonymous denial, open-shift rejection, post-close replacement, concurrency, audit records, and history preservation; UI checks cover confirmation and errors.
- [ ] UI copy explains that a disconnected browser may not learn of revocation immediately and that device IDs are operational associations, not proof of physical possession.
