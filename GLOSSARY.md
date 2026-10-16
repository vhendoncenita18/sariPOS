# SariPOS Domain

Terms for store operations, checkout, inventory, and offline synchronization.

Database names and contracts are maintained in [rules/database-reference.md](rules/database-reference.md); verify that working reference against live SQL before relying on uncertain details.

## Store Operations

**Store membership**:
The authorization relationship that grants a user specific access to one store.
_Avoid_: Account (when referring to store authorization)

**Store role**:
A store-scoped assignment on a membership, such as `owner` or `cashier`. A role's permitted actions come from `role_permissions` and trusted operation checks, not its display name alone.

**Shift**:
A bounded selling session for a store and its authorized selling device, with an opening float and a recorded close.
_Avoid_: Session (when referring to the business shift)

**Offline authorization window**:
The maximum time a previously authorized device may use local access after online authentication. Expiration does not guarantee tamper-proof enforcement or immediate revocation while disconnected.

**Blind drop**:
The shift-closing process where counted cash is submitted before the system reveals expected cash.

**Expected cash**:
The drawer balance calculated from opening float, eligible cash sales, cash refunds, cash drops or withdrawals, and cash-paid expenses.

**Cash reconciliation**:
The comparison of counted cash with expected cash at shift close. Variance is counted cash minus expected cash.

**Shift cash movement**:
An auditable removal of money from an open shift's drawer, such as a cash drop or withdrawal.

**Inventory movement**:
A recorded change to a product's stock, such as opening stock, restock, adjustment, or sale deduction. Current stock is the sum of its movements.
_Avoid_: Stock edit

## Sales and Synchronization

**Offline-pending sale**:
A sale durably stored on the authorized device that has not yet been confirmed by the server.
_Avoid_: Completed sale (unless clearly qualified as locally completed)

**Synchronized sale**:
A sale confirmed and committed by the server with its items, payment, and inventory movements.
_Avoid_: Synced (as a status label without explanation)

**Failed-to-sync sale**:
A queued sale the server rejected or could not commit; it requires visible explanation and safe retry or owner resolution.

**Idempotent synchronization**:
A retry of the same stable sale identifier returns the existing outcome instead of creating duplicate records.

**Last-known stock**:
The device's most recently synchronized stock quantity. It is advisory offline and may differ from authoritative server stock.
