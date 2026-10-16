# SariPOS — Missing Requirements, Security Gaps, and Implementation Readiness

**Project:** SariPOS  
**Purpose:** Record important requirements that are not fully specified in the existing core-features, end-to-end-workflow, and user-flow/database-policy documents.  
**Status:** Supplementary planning document — decisions and database behavior must be verified before implementation.

Use [database-reference.md](./database-reference.md) as the shared starting point for all schema-dependent work, then inspect the live database and repository migrations.

This document supplements [requirements.md](./requirements.md), [core-features.md](./core-features.md), [end-to-end-workflow.md](./end-to-end-workflow.md), [tech-stack.md](./tech-stack.md), and [user-flow-and-database-policies.md](./user-flow-and-database-policies.md). If a statement conflicts with an accepted requirement in those documents, follow the accepted requirement and update this readiness list rather than silently changing product policy.

> This document adds missing requirements; it does not claim that these features already exist. Items marked **Decision needed** require an explicit product or technical decision. Items marked **Verify** must be checked against the actual codebase or Supabase project.

---

## 1. Requirements Status and Source of Truth

Keep these categories separate:

- **Confirmed design choice:** explicitly established in the current SariPOS plan.
- **Proposed requirement:** recommended for a safer and more complete implementation, but not yet confirmed as implemented.
- **Verify:** inspect the current repository, Supabase schema, grants, policies, triggers, and function definitions.
- **Future scope:** intentionally excluded from the initial MVP unless the owner changes scope.

Do not treat a planned feature, a UI control, a Markdown document, or a local browser check as proof that the server enforces that behavior.

## 2. Architecture and Responsibilities

### Proposed application layers

1. **Presentation layer:** Next.js App Router pages and components. Displays state and collects user input; it is not a security boundary.
2. **Application/service layer:** typed functions for authentication, product operations, sales, shifts, and sync orchestration.
3. **Local persistence layer:** IndexedDB for the offline queue and explicitly selected cached data.
4. **Remote access layer:** Supabase Auth and narrowly scoped database calls.
5. **Trusted transaction layer:** PostgreSQL functions or server-side code that validates authorization and business rules before writes.
6. **Audit and diagnostics layer:** structured, privacy-conscious logs for failures and sensitive actions.

Keep database calls out of presentation components where practical. Do not duplicate authoritative pricing, discount, stock, or authorization rules in multiple places without tests to keep them consistent.

### Decision needed: where trusted functions are called

Document whether each operation is called directly through an authenticated Supabase RPC or through a Next.js server endpoint. Either way, validate the caller and arguments at the trusted boundary. Never put the Supabase service-role key in browser code or expose it through a `NEXT_PUBLIC_` environment variable.

## 3. Account, Store, and Role Lifecycle

The current MVP defines owner and cashier access and assumes one owner and one active selling device per store. The account, device, and store lifecycle still needs explicit failure and recovery rules.

- What happens if authentication signup succeeds but profile or store creation fails?
- Can a user retry store creation without creating duplicate stores or memberships?
- What should the user see if their account exists but has no store yet?
- How is a lost, replaced, or reinstalled device revoked?
- What happens if the owner changes their email or resets their password?
- Can an account be deleted, and what happens to legally or operationally important sales records?
- The current MVP defines owner, built-in cashier, and store-defined roles in `requirements.md` and the proposed role migration. Keep permission grants explicit; do not infer a broad manager role.
- Each trusted operation must check the role on the server/database, not only hide buttons in the UI.

**Verify:** the actual profile trigger, `create_store_for_current_user` function behavior, membership constraints, and device-registration/revocation flow.

## 4. Product and Inventory Operations

Product creation now uses the trusted owner RPC confirmed deployed by the user. The repository includes owner-only opening-stock and restock RPCs and Inventory forms; migrations `202610160003_record_opening_stock.sql` and `202610160004_record_restock.sql` must be applied to the hosted database. Both functions write an actor-attributed `store_audit_logs` event in the same transaction as the movement. The user-reported event constraint and member-read policy fit the operation; verify RLS force status and hosted function execution. Adjustment and damaged-stock mutations remain unavailable.

