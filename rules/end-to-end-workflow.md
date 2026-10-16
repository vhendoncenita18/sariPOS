# SariPOS --- End-to-End User and System Workflow

**Project:** SariPOS\
**Document type:** Functional workflow specification\
**Status:** MVP planning document\
**Related document:** [Core features and pages](./core-features.md)

Use [database-reference.md](./database-reference.md) for the shared schema and trusted-function reference. Verify proposed migration changes against the target Supabase project before treating a workflow as deployed.

Store-setup, table-access, policy-verification, and logout/account-switching details are in [user-flow-and-database-policies.md](./user-flow-and-database-policies.md). Its reported Supabase policy facts are unverified until checked against live SQL.

Cross-cutting implementation gaps, recovery requirements, verification
steps, and release decisions are tracked in
[missing-requirements-and-readiness.md](./missing-requirements-and-readiness.md).

------------------------------------------------------------------------

## 1. Purpose

This document explains how a user moves through SariPOS from account
creation and store setup to daily selling, offline operation,
synchronization, inventory management, and shift closing. It describes
the intended workflow, not a claim that every stage is already
implemented.

## 2. Main Actors and System Components

### Actors

-   **Store owner:** Creates or initializes the account, manages the
    store, products, inventory, shifts, and sales.
-   **Cashier:** Uses an owner-authorized selling device for permitted
    checkout and personal shift/session views; cannot manage costs or
    see gross profit.
-   **Authorized selling device:** The owner's registered device used to
    operate the POS.
-   **SariPOS frontend:** The Next.js user interface running in the
    browser.
-   **Local storage:** IndexedDB stores eligible cached data and pending
    offline sales.
-   **Backend and database:** Authenticates and authorizes requests,
    validates business rules, and persistently records accepted
    transactions.
-   **Synchronization process:** Sends queued local sales to the trusted
    backend when connectivity returns.

### Important MVP boundary

The initial MVP assumes **one owner and one active selling device per
store**. An authorized cashier may use that device within the cashier
permissions in `requirements.md`. Multi-device selling, customer credit (utang), supplier
workflows, split payments, and offline refunds/voids are excluded.

------------------------------------------------------------------------

## 3. High-Level Workflow

``` mermaid
flowchart TD
    A[Open SariPOS] --> B{Has an account?}
    B -- No --> C[Create account]
    B -- Yes --> D[Sign in]
    C --> E[Create account with email and password]
    E --> F[Confirm signup email with code]
    F --> H[Enter email and password]
    D --> H[Enter email and password]
    H --> I{Password is valid?}
    I -- No --> J[Show sign-in error]
    I -- Yes --> K{Choose a verification method}
    K --> L[TOTP authenticator: AAL2]
    K --> M[Email OTP: AAL1 fallback]
    L --> N[Verify store membership and device authorization]
    M --> N
    J --> O{Previously authorized device and valid offline access?}
    O -- No --> P[Show sign-in or connection error]
    O -- Yes --> Q[Unlock with offline PIN]
    Q --> R[Load permitted local workspace]
    N --> S{Store membership exists?}
    S -- No --> T[Create store through trusted database function]
    S -- Yes --> U[Load permitted store data and active shift]
    T --> U
    R --> V[Dashboard / POS]
    U --> V
    V --> W[Manage products and inventory]
    V --> X[Open or continue shift]
    X --> Y[Create sale]
    Y --> Z[Validate cart, discounts, and payment]
    Z --> AA{Online?}
    AA -- Yes --> AB[Trusted backend/database validates and commits sale]
    AA -- No --> AC[Save sale locally and queue synchronization]
    AB --> AD[Show receipt and confirmation]
    AC --> AE[Show receipt with pending-sync status]
    AE --> AF{Connectivity restored?}
    AF -- No --> AE
    AF -- Yes --> AG[Submit queued sale]
    AG --> AH{Server validation passes?}
    AH -- No --> AI[Keep failed item visible for resolution]
    AH -- Yes --> AJ[Commit atomically; mark synchronized]
    AJ --> AK[Refresh server-confirmed data]
    AD --> AL[Continue selling or close shift]
    AK --> AL
    AI --> AL
```

------------------------------------------------------------------------

## 4. Account Creation and First-Time Setup

### Step 1 --- Open the application

The user opens SariPOS in a supported browser. If the app is installed
as a PWA, it should open the same application shell.

