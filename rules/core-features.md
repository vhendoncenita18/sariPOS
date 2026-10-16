# SariPOS Core Features and Page Scope

**Status:** MVP target specification. It defines intended scope; it does not certify that listed features are implemented. Use [database-reference.md](./database-reference.md) as the shared starting point for schema and function facts, then verify live SQL. See [requirements.md](./requirements.md) for business invariants, [end-to-end-workflow.md](./end-to-end-workflow.md) for user journeys, [user-flow-and-database-policies.md](./user-flow-and-database-policies.md) for access boundaries and SQL verification, [tech-stack.md](./tech-stack.md) for architecture and implementation gaps, and [missing-requirements-and-readiness.md](./missing-requirements-and-readiness.md) for cross-cutting release requirements.

## Product and MVP Boundaries

SariPOS is an offline-first POS for a Philippine sari-sari store. MVP assumes one store and one active selling device per store. Its main goals are fast checkout, safe offline capture and synchronization, accurate stock and payment records, shift cash accountability, and protected store data.

## Feature Scope

### POS and Sale

- Search/select products; edit quantities and remove cart lines.
- Show unit price, quantity, line total, subtotal, item and overall discounts, and grand total.
- Accept one payment method per sale: cash, GCash, or Maya. Cash requires tendered amount and calculated change.
- Show a receipt after checkout and offer browser/device printing when supported.
- Validate inputs and totals in trusted code. See discount equations and stock invariants in [requirements.md](./requirements.md).

### Offline Operation and Sync

- Cache eligible data in IndexedDB and persist queued sales across reloads.
- Show pending, synchronized, and failed sales; retry safely on reconnection and prevent duplicate commits with stable IDs and server-enforced idempotency.
- Validate store membership, device, shift, products, payment, discounts, and current stock at synchronization. A stale local stock view can cause a queued sale to fail; explain the outcome and do not silently rewrite it.
- Show connection and sync status to the owner. Offline wallet references remain unverified until owner review.

### Catalog, Inventory, and Sales Records

- Products: add/edit, search, details, active status, optional SKU/barcode and cost, and selling price. The known live schema has no product stock or low-stock-threshold column; stock is ledger-derived. Treat thresholds as future schema work unless verified otherwise.
- Inventory: opening stock, restock, authorized adjustment, sale deductions, movement history, derived stock from the movement ledger. Returns/damaged goods are later-supported workflows.
- Sales history/details: completed sale items, discounts, totals, payment, date, shift, receipt, and sync status. Refunds and voids are future workflows, not MVP.

### Payments, Shifts, and Audit

- One payment record per sale; cash stores tender/change. GCash and Maya are recorded methods, not integrated wallet transfers.
- Open a shift with a cash float, associate sales, and close via blind drop. Reveal expected cash only after counted cash is submitted; record and flag variance without blocking closure solely due to a non-zero variance.
- Expenses are conditional scope. Preserve protected records for sensitive actions, including stock adjustments and shift closing.

### Authentication and Device Security

- Sign in with email and password, then choose a verified TOTP authenticator code (AAL2) or email OTP fallback (AAL1). The email OTP is a separate Supabase sign-in path, not a password-bound MFA factor. Password-only sessions cannot access store operations; protected routes and trusted database operations also enforce membership and roles.
- Sign-in requests must not create accounts. Signup creates an email/password account and confirms the address with a numeric email code before a fresh sign-in. Offline PIN is limited to a previously authorized device and does not replace online verification.
- Target a maximum 72-hour offline authorization window. Browser-only expiry checks are not tamper-proof, and remote device revocation cannot reach an offline device before its local authorization expires.
- Clearly communicate that browser-only expiry checks and an active device record do not prove physical possession or provide tamper-proof protection.

## Proposed Page and Screen List

Exact routes must follow the existing App Router and database schema. Checkout/Payment can remain a POS step; it does not require its own URL.

