Type: grilling
Status: resolved
Blocked by:

## Question

How should an owner authorize the store's one active selling device while preventing an arbitrary signed-in browser from registering itself?

Choose the intended owner journey and trust boundary. Possible directions include:

1. The owner signs in on the target selling device and approves enrollment there, with the server requiring a recent verified session and enforcing one active device per store.
2. The owner creates a short-lived, single-use enrollment code from an already trusted session; the target device redeems it, and the server consumes it atomically.

Clarify whether the owner can enroll only their current browser or authorize a separate cashier terminal. A device UUID, user-agent string, or browser fingerprint alone is not proof of possession or authorization. Keep authorization server-enforced and never grant direct client writes to `store_devices`.

## Answer

Decision: the owner enrolls the browser they are currently using. Enrollment is an explicit approval by the authenticated store owner on that browser; it is not a claim that a UUID, user-agent, or browser fingerprint proves device identity. A trusted server operation must derive the store from the owner's membership, require the app's permitted online-authentication session, and enforce the one-active-device-per-store rule. Do not accept a caller-supplied `store_id` or write directly from the browser to `store_devices`.

The hosted `credential_public_key` column's format and purpose remain unknown. This decision does not imply cryptographic proof on later checkout requests; that would require a separately designed and verified checkout contract.

## Comments

- User selected: “Owner enrolls this browser.”
