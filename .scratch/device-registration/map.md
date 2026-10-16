## Destination

Produce an implementation-ready specification for owner-controlled registration, activation, and revocation of SariPOS's MVP selling device, grounded in the hosted `store_devices` schema and security policies.

## Notes

- Follow `rules/database-reference.md`, `rules/requirements.md`, `rules/core-features.md`, `rules/end-to-end-workflow.md`, `rules/user-flow-and-database-policies.md`, `rules/missing-requirements-and-readiness.md`, `rules/tech-stack.md`, `rules/design-notes.md`, and `logs/activity-log.md`.
- Keep this effort in planning. Do not modify application code or database migrations until the decisions are resolved and the user asks to implement.
- The current MVP scope is one active selling device per store. The app has no device enrollment UI or trusted write path.
- A device ID or browser fingerprint alone does not prove physical possession. Never permit direct browser writes to `store_devices`.
- The hosted table definition, policies, constraints, grants, and any existing device RPCs are not confirmed. The repo reference and migrations are not proof of deployed state.
- The repo already uses local Markdown maps under `.scratch/`; use that convention for this wayfinder map.

## Decisions so far

- [Confirm the hosted device database contract](issues/01-hosted-device-contract.md): verified one-active-device-per-store, member-read-only RLS, broad SQL grants, no device triggers or enrollment RPC, and `sync_sale` device/shift checks without public-key proof.
- [Choose the enrollment authorization flow](issues/02-enrollment-authorization.md): the authenticated owner explicitly enrolls the current browser through a trusted server operation; no direct client table write or device-ID-as-proof.
- [Set device replacement and revocation behavior](issues/03-replacement-and-revocation.md): owner-only revocation/replacement; close any open shift first; preserve history and disclose offline revocation limits.
- [Decide whether checkout must prove device possession](issues/04-checkout-device-proof.md): MVP device ID is an operational association only; checkout authorization remains membership, `sales.create`, and matching open shift; no physical-browser proof claim.

## Not yet specified

- Implementation details for the owner-facing screens, trusted RPCs, audit events, and tests belong in the buildable spec. Browser-local identity and offline authorization remain separate future work.

## Out of scope

- Multi-device concurrent selling; the current MVP specifies one active selling device per store.
- Offline queue/PIN implementation and cryptographic device attestation. These require separate decisions and are not implied by a device row.

## Frontier

The decision map is clear. Buildable handoff: [device registration spec](spec.md).

## Implementation tickets

- [Enroll the store's first selling device](issues/05-initial-device-enrollment.md): ready for implementation; no blocker.
- [Revoke or replace the selling device](issues/06-revoke-and-replace-device.md): ready for implementation after the first-device enrollment ticket.