| Page / screen | Purpose | Priority |
| --- | --- | --- |
| Sign in | Authenticate store user | Required |
| Second-step verification | Choose TOTP or email OTP, then verify the selected code | Required |
| Signup code verification | Confirm the email address before a new account can sign in | Required |
| Create Store / Setup | Initialize the first store through a trusted operation; link its creator in `user_store_members` with the `owner` role | Required for first-time owner |
| Offline unlock | Unlock a previously authorized device with offline PIN | Required for offline access |
| Dashboard (`/pos`) | Store-scoped sales and stock overview; clearly label unavailable shifts, connection, and sync data | Required |
| POS / New Sale | Search products, cart, discounts, checkout | Required |
| Checkout / Payment | Select one method; enter/validate payment details | Required; POS step preferred |
| Receipt | Show completed sale and print on demand | Required |
| Sales History (`/pos/sales`) | Browse completed sale records and available details; show sync status only when implemented | Required |
| Sale Details | Inspect items, discounts, payment, totals, receipt | Required |
| Products (`/pos/products`) | Browse and search the authorized store catalog; owner-only management controls follow trusted writes | Required |
| Add Product | Create catalog entry | Required |
| Edit Product | Update details and active status | Required |
| Inventory Overview (`/pos/inventory`) | View ledger-derived product stock; low-stock alerts require a verified threshold field | Required |
| Stock Movement History | Review opening, restock, sale, and adjustment movements | Required |
| Restock / Stock Adjustment | Record authorized stock changes safely | Required for inventory operations |
| Shift Overview (`/pos/session`) | View the user's active shift and activity | Required |
| Open Shift | Begin shift and set opening float | Required |
| Close Shift | Blind cash count, expected cash, and variance | Required |
| Shift History / Details | Review closed shifts and reconciliation | Required |
| Sync Status / Pending Sales | Review queued, synced, and failed sales | Required |
| Settings (`/pos/settings`) | Limited store/application preferences | Required, limited MVP scope |
| Device & Security | Review authorized device and supported controls | Required for planned device controls |
| Audit Log | Review protected, important actions | Recommended; access-controlled |
| Expenses | Record/review shift expenses | Conditional; only if committed to MVP |

Each implemented workspace navigation item opens its own route and page. The current route map is **Dashboard** (`/pos`), **Sales** (`/pos/sales`), **Inventory** (`/pos/inventory`), **Products** (`/pos/products`), **My session** (`/pos/session`, cashier), and **Store settings** (`/pos/settings`, owner). Planned routes without verified implementations must not be shown as working navigation links. Auth and offline-unlock screens stay outside the workspace shell.

## Dashboard Content

Prioritize store-scoped recorded sales and stock summaries with shortcuts to the separate Sales, Products, and Inventory pages. Show shift, connectivity, queued-sale, and last-sync details only when their respective data paths are implemented. Clearly separate pending local sales from server-confirmed totals.

## Explicit MVP Exclusions

- Multi-device concurrent selling; multiple stores under one owner.
- Utang/customer credit, suppliers, purchase orders, and split payments.
- Direct GCash/Maya wallet API integrations.
- Offline refunds/voids and automatic Bluetooth ESC/POS printing.
- Claims that browser-only offline authorization is tamper-proof.

## Suggested Delivery Order

1. Project foundation and environment validation.
2. Database migrations, store membership, RLS, and authorization.
3. Email/password signup and sign-in, second-step TOTP or email OTP, and authorized-device/offline-unlock model.
4. Products, inventory ledger, restock/adjustment, and no-negative-stock protection.
5. Shift opening, active shift, blind-drop closing, conditional expenses.
6. POS cart, discounts, payment validation, and receipt.
7. Trusted atomic sale commit with server stock checks and idempotency.
8. IndexedDB storage, durable sync queue, retries, and conflict reporting.
9. Accurate sales history, sync status, and role-aware dashboard.
10. Reliability/security testing for authorization, retries, stock, discounts, offline transitions, and cash reconciliation.

Do not test unfinished transaction logic against production sales.

## Core MVP Acceptance Criteria

- The store creator receives the `owner` role in `user_store_members`; owner access remains subject to store scoping, RLS, grants, and trusted-operation checks. Cashiers cannot access owner-only cost/profit data.
- Owners can create and edit products, deactivate/reactivate products without deleting history, record one initial opening-stock movement for a product with no stock history, restock products, open a shift on an active registered selling device, and assign a verified existing user a store role. These actions use trusted owner-only database operations. Apply the corresponding migrations before using the UI. Hosted `sync_sale` locks products and rejects inactive or cross-store products.
- Product and inventory workflows preserve non-negative stock.
- Valid sale records correct item/overall discounts and totals; insufficient stock and invalid discounts fail.
- A sale commit atomically produces one sale, its items, one payment, and matching inventory movements; retry produces no duplicate.
- Offline sales persist and synchronize after reconnection; failures are visible and safely retryable.
- Shift close preserves counted/expected cash and variance.
- Expected cash follows an agreed formula for opening float and net cash sales; cash expenses are included only if the expense workflow is committed.
- Service credentials never reach the browser; critical business operations have repeatable tests.

## Source of Truth and Change Control

This file is the MVP feature/page-scope specification, not an implementation report. Read [database-reference.md](./database-reference.md), then compare scope against repository code, migrations, and live schema before building each feature. Change scope only when a feature is explicitly added, removed, or deferred; keep schema changes in version-controlled migrations and secrets out of source control.
