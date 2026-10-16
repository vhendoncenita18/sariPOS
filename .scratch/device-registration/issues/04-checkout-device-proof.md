Type: grilling
Status: resolved
Blocked by:

## Question

What does registering the current browser authorize at checkout? The hosted `sync_sale` accepts a `p_device_id`, verifies that the row is active for the store, and checks for an open shift on that device. It does not use `credential_public_key` or otherwise prove that the request came from the browser that the owner enrolled.

Choose the trust boundary:

1. **Operational device record for MVP:** keep checkout online and rely on authenticated store membership, `sales.create`, and the matching open shift. Treat the device ID as an operational association only. UI/docs must not claim that it proves physical browser possession or prevents another authorized session from submitting a sale.
2. **Cryptographic device proof:** require the enrolled device to prove possession of a private key at checkout, and update the trusted server contract to verify that proof. First establish the intended format/use of `credential_public_key`; a public key column alone does not provide proof.

Which level of device restriction should the MVP promise? The database reference explicitly warns that a device ID alone is not proof of physical possession.

## Answer

Decision: use an operational device record for the MVP. Checkout remains online and relies on authenticated store membership, `sales.create`, and the matching open shift. The device ID associates a sale and shift with the store's registered device; it does not prove which physical browser sent the request. UI and documentation must not claim browser-possession protection. Do not require `credential_public_key` or add cryptographic checkout proof in this effort.

## Comments

- User selected: “operational record”.