### Step 2 --- Create an account

The user enters an email address, password, and matching password
confirmation.

Supabase Auth creates the identity in `auth.users` and sends a signup
confirmation code. The frontend performs basic form validation, but
trusted authentication must be handled by the provider. The browser must
not be trusted to decide that an account is authenticated.

### Step 3 --- Verify the email code

Supabase emails a six-digit confirmation code. After verifying it, SariPOS
signs out the confirmation session and asks the user to sign in with the
new password, then complete TOTP or email OTP verification. Sign-in
requests do not create accounts. Supabase creates `auth.users`; a profile
may be added by a database trigger, which must be verified. Store
membership and role checks remain required before business data is
available.

### Step 4 --- Create or initialize the store

After sign-in, a user without a store membership completes the store
setup form with the store name. The current database function supplies
the `Asia/Manila` timezone by default.

The app calls `public.create_store_for_current_user(p_name)` and omits
`p_timezone` to use the database default. That trusted
function creates the row in `public.stores` and the owner membership in
`public.user_store_members` as one controlled operation. The browser must
not write those tables directly or assign ownership of an arbitrary
store. The argument names and timezone default are confirmed from the
target project; review the function body and authorization behavior
before relying on them.

### Step 5 --- Register and authorize the selling device

The owner registers the current counter from Store settings through the
trusted `public.register_store_device` RPC. It derives the store from owner
membership, requires permitted online authentication, writes an audit event,
and allows one active device per store. Apply local migration
`202610160011_register_store_device.sql` to the hosted database before use.
The device ID associates shifts and sales; it does not prove possession of a
physical browser. Revocation and replacement are handled separately.

The MVP allows one active selling device per store.

### Step 6 --- Initialize products and stock

The owner adds products, records opening stock, and manages catalog details
through the product and inventory workflows. Owners can edit product fields
and deactivate/reactivate products through trusted operations. Deactivation
preserves sale and inventory history. A product cannot be sold if inactive or
if stock is insufficient; the verified hosted `sync_sale` locks products and
checks both conditions before inserting the sale.

### Step 7 --- Open the first shift

The owner enters the opening cash float. SariPOS records the shift and
associates it with the authorized device.

### Step 8 --- Begin selling

The owner reaches the Dashboard and can start a sale.

------------------------------------------------------------------------

## 5. Returning User Sign-In Workflow

1.  The user opens SariPOS.
2.  The user enters email and password. Invalid credentials return a
    sign-in error and do not create an account.
3.  After password verification, the user chooses a TOTP authenticator
    challenge or an email OTP code.
4.  TOTP verification establishes AAL2. Email OTP establishes an
    independent AAL1 session; it is a lower-assurance fallback and is
    not cryptographically bound to the password step.
5.  The backend checks store membership and current device
    authorization.
6.  The app loads only data permitted for that store and role.
7.  The app determines whether a shift is open.
8.  The Dashboard displays verified data and the available operational
    state. Pending offline sales must remain distinct from server-confirmed
    sales.

If online sign-in fails, the app must not silently treat an arbitrary
locally cached account as authenticated. Offline unlock is permitted
only for a previously authorized device and valid offline authorization
state.

------------------------------------------------------------------------

## 6. Offline Unlock Workflow

Offline access is intended for a previously authorized device, not for
creating a new offline identity.

1.  The app detects that online authentication cannot be completed
    because connectivity is unavailable.
2.  It checks whether this device was previously authorized and has an
    eligible local offline authorization record.
3.  The user enters the offline PIN.
4.  The app validates the PIN using the designed secure local
    verification method.
5.  The app checks the configured offline authorization expiry.
6.  If checks pass, the app opens the locally available workspace and
    marks the app as offline.
7.  If checks fail or authorization has expired, the app requires online
    re-authentication.

**Security boundary:** Browser-only checks can be modified by a
sufficiently capable device user. The planned 72-hour offline
authorization limit is a practical control, not a tamper-proof
guarantee. The offline PIN does not replace online authentication. A device cannot learn of remote
revocation while disconnected, so the offline window is also a bounded
revocation delay that requires explicit acceptance before release.

------------------------------------------------------------------------

## 7. Daily Selling Workflow

### 7.1 Open or continue a shift

1.  The owner opens the Shift screen.
2.  If no shift is open, the owner selects **Open Shift**.
3.  The owner enters the opening cash float.
4.  The system records the shift against the store and authorized
    device.