Product editing and reversible deactivation/reactivation are implemented locally through owner-only RPCs and catalog controls. Apply migration `202610160005_manage_products.sql` before use. The user-provided hosted `sync_sale` definition locks product rows and rejects inactive or cross-store products before writing sales. Permanent product deletion is unsupported so sales and inventory history remain intact.

Remaining operation contracts to define include:

- Record positive or negative adjustment with a required reason.
- Mark stock damaged or spoiled.
- View current stock and movement history.

### Required inventory invariants

- Current stock is derived from the movement ledger; do not maintain an independently editable stock value unless a carefully designed reconciliation mechanism is introduced.
- Opening stock is a single positive initial movement and is rejected when the product already has movement history. The operation locks the product row and verifies owner membership and permitted online authentication.
- Restock is a positive movement that may be recorded repeatedly for a same-store product. The owner-only operation locks the product row and writes an actor-attributed audit event atomically.
- A movement must reference the correct store and product.
- Stock-changing operations must use compatible locking so concurrent operations cannot oversell.
- Reject a movement that would make stock negative.
- Protect completed sale movements from direct editing or deletion.
- Record who performed an adjustment, when it occurred, and why.
- Validate quantities and prices as finite, correctly typed numeric values with allowed precision and range.
- Decide whether fractional quantities are allowed. **Decision needed.** If only whole units are sold, enforce integer quantities in the trusted operation and database constraints.

## 5. Offline Queue: Lifecycle, Recovery, and Conflicts

A durable queue needs a documented state machine, not just a `pending` flag.

### Suggested local states

- `pending`: stored locally and not yet submitted.
- `syncing`: a request is currently in progress.
- `synced`: server confirmed the sale.
- `retryable_error`: request failed for a temporary reason.
- `needs_resolution`: server rejected the sale or an unresolved business conflict exists.

Store the sale's stable ID, originating store/account context, payload version, creation time, attempt count, last attempt time, and last error category. Avoid storing access tokens or secrets in the queue.

### Sync rules

- Use the same sale ID and identical canonical payload for every retry.
- Never create a new sale ID just because a network request timed out.
- Treat a timeout as an unknown outcome until the server is queried or the idempotent request is retried.
- Use bounded exponential backoff with jitter for temporary failures; do not retry permanent validation errors forever.
- Make the queue resilient to a browser refresh, tab close, device restart, and app upgrade.
- Do not silently delete failed or pending sales.
- Prevent two tabs or service-worker tasks from processing the same queue entry concurrently, using a reliable local lock/lease strategy.
- Display a clear explanation and safe next action when the server rejects a sale due to insufficient stock, closed shift, revoked device, invalid price, or changed authorization.
- Do not silently alter a sale to make it pass validation. Any correction must be explicit and auditable.

### Conflict policy

Server stock is authoritative. If an offline sale cannot be accepted because current server stock is insufficient, do not record its inventory deduction as if it succeeded. Preserve the pending record for owner review and define whether it can be edited, cancelled locally, or resubmitted after a deliberate correction. **Decision needed:** exact recovery workflow for rejected offline sales.

### Idempotency hardening

The `sync_sale` function should be tested for:
- Same sale ID and same payload submitted repeatedly.
- Same sale ID with a different payload.
- Concurrent duplicate requests.
- A request that committed on the server but timed out before the client received the response.
- A previously recorded sale whose related payment, items, or inventory movements are unexpectedly missing or inconsistent.

A matching payload hash alone should not cause the function to report success if related records fail integrity checks. Keep the idempotency lock scoped to the store and sale, and verify all records belong to that sale/store.

## 6. Sale and Money Validation

The agreed discount formula is:

- `subtotal = SUM(unit_price × quantity)` before item-level discounts.
- `line_total = unit_price × quantity − line_discount`.
- `discount_amount = SUM(line_discount) + overall_discount`.
- `grand_total = subtotal − discount_amount`.

