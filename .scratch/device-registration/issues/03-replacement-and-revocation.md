Type: grilling
Status: resolved
Blocked by:

## Question

What should happen when the active selling device is lost, replaced, shared, or no longer trusted?

Decide who may revoke it, whether a replacement can be enrolled while another device is active, how existing open shifts are handled, and what the user must do after revocation. Preserve historical sales and shifts. The current readiness rules explicitly leave device replacement and revocation unresolved.

## Answer

Decision: only the store owner can revoke or replace the active device. The owner must close any open shift before replacing the device. Then the owner can revoke the lost or untrusted device and enroll a replacement using the chosen owner-current-browser flow. Preserve all historical sales and shifts. The old device may not be able to receive remote revocation while disconnected; offline selling is not implemented, and this plan does not claim immediate remote control over an offline browser.

## Comments

- User selected: “Owner can replace; close open shift first.”