5.  Sales are associated with that shift until it is closed.

The database must enforce the one-open-shift-per-store rule.

### 7.2 Build the cart

1.  The owner or authorized cashier opens **POS / New Sale**.
2.  The user searches for a product or selects it from the product
    list.
3.  The product is added to the cart.
4.  The user changes quantities or removes items as permitted by their
    role.
5.  The interface displays prices, quantities, line totals, subtotal,
    discounts, and grand total.
6.  The system checks the latest locally known stock for a useful
    immediate warning.

Local checks improve the experience but do not replace the authoritative
stock check at synchronization/commit time.

### 7.3 Apply discounts

1.  An authorized user can apply a discount to an individual item line
    when permitted by store policy and role.
2.  An authorized user can apply an additional overall sale discount
    when permitted by store policy and role.
3.  The system calculates the subtotal before item-level discounts.
4.  It totals the item-level discounts.
5.  It derives the overall discount from the combined discount amount.
6.  It ensures the combined discount does not exceed the subtotal.
7.  It calculates the grand total.

Formula:

-   `line_total = unit_price × quantity − line_discount`
-   `subtotal = sum(unit_price × quantity)`
-   `discount_amount = sum(line_discount) + overall_discount`
-   `grand_total = subtotal − discount_amount`

The backend/database must repeat critical validation; frontend
calculations alone are not authoritative.

### 7.4 Take payment

The MVP supports one payment method per sale:

-   **Cash:** Enter the amount tendered; calculate change and reject
    invalid amounts.
-   **GCash:** Record the amount and the reference information supported
    by the UI.
-   **Maya:** Record the amount and the reference information supported
    by the UI.

GCash and Maya records are not direct wallet API transactions. An
offline reference remains unverified until the owner independently
confirms the payment. A sale should not imply external payment
verification that did not happen.

### 7.5 Commit an online sale

When online:

1.  The frontend submits the sale to the trusted backend.
2.  The backend authenticates the caller and checks store membership.
3.  The transaction checks the registered device and open shift.
4.  It validates item IDs, product ownership, active product status,
    prices, quantities, discounts, payment, and totals.
5.  It locks product rows in a consistent order.
6.  It checks authoritative stock.
7.  It writes the sale, sale items, stock deductions, and payment
    atomically.
8.  It computes and stores a server-side payload hash for retry
    protection.
9.  The UI displays confirmation and a receipt.

If any required insert or validation fails, the transaction must roll
back instead of leaving partial records.

### 7.6 Save an offline sale

When offline:

1.  The frontend validates the cart and payment fields as far as
    possible without a server.
2.  The sale receives a stable unique ID before it is queued.
3.  The sale is saved to IndexedDB together with its item and payment
    details.
4.  The durable queue marks it as pending synchronization.
5.  The UI shows a receipt/summary with a clear pending-sync indicator.
6.  The app does not claim the server has accepted the sale yet.

The app should avoid losing queued sales if the tab closes or the device
restarts.

------------------------------------------------------------------------

## 8. Synchronization Workflow

``` mermaid
flowchart TD
    A[Connectivity returns] --> B[Read pending queue]
    B --> C[Select a queued sale]
    C --> D[Send stable sale ID and payload]
    D --> E[Authenticate and authorize]
    E --> F[Check device, shift, items, discounts, payment]
    F --> G[Lock products and check authoritative stock]
    G --> H{Valid and enough stock?}
    H -- No --> I[Return a clear rejection]
    I --> J[Keep record visible for resolution]
    H -- Yes --> K[Atomically write sale, items, stock movements, payment]
    K --> L[Return synced result]
    L --> M[Mark local queue item synchronized]
    M --> N{More queued sales?}
    N -- Yes --> C
    N -- No --> O[Refresh authoritative data]
```

### Retry and duplicate protection

-   The same queued sale must reuse the same stable sale ID.
-   A retry must not create a second sale.
-   The backend computes the payload hash; it must not trust a hash
    supplied by the browser.
-   If the same ID arrives with a different payload, the request must be
    rejected.
-   A matching hash should not be treated as sufficient if the
    previously committed related records are found to be inconsistent.
    Before production, retry integrity checks should verify the sale's
    items, payment, and stock movements.

### If synchronization fails