Before enabling checkout, test and enforce these cases on the trusted side:

- Negative, null, non-finite, or unreasonably large numeric inputs.
- Excessive decimal precision and currency rounding.
- Item discount greater than the item's gross line amount.
- Combined discounts greater than subtotal.
- Submitted subtotal or grand total that does not match recomputed values.
- Cash tender below grand total.
- Incorrect change amount.
- Non-cash payment carrying cash-only fields.
- Duplicate product or sale-item identifiers in a payload.
- Empty carts and zero-value sales, if those are not allowed.
- Inactive or cross-store products.
- Payment amount not equal to the validated grand total.

**Decision needed:** define the currency precision and rounding rule for PHP (for example, whether all stored monetary amounts must be rounded to two decimal places). Use one consistent rule in UI, local storage, trusted operations, and database constraints.

The server/database must calculate or independently verify totals from the submitted items; it must not blindly trust client-calculated totals.

## 7. Shift Cash Calculation and Expenses

The expected-cash formula and online close behavior are decided and implemented in local migration `202610160006_close_and_reconcile_shifts.sql` plus the `/pos/session` workflow. Expected cash is opening float + eligible recorded cash sales (`payments.amount`) − explicitly cash-paid refunds − cash drops/withdrawals − cash-paid expenses. Variance is counted cash minus expected cash. The server locks the shift and computes both totals; a mismatch does not prevent closure. Cash movements/expenses are recorded only against an open shift and are auditable/idempotent. Closed shifts are not reopened through ordinary UI.

Remaining readiness conditions:
- Apply migration `202610160006_close_and_reconcile_shifts.sql` to a test Supabase project, verify its constraints, RLS, function owner/search path, and grants, then run concurrency and cross-store authorization checks before hosted use.
- Classify any existing shift expense or refund with a null payment method from authoritative records before closing that shift. The close RPC rejects ambiguous historical rows rather than guessing.
- Offline close requests are not queued locally. The page requires an online trusted call, and does not show a locally calculated result as finalized. Add offline close only with durable, account-scoped local persistence and the approved 72-hour device authorization controls.
- History access uses store membership and store filters; verify the hosted policy and new RPC execution after applying the migration.

## 8. GCash and Maya Verification

An entered GCash/Maya method is only a payment record; it is not proof that money arrived.

- Show non-cash payment status clearly, such as `unverified` or `owner_confirmed`, if this status is implemented.
- Do not label an offline reference as verified automatically.
- Do not store wallet passwords, PINs, or OTPs.
- Define whether the owner manually confirms non-cash payments and whether that confirmation is auditable. **Decision needed.**
- Avoid describing the system as integrated with GCash or Maya unless an authorized, real integration has actually been built.

## 9. Authentication, Offline PIN, and Device Security

The offline PIN is a convenience unlock for a previously authorized device, not an independent server identity or MFA factor.

The currently selected online sign-in flow asks for email/password, then offers TOTP or email OTP. TOTP yields AAL2. Supabase email OTP establishes an independent AAL1 session and is not bound to the password step; accepting the `amr=otp` path can therefore permit OTP-only sign-in outside the UI. Preserve this documented trade-off unless the authentication model is explicitly changed.

Requirements to decide and test:
- Rate-limit PIN attempts and apply a cooldown.
- Never store the PIN in plaintext; use an appropriate salted password-hashing approach if the design supports local PIN verification.
- Define how the local verifier and cached authorization are protected and invalidated.
- Revoke local authorization after sign-out, account revocation, device replacement, or the offline authorization deadline according to the agreed policy.
- Do not let an offline PIN create a new account, register a new device, or grant access to another store.
- Clear in-memory account data and account-scoped caches on logout.
- Protect local pending sales from being shown to another account while preserving a safe path for the originating account to recover them.
- Explain the limitation: a browser-only application cannot provide the same tamper resistance as a managed native device.

