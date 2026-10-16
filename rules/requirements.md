# Business & Domain Requirements: SariPOS

## Product Scope

SariPOS is an offline-first, mobile-responsive point-of-sale and inventory system for sari-sari stores in the Philippines. The MVP supports one store and one active selling device per store. It covers checkout, product catalog, inventory movements, payments, shifts, sales history, synchronization, and store access. The detailed page scope and exclusions are in [core-features.md](./core-features.md).

For database-backed requirements, use [database-reference.md](./database-reference.md) as the shared schema/function reference and verify uncertain details against the live project. Products do not store an authoritative stock column; on-hand stock is derived from `inventory_movements`.

This is the target product behavior, not a claim that every workflow exists today. Current implementation gaps are called out in [tech-stack.md](./tech-stack.md).

## Roles and Store Access

- **Store owner:** The user who creates the store receives the `owner` role in a `public.user_store_members` membership linking their account to that store. The owner can access that store's authorized management features, subject to RLS, database grants, and trusted-operation checks.
- **Store roles:** Owners can assign verified existing accounts store-defined roles. Role permissions are checked by trusted operations; a navigation item or hidden control does not grant access. The built-in Cashier role is scoped to approved selling/session permissions and never grants product-cost access.
- Store membership's legacy `role` discriminator remains `cashier` for all non-owner assignments; `role_id` identifies the selected built-in or custom role. Do not store role display names in the constrained discriminator.
- **Cashier:** Uses checkout, product search, and personal shift/session views. Cannot change baseline costs or view gross profit.
- A cashier may read, record cash activity for, and close only a shift they opened. Store owners may manage and inspect all shifts. Database policies and trusted operations enforce this boundary; page visibility is not the authorization control.
- Every business record belongs to a store and must be authorized against the signed-in user's store membership.
- MVP scope is one store owner and one active selling device per store; do not build multi-store or simultaneous multi-device selling into this release.

## POS, Sales, and Discounts

- A sale contains at least one item with a positive quantity.
- `subtotal` is the sum of unit price × quantity before discounts.
- Each sale item stores its own `line_discount`; `line_total = unit_price × quantity − line_discount`.
- `discount_amount` is the combined item-level and overall sale discounts.
- `grand_total = subtotal − discount_amount`; the combined discount cannot exceed subtotal and grand total cannot be negative.
- Prices, discounts, quantities, payment, shift, device, membership, and stock are validated by trusted server/database code. Never trust browser totals as authoritative.
- Trusted validation rejects invalid numeric values, excessive precision, mismatched totals, and malformed payment fields. Currency precision/rounding and fractional item quantities remain explicit decisions to resolve before release.
- Refunds and voids are excluded from MVP; future workflows must be separately authorized and online-only.

## Offline Sales and Synchronization

- Persist eligible catalog data and offline sales in durable browser storage (IndexedDB); queued sales must survive reloads and temporary disconnection.
- Clearly distinguish pending, syncing, synchronized, retryable-error, and needs-resolution states. Retry safely when connectivity returns and show queue age, latest sync state, and an actionable failure reason to the owner.
- Each sale has a stable identifier. The trusted backend must enforce idempotency so retrying the same sale cannot duplicate it.
- Reuse the same sale ID and canonical payload on every retry. A timeout is an unknown outcome until safely resolved; never silently drop or rewrite a queued sale.
- Synchronization validates store membership, registered device, shift, products, payment, discounts, and authoritative stock, then atomically records the sale, sale items, payment, and inventory movements.
- Server stock is authoritative. A sale must fail synchronization if current stock is insufficient, even if the device's cached stock allowed it offline. Offline operation cannot guarantee stock has not changed remotely.
- Until durable queuing, idempotency, and server-side sync validation are implemented, do not represent the existing online checkout as offline-capable.

## Inventory and Stock Protection

- Inventory is an append-only movement ledger: opening stock, restocks, authorized adjustments, sale deductions, and later-supported returns/damaged-stock movements.
- Current stock is derived from movements per product; all records are store-scoped.
- Every stock-changing operation uses trusted code with consistent product locking and validation. No operation may reduce stock below zero.
- Product data includes name, optional SKU/barcode, selling price, optional cost price, and active status. The known database reference has no low-stock-threshold column; do not claim configured threshold alerts until the live schema supports them.
- Refunds/returns are not MVP workflows; do not imply their stock behavior is implemented.

## Payments