-   Keep the local queue record and its failure state.
-   Show a readable reason, when safe to expose it.
-   Retry transient network failures.
-   Do not retry permanent validation failures forever without showing
    them to the owner.
-   Never silently change the original sale payload to make it pass
    validation.
-   If authoritative stock is insufficient, require an explicit
    resolution workflow rather than allowing negative stock.

------------------------------------------------------------------------

## 9. Product and Inventory Workflow

### Add a product

1.  Open **Products**.
2.  Select **Add Product**.
3.  Enter name, selling price, and optional SKU, barcode, and cost
    price.
4.  Save the product through an authorized backend operation.
5.  The owner records one positive opening-stock movement in Inventory for
    a product with no prior movement history. This path uses the trusted
    `record_opening_stock(...)` RPC; its migration must be applied to the
    hosted database before the form can save.

### Restock or adjust stock

1.  Open **Inventory**.
2.  Select the product.
3.  Choose the authorized stock operation, such as restock or
    adjustment.
4.  Enter the quantity and reason.
5.  The backend validates the request and locks the product row.
6.  A restock appends a positive `restock` movement and an actor-attributed
    audit event in the same transaction. Opening stock uses
    `record_opening_stock`; recurring receipts use `record_restock`.
7.  The UI refreshes the calculated stock balance.

A negative adjustment must be rejected if it would cause stock to become
negative. All stock-changing functions must follow compatible locking
rules to avoid races with sales.

### Calculate stock

Current stock is calculated from inventory movements:

`current_stock = sum(quantity_change for the store and product)`

Sale movements are negative quantities. Opening stock and restocks are
positive quantities. Returns and adjustments must follow their defined
sign and authorization rules.

------------------------------------------------------------------------

## 10. Shift Closing Workflow

SariPOS uses a blind-drop closing process.

1.  An authorized shift operator opens the active shift's **Close Shift** screen.
2.  The operator counts physical cash and submits the count without seeing expected cash.
3.  The trusted server locks the shift row, waits for any in-flight sale sync to finish, and calculates expected cash from committed records: opening float + completed recorded cash payments (`payments.amount`) − cash refunds − cash drops/withdrawals − cash-paid expenses.
4.  The server saves counted cash, expected cash, variance (`counted_cash - expected_cash`), closing user/time, and an audit event in one transaction. A non-zero variance does not block closing and never changes expected cash.
5.  Retrying the same close from the same user with the same count returns the saved reconciliation; a different count or user cannot change a closed shift.
6.  The operator can inspect store-scoped shift history and a breakdown of cash movements and expenses.

Closing requires an online trusted call. The current app has no durable offline close or sales queue, so it must not show an offline count as finalized. Unknown legacy refund/expense payment methods block close until classified from authoritative records.

------------------------------------------------------------------------

## 11. Sales History and Receipt Workflow

1.  The owner opens **Sales History**.
2.  The app displays available sales and indicates whether each is
    pending, synchronized, or failed.
3.  The owner selects a sale.
4.  **Sale Details** displays item names, quantities, prices, line
    discounts, combined discount, grand total, payment details, date,
    and shift.
5.  The owner opens the receipt view.
6.  The owner may print the receipt on demand if the device/browser
    supports it.

Refunds and voids are not part of the initial MVP. A completed sale
should not be silently deleted to correct an error.

------------------------------------------------------------------------

## 12. Authentication, Authorization, and Data Isolation

For every protected online operation:

1.  Verify the authenticated user.
2.  Verify membership in the requested store.
3.  Verify that the requested records belong to that store.
4.  Verify the operation is permitted for the current shift and
    authorized device where applicable.
5.  Enforce RLS and database constraints as defense in depth.
6.  Never trust a `store_id`, device ID, product ID, price, discount,
    stock value, or total merely because the browser submitted it.

Do not expose the Supabase service-role key to client-side code.
Security-definer functions must have a fixed safe `search_path`,
explicit authorization checks, carefully scoped execute grants, and
validation of all inputs.

On logout, clear the online session and account-specific in-memory data.
Preserve pending local sales in their original store/account scope; a
different user must not read or synchronize them. The original account
must be able to resume synchronization after signing in again.

------------------------------------------------------------------------