**Decision needed:** confirm the planned 72-hour offline authorization duration, whether it is configurable, and exactly what event starts/resets it.

## 10. Data Privacy, Retention, and Recovery

The current documents do not define a full data-retention or recovery policy.

Define:
- What personal data is collected and why.
- Whether customer names, phone numbers, or other customer details are needed at all in the MVP. Avoid collecting them if not needed.
- How long audit logs and transaction records are retained.
- How the owner exports business records.
- How backups and restoration are handled for the hosted database.
- How a store owner recovers after losing the selling device.
- What happens to pending offline sales if browser storage is cleared, the device is lost, or the browser profile is removed.
- Which data can be deleted and which records must remain for operational/accountability reasons.
- How errors and diagnostics avoid logging passwords, tokens, full payment references, or unnecessary personal data.

**Important:** IndexedDB is not a backup system. The UI should warn the owner that unsynchronized sales can be lost if local browser storage or the device is lost. Provide a recovery plan before relying on offline sales for real business.

## 11. Error Handling and User Feedback

Every operation should have consistent outcomes rather than generic success/failure messages.

Recommended categories:
- `unauthenticated`
- `not_a_store_member`
- `device_not_authorized`
- `shift_not_open`
- `product_unavailable`
- `insufficient_stock`
- `invalid_sale_totals`
- `invalid_payment`
- `duplicate_request`
- `temporary_network_error`
- `server_validation_error`
- `unknown_outcome`

For each category define:
1. What the owner sees in plain language.
2. Whether retry is safe.
3. Whether the local record is preserved.
4. Whether the owner must take action.
5. What details are recorded for debugging without exposing secrets.

Do not show raw database errors or stack traces in the normal UI. Keep detailed diagnostics in developer logs with sensitive values redacted.

## 12. Testing Plan and Release Gates

Do not treat a successful SQL editor run or a page rendering as proof of end-to-end correctness.

### Database/security tests
- Anonymous user cannot read or mutate protected business data.
- User A cannot read or mutate User B's store data.
- A member cannot access another store by changing a UUID in a request.
- Direct client writes are denied wherever writes must go through trusted operations.
- Each trusted function checks authentication, membership, device, role where applicable, and business invariants.
- RLS policies and SQL grants are both tested.
- Constraints reject invalid values even if the UI is bypassed.

### Business logic tests
- Discount and rounding boundary cases.
- Cash tender and change.
- Stock opening, restock, sale deduction, and adjustment.
- No negative stock under concurrent sale attempts.
- Shift open/close and cash variance.
- Atomic rollback if any sale sub-operation fails.
- Idempotent duplicate and conflicting retries.

### Offline and browser tests
- Sell offline, refresh, reconnect, and sync.
- Network timeout after server commit.
- Browser/tab closes during sync.
- Duplicate queue workers.
- Sign out and sign in as another account.
- Revoke a device while it is offline, then reconnect.
- Local storage unavailable or full.
- App update while pending records exist.
- Clear browser storage and verify the owner receives an honest warning about recovery limitations.

### Release gate

Do not use real sales until critical access-control, no-negative-stock, payment-total, idempotency, atomicity, and offline-recovery tests pass.

## 13. Deployment and Environment Configuration

Before deployment, document:
- Development, test/staging, and production environments.
- Separate Supabase projects or clearly isolated test data for non-production testing.
- Required environment variables and which are public vs server-only.
- Database migration files and a repeatable migration process.
- How schema/function changes are reviewed and rolled back.
- HTTPS requirements for authentication and service-worker/PWA behavior.
- Backup, restore, and incident-response ownership.
- How to rotate exposed credentials and revoke sessions/devices.
- How to verify that production builds contain no service-role key or other secret.

Do not test destructive migrations or production sale flows against the live store. Use a test project and synthetic data.

## 14. Accessibility and Usability

For a store counter workflow, the POS must remain understandable and usable on the actual device.