- MVP supports one payment method and one payment record per sale: cash, GCash, or Maya.
- Cash records amount tendered and change; tendered amount must cover the grand total.
- GCash and Maya are recorded payment methods, not direct wallet transactions. Offline references remain unverified until the owner independently confirms payment.
- Split payments and direct wallet API integrations are out of scope.

## Shifts and Cash Closing

- A shift belongs to the store and registered device; associate each sale with its active shift.
- Allow only one open shift per store under MVP assumptions.
- Opening a shift records its cash float, store, device, and opening user. Closing uses a blind-drop flow: an authorized shift operator submits counted cash before expected cash is revealed.
- Calculate and preserve expected cash and variance on the trusted server. Flag a non-zero variance but do not block closure for that reason alone. Variance is `counted_cash - expected_cash`.
- Expected cash is `opening_float + eligible cash sales - cash refunds - cash drops/withdrawals - cash expenses`. Eligible sales are completed, recorded cash payments, using `payments.amount` (net drawer amount after change); non-cash, void, and unpaid sales are excluded. A cash refund counts only when its refund method is explicitly recorded as cash.
- Record expenses with a payment method and record cash drops/withdrawals as auditable shift cash movements. Only cash-paid expenses reduce expected cash. Do not infer unknown legacy expense/refund methods; keep close unresolved until an owner classifies them.
- A closed shift is immutable through ordinary UI. Trusted close logic locks the shift row, prevents duplicate finalization, records actor and audit details, and serializes against sale synchronization.
- Shift history is store-scoped and shows completed reconciliation and cash-movement details. An incomplete legacy close must be labeled unresolved, not shown as zero.
- Shift closing currently requires an online trusted call. Do not present an offline close as finalized; offline queued closing remains unimplemented until durable local authorization and synchronization support is built.

## Authentication and Offline Unlock

- Sign-in begins with email and password. The UI then offers a verified TOTP authenticator challenge (AAL2) or an email OTP code (AAL1 fallback). Password-only sessions cannot access store operations. The email OTP is a separate Supabase sign-in method rather than a password-bound MFA factor; the UI asks for the password first, but an `amr=otp` session cannot prove that the password was entered.
- Sign-in must not create users. Signup creates an Auth identity in `auth.users`; the versioned profile trigger migration creates its `profiles` row. After email confirmation, require a fresh password sign-in and second-step verification before store setup. Existing email-OTP users can set a password through the numeric recovery-code flow. Store ownership and membership are written only through the trusted `public.create_store_for_current_user(...)` operation. Profile-trigger behavior is active only after its migration is applied and verified in the target database.
- On login, load only stores authorized by membership. Do not create a new store automatically on every login or trust a browser-submitted store ID as authorization.
- Protect store data through authenticated store membership, role checks, trusted operations, and RLS. Policies and trusted functions must accept either `aal=aal2` (password + TOTP) or an email OTP session (`amr` includes `otp`), and reject password-only `aal1` sessions. This intentionally allows OTP-only AAL1 access to match the chosen fallback; it cannot enforce that the user previously entered a password.
- Sign out clears the active session and account-specific in-memory state. Preserve queued sales, but bind them to their originating store/account and prevent another user from viewing or synchronizing them. Define how the original account resumes queued work.
- Offline PIN unlock is available only on a previously authorized device and does not replace online verification. Target a maximum 72-hour offline authorization window, then require online TOTP or email OTP sign-in. This is a practical bound, not tamper-proof protection.
- Remote device revocation cannot reach a disconnected device; offline access may continue until its local authorization expires. Accept this revocation delay explicitly before release.
- RLS policies and SQL grants both govern direct table access. RLS being enabled does not imply a user can write. Trusted `SECURITY DEFINER` functions must independently validate membership, inputs, and operation permissions.
- Browser-only expiry checks are not tamper-proof; an active device record alone does not prove physical device possession.
- Never expose the Supabase service-role key in browser code.

See [user-flow-and-database-policies.md](./user-flow-and-database-policies.md) for the account/store lifecycle and policy-verification checklist. Table/function claims in that document remain unverified until checked against the target database.

## Auditability and Data Integrity

- Preserve protected, traceable records of sensitive operations, including inventory adjustments and shift closing.
- A synchronized sale, its items, payment, and inventory movements either all commit or all roll back.
- Dashboard/reporting totals distinguish locally pending from server-confirmed sales whenever that changes interpretation. Never invent sales, trends, stock, or financial values.

Cross-cutting open requirements, security/recovery gaps, verification plans, and release decisions are tracked in [missing-requirements-and-readiness.md](./missing-requirements-and-readiness.md). Do not treat its proposed or unverified items as implemented behavior.