## 13. Error and Recovery Scenarios

  -----------------------------------------------------------------------
  Scenario                            Expected behavior
  ----------------------------------- -----------------------------------
  Incorrect or expired email code     Reject sign-in; do not silently
                                      accept cached credentials as online
                                      authentication

  No internet on an authorized device Offer offline unlock only if local
                                      authorization remains valid

  Offline authorization expired       Require online re-authentication

  Product is inactive                 Reject the sale

  Product belongs to another store    Reject the sale

  Insufficient stock                  Reject the transaction; do not
                                      create partial records

  Discount exceeds permitted amount   Reject the transaction

  Cash tender is below the total      Reject payment submission

  Network fails during                Retain the queued sale and retry
  synchronization                     safely

  Server committed but response was   Retry with the same ID; return
  lost                                already-synced only after
                                      appropriate integrity checks

  Same sale ID, different payload     Reject and flag the mismatch

  A queued sale is rejected for stock Keep it visible for explicit
                                      resolution; never create negative
                                      stock

  Sale write fails midway             Roll back the entire transaction

  Shift is closed                     Reject new sales for that shift

  Device is revoked                   Reject online sale synchronization
                                      from that device
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 14. Page Flow Summary

``` text
Sign In
  ├── Online authentication
  │    ├── Email and password
  │    ├── Choose TOTP (AAL2) or email OTP (AAL1 fallback)
  │    ├── Store membership and device checks
  │    └── Dashboard
  │
  ├── First-time owner
  │    ├── Email and password
  │    ├── Confirm signup code
  │    ├── Sign in and complete TOTP or email OTP
  │    ├── Store setup
  │    ├── Device authorization
  │    ├── Add products and opening stock
  │    └── Open first shift
  │
  └── Offline access
       ├── Check prior device authorization
       ├── Enter offline PIN
       ├── Check offline authorization expiry
       └── Local Dashboard / POS
            ├── Products and Inventory
            ├── New Sale
            │    ├── Cart
            │    ├── Item and overall discounts
            │    ├── Payment
            │    └── Receipt (pending or confirmed)
            ├── Sales History / Sale Details
            ├── Sync Status
            └── Shift Overview / Close Shift
```

------------------------------------------------------------------------

## 15. Recommended Build and Verification Order

1.  Verify the Next.js project structure and environment setup.
2.  Finish authentication, account initialization, store membership, and
    RLS.
3.  Establish device authorization and the offline access boundary.
4.  Build products and the inventory ledger with no-negative-stock
    protection.
5.  Build shift opening and closing.
6.  Build POS cart, discounts, payment, and receipt UI.
7.  Finish and test the trusted atomic sale operation.
8.  Add IndexedDB persistence and the durable offline queue.
9.  Add synchronization, retry handling, and conflict resolution.
10. Build Dashboard, Sales History, and operational status views.
11. Test authorization, stock races, duplicate requests, discount
    errors, interrupted synchronization, and cash reconciliation.

**Do not connect unfinished transaction logic to live selling.** Use
isolated test data and verify both successful and rejected cases before
operational use.

------------------------------------------------------------------------

## 16. Scope Notes

This workflow is a planning specification. The following still require
implementation and testing before they can be considered complete:

-   A secure device authorization mechanism beyond a device ID.
-   Robust offline PIN storage and local authorization-expiry handling.
-   Backend routes/services organized around the sale transaction.
-   Retry integrity checks for existing sales.
-   Compatible locking for every inventory-changing operation.
-   Defined conflict handling for offline sales rejected by
    authoritative stock.
-   Configure signup confirmation and email OTP templates to include
    `{{ .Token }}` and set up production SMTP. Verify RLS policies and
    trusted functions accept either AAL2 or `amr` containing `otp`, retain
    membership and role checks, and reject password-only AAL1. This
    permits independent OTP-only sign-in outside the UI; use TOTP-only
    access if that trade-off is not acceptable.
-   The post-password email-code action uses Supabase Auth
    `signInWithOtp`; configure the hosted **Magic Link** template with
    `{{ .Token }}` for a numeric code. If the template uses
    `{{ .ConfirmationURL }}`, Supabase sends a magic link instead. Auth sends
    the message through the project's configured SMTP provider. The app
    verifies the entered code with `verifyOtp` using type `email`; no
    callback route is used for this numeric-code flow.
-   Blind-drop cash closing with a fully specified expected-cash
    formula.
-   Automated tests for transaction atomicity, idempotency, and
    authorization.

Update this document alongside [core-features.md](./core-features.md)
and [requirements.md](./requirements.md) whenever the agreed MVP
workflow changes.
