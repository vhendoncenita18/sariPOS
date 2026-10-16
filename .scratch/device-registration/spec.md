Status: ready-for-agent

## Problem Statement

An owner and cashier cannot open a shift or use checkout because the store has no registered selling device, and SariPOS currently has no device enrollment controls.

## Solution

Add owner-only selling-device management to Store settings. The owner explicitly registers the currently used browser as the store's one operational selling-device record, then can revoke or replace it after closing any open shift. Enrollment and revocation run through trusted database functions. The device ID associates a shift and sale with the store's registered device; it does not prove which physical browser submitted a request.

## User Stories

1. As a store owner, I want to see whether the store has an active selling device, so I can understand why shift opening is unavailable.
2. As a store owner, I want to register the browser I am currently using with a clear device name, so the store can open its first shift.
3. As a store owner, I want enrollment to fail clearly when a device is already active, so I do not accidentally create a second active device.
4. As a store owner, I want registration to require my authenticated, permitted online session, so an unauthenticated or password-only session cannot authorize a device.
5. As a cashier, I want the active registered device to appear on My session, so I can open my shift without entering a device identifier.
6. As a cashier, I want checkout to use the active shift's registered device association, so sales attach to the expected shift.
7. As a store owner, I want to revoke a lost or untrusted device, so it cannot be selected for new shifts or sales.
8. As a store owner, I want to replace the device after closing its open shift, so shift reconciliation and device lifecycle remain consistent.
9. As a store owner, I want registration, revocation, and replacement recorded in the store audit log, so device changes are attributable.
10. As a cashier or owner, I want plain status and error messages when device access is unavailable, so I know whether to register a device, close a shift, or contact the owner.

## Implementation Decisions

- Keep the MVP to one active selling device per store. The hosted partial unique index `one_active_device_per_store` is the database backstop.
- The owner enrolls the browser currently being used through an explicit Store settings action. The owner membership and store scope are derived server-side; the client cannot choose `store_id` or write `store_devices` directly.
- Use trusted `SECURITY DEFINER` database operations with an empty `search_path`, schema-qualified objects, permitted-online-authentication checks, and owner checks. Expose execution only to `authenticated`; revoke execution from `anon` and `PUBLIC`.
- A registration operation validates and trims a nonblank device name. PostgreSQL generates the device UUID. New rows are active, have `revoked_at = NULL`, and leave `credential_public_key` NULL because its intended format and purpose are unverified and cryptographic proof is out of scope.
- A revocation operation is owner-only and marks the device inactive with `revoked_at` set. It refuses to revoke a device that still has an open shift. A replacement flow closes the shift first, revokes the previous device, then registers its replacement. Historical shifts and sales remain unchanged.
- Serialize lifecycle writes per store and rely on the unique active-device index so concurrent registration attempts cannot leave multiple active devices. Return a clear domain error when one is already active or an open shift must be closed first.
- Add `device.registered` and `device.revoked` audit events in the same database transaction as each change. Replacement records revocation and registration separately, with enough details to identify the device rows without storing secrets.
- Revoke direct table privileges on `store_devices` from `anon` and `authenticated`; grant authenticated `SELECT` only, retaining the existing member-read RLS policy. Trusted functions perform writes. The live SQL Editor output showed broad table grants even though the reported policies currently deny client writes.
- Replace the unavailable Selling devices card in owner-only Store settings with active-device status, device name, enrollment, revocation/replacement actions, confirmation, pending, success, and error feedback. Do not show management controls to cashiers.
- Keep the My session page's existing active-device query and shift-opening RPC. After registration, the active row appears there. Keep checkout online-only and use the existing `sync_sale` transaction contract.
- Treat the registered device ID as an operational association only. Authorization at checkout remains authenticated membership, `sales.create`, and an open shift matching the active device. Do not claim the ID, browser fingerprint, or current-browser enrollment proves physical possession or blocks another authorized browser.
- The main security test seam is trusted database RPC behavior, with focused UI checks for the settings flow and errors. Existing repository test files or a test harness were not found during planning; implementation should establish the database test approach before claiming authorization coverage.

## Testing Decisions

- Test external outcomes through the trusted registration/revocation functions using owner, cashier, unauthenticated, and insufficient-assurance identities.
- Registration succeeds for a permitted owner, derives the correct store, creates one active device, and writes an actor-attributed audit event.
- Cashier, other-store owner, anonymous caller, and password-only owner are denied. Caller-supplied store identifiers cannot cause cross-store writes.
- Repeated and concurrent registration cannot create a second active device. The second attempt returns a clear conflict while the existing row remains intact.
- Revocation succeeds for the owner only when no shift is open, sets inactive/revoked state, and writes an audit event. It fails while an open shift references the device. Replacement succeeds after the shift is closed and preserves history.
- Direct `anon` and `authenticated` insert/update/delete attempts on `store_devices` fail; authenticated member reads follow the existing RLS policy.
- UI checks cover owner visibility, empty and active states, successful registration, confirmation and failure feedback for revocation, open-shift blocking with a route to My session, and absence of controls for cashiers.
- Verify the existing shift page sees the newly registered active device and the existing checkout flow continues to use the matching active device and shift. Do not run a production test sale as part of these checks.

## Out of Scope

- Cryptographic device possession, WebAuthn, or using `credential_public_key` to sign or verify checkout requests.
- Offline PIN, offline queue, remote revocation of a disconnected browser, and a guarantee that offline activity stops immediately.
- More than one active selling device per store, multi-device concurrent selling, and store/device transfer between stores.
- Device inventory, hardware fingerprinting, browser fingerprinting, and a separate cashier-device assignment workflow.

## Further Notes

- The hosted `store_devices` contract was provided by the user: columns include `credential_public_key`; RLS is enabled and not forced; the only reported policy is authenticated member `SELECT`; the partial unique index limits active devices; no table triggers or registration/revocation RPCs were found.
- The provided hosted `sync_sale` definition is executable by `authenticated` and not `anon`. It checks device store/active/revoked state and an open shift for that device, but does not use `credential_public_key`.
- The database contract is based on user-supplied SQL output. Recheck the hosted schema, function grants, and policies when applying the implementation migration.