- Design for the target screen size and touch input.
- Make primary actions easy to reach and buttons large enough to tap.
- Ensure keyboard navigation and visible focus states.
- Do not use color alone to distinguish pending, synced, failed, or low-stock states.
- Keep text contrast readable in bright store environments.
- Prevent accidental double checkout and provide clear progress feedback.
- Show the final total and payment method prominently before confirmation.
- Make offline status visible without blocking normal use.
- Confirm receipt and printing layouts on the intended printer/browser; printing is best-effort unless specific hardware support is verified.

## 15. Observability and Operational Support

Define a minimal way to diagnose issues without exposing sensitive data.

- Give each sync attempt a correlation/request ID.
- Record operation type, timestamp, outcome category, and retry count.
- Track pending queue age and repeated sync failures.
- Record security-sensitive actions such as device revocation, stock adjustment, and shift closing.
- Restrict audit-log reads and prevent ordinary clients from editing or deleting audit records.
- Decide how the owner can report a problem and provide a safe diagnostic summary.
- Do not log credentials, access tokens, PINs, or unnecessary payment/customer data.

## 16. Database Function and Policy Inventory

The repository includes `supabase/migrations/202610160001_owner_roles_and_operations.sql` with owner product creation, store role/permission management, inventory read aggregation, and shift opening. This is source code only: the migration is not confirmed applied, reviewed, or tested against the hosted database. Shift opening also depends on an active registered device. Keep these items open until a test project verifies positive, unauthorized, and cross-store cases.

Maintain a living inventory for every trusted operation. For each function, record:

| Field | What to document |
|---|---|
| Function name/signature | Exact PostgreSQL signature |
| Caller | `authenticated`, server endpoint, or another explicitly authorized role |
| Purpose | One business operation |
| Authorization | Authentication, membership, role, device, and shift checks |
| Reads/writes | Exact tables affected |
| Atomicity | Which changes commit or roll back together |
| Validation | Constraints and business checks |
| Idempotency | Whether retries are safe and how conflicts are handled |
| Grants | Exact `EXECUTE` grants and revoked roles |
| Tests | Positive, negative, cross-store, and retry tests |
| Status | Planned, implemented, reviewed, tested |

At minimum, this inventory should cover store creation, device registration/revocation, product writes, stock movements, shift opening/closing, shift expenses, sale synchronization, and audit events. Do not assume all these operations already have trusted functions.

## 17. Decisions to Resolve Before Calling the MVP Production-Ready

- [ ] Confirm monetary precision and rounding.
- [ ] Confirm whether fractional item quantities are allowed.
- [ ] Define rejected offline-sale recovery.
- [x] Define the expected-cash formula: opening float + eligible recorded cash sales − cash refunds − cash drops/withdrawals − cash-paid expenses.
- [ ] Define GCash/Maya manual verification behavior.
- [ ] Confirm offline authorization duration and PIN lockout behavior.
- [ ] Define device replacement and revocation.
- [ ] Define backup/export and lost-device recovery.
- [ ] Define data retention and deletion behavior.
- [ ] Verify the owner, built-in cashier, and custom-role permission matrix against deployed trusted functions; keep broad manager access out of scope unless explicitly approved.
- [ ] Confirm whether all required trusted write functions exist and are tested.
- [ ] Add automated database, business-logic, and offline-sync tests.
- [ ] Verify production secrets, migrations, and deployment settings.

## 18. Relationship to the Other SariPOS Documents

- **Core Features and Page List:** what the MVP should do and which screens it needs.
- **End-to-End Workflow:** how the main user journeys proceed.
- **User Flow and Database Policies:** how actions relate to tables, policies, and current Supabase verification tasks.
- **This document:** additional cross-cutting requirements, failure cases, security/recovery gaps, testing, deployment, and decisions needed before release. Current accepted decisions in the linked rule documents take precedence over stale proposals in the source attachment.

Use the linked product, workflow, database-policy, architecture, and business-requirement documents as planning references. The actual repository and live database definitions remain the source of truth for what is implemented.
