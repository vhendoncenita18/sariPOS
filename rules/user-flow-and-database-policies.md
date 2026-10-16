# SariPOS --- User Flow, Database Table Changes, and Policy Permissions

**Project:** SariPOS\
**Document type:** User journey and database authorization
specification\
**Status:** Planning based on the known schema and policy setup\
**Important:** This document distinguishes policy claims reported by
the source attachment from items that still need verification in the
actual Supabase SQL.

Use [database-reference.md](./database-reference.md) as the shared reference for known columns, constraints, and RPC signatures. The reference is not a live dump; verify uncertain entries against the target database.

Cross-cutting open requirements, release gates, error handling, data
recovery, and trusted-operation inventory are tracked in
[missing-requirements-and-readiness.md](./missing-requirements-and-readiness.md).

------------------------------------------------------------------------

## 1. Purpose

This document answers four practical questions:

1.  After someone creates an account, what happens?
2.  Which database tables should receive records?
3.  What can the signed-in owner view, create, update, or delete?
4.  How do Row Level Security (RLS) policies and trusted database
    functions control those actions?

SariPOS is planned as a single-owner, single-active-selling-device POS
for the MVP. A user must not gain access to another store's data simply
by changing a store ID in a request.

------------------------------------------------------------------------

## 2. Supabase State Reported by the Source Document

The attached source describes the following schema and policy checks as
previously completed. They have **not been independently verified from
this repository**: the original project had no version-controlled
migrations or schema snapshot. A proposed owner/role migration has since
been added, but not applied or validated against the hosted project. Treat table names, RLS status, function
definitions, and grants below as reported facts until the SQL checks in
Section 12 are run against the target project. Do not build a UI or
security assumption on a reported policy alone.

The source reports these tables and says RLS is enabled:

-   `stores`
-   `profiles`
-   `user_store_members`
-   `store_devices`
-   `products`
-   `shifts`
-   `sales`
-   `sale_items`
-   `payments`
-   `inventory_movements`
-   `shift_expenses`
-   `sale_reversals`
-   `store_audit_logs`

The source reports previous policy checks with these results:

-   Business-table policies are read-oriented.
-   Users may read their own profile as allowed by the profile policy.
-   Direct client writes to core sales and inventory tables are
    intentionally blocked until trusted transaction functions handle
    them.
-   `private.is_store_member(UUID)` is a `SECURITY DEFINER` helper with
    a fixed empty search path and execute permission limited to intended
    roles.
-   `public.create_store_for_current_user(TEXT,TEXT)` exists and is
    executable by `authenticated`, `postgres`, and `service_role`, not
    `anon` or `PUBLIC`.
-   The target project signature was confirmed as
    `create_store_for_current_user(p_name text, p_timezone text DEFAULT
    'Asia/Manila')`. The app passes `p_name` and omits `p_timezone` to use
    the database default. This confirms the signature only; the function
    body and grants still require direct review.
-   `public.sync_sale(...)` exists as a `SECURITY DEFINER` function and
    its execute grants were reportedly checked for intended roles.
-   RLS is enabled on the listed tables.

**Verification limit:** The exact SQL expression for each policy, any
signup trigger on `auth.users`, and exact insert/update/delete grants
are not reproduced here. The repository does not currently contain the
database SQL needed to check these reported facts. RLS enabled does not
mean a table is writable; verify policies and SQL grants before
implementing each screen.

The repository now contains a proposed versioned owner/role operations
migration at `supabase/migrations/202610160001_owner_roles_and_operations.sql`.
It was not applied to or tested against the hosted project in this session.
Review and apply it in the intended Supabase project before using the new
actions; live policies and function behavior remain unverified.

------------------------------------------------------------------------

## 3. Account Creation: What Happens?

### Flow A --- User signs up

1.  The user opens the Sign Up page and enters email, password, and
    password confirmation.
2.  Supabase Auth creates the authentication identity in `auth.users`
    and sends the configured signup confirmation code.
3.  The user verifies the code; SariPOS clears the confirmation session
    and asks the user to sign in with the new password and choose a
    verification method.
4.  After second-step verification, SariPOS checks for an existing
    membership. It does not directly write to `profiles`, `stores`,
    `user_store_members`, or `store_devices` during signup.
5.  The app checks for an existing membership using the authenticated
    user's RLS-scoped `user_store_members` rows.
6.  If no membership exists, show **Create Store** setup.
7.  The authenticated app calls
    `public.create_store_for_current_user(...)`; that trusted function
    writes the store and a `public.user_store_members` row linking the
    creator to that store with the `owner` role.
8.  The app reloads the user's permitted store context and confirms the
    owner membership. Device
    authorization remains a separate flow.

The local migration `supabase/migrations/202610160002_create_profiles_on_signup.sql`
adds a database trigger that creates `profiles.user_id` when Supabase Auth
inserts an account, and backfills existing Auth users. This only takes effect
in a project where the migration has been applied; verify the trigger in the
target database. The app does not directly write profile rows during signup.

### Which tables change?

  ---------------------------------------------------------------------------------------------
  Table                         Expected purpose        What can safely be stated
  ----------------------------- ----------------------- ---------------------------------------
  `auth.users`                  Supabase Auth identity  Supabase Auth creates the auth identity
                                                        on successful signup.

  `public.profiles`             Application profile     The versioned profile trigger migration
                                data linked to the auth creates the row for new Auth users and
                                user                    backfills existing users; deployment
                                                        must be verified in the target project.

  `public.stores`               Store/business record   The planned store-creation flow uses
                                                        `create_store_for_current_user(...)`;
                                                        confirm the function's exact writes.

  `public.user_store_members`   Connects a user to a    The trusted store-creation flow creates
                                store and their         the creator's membership with the
                                membership/role         `owner` role; verify the function body
                                                        and live row against the target project.

  `public.store_devices`        Registered device for a Should be populated by a separate
                                store                   authorized device-registration flow,
                                                        not merely by signing up.
  ---------------------------------------------------------------------------------------------

**Do not create rows in all these tables directly from the browser.**
Account identity, store ownership, and membership must be created
through trusted, authorized flows. The creator's owner role grants access
only where RLS, SQL grants, and trusted operations permit it.

### If the user already has a store

The app should load only the store(s) the user is authorized to access.
In the MVP, the intended model is one owner and one store. Do not
silently create a second store on every login.

### If signup succeeds but store setup fails

-   Keep the authentication account.
-   Show a clear retryable store-setup error.
-   Avoid creating duplicate stores or memberships on retry.
-   Use an idempotent store-setup flow where possible.
-   Do not grant access to a store unless the membership has been
    successfully created.

------------------------------------------------------------------------

## 4. The Normal Sign-In and Store-Loading Flow

1.  The user enters email and password; Supabase Auth verifies them.
2.  SariPOS offers TOTP authenticator verification or email OTP.
3.  TOTP completes Supabase MFA at AAL2. Email OTP establishes its own
    AAL1 session and is not cryptographically bound to the password
    session.
4.  Password-only AAL1 sessions are not allowed to continue.
5.  The app requests the user's permitted profile and membership
    information. Membership reads are RLS-scoped.
6.  Policies and trusted database functions accept `aal=aal2` or
    `amr` containing `otp`, and reject password-only AAL1.
7.  If no store membership exists, route to **Create Store / Setup**.
8.  If membership exists, load that store's permitted products,
    inventory summaries, shift, and other data.
9.  Check whether the device is authorized and whether an active shift
    exists.
10. Route to the Dashboard or the appropriate setup screen.

**Security limitation:** The email OTP route is an independent AAL1
sign-in. Since Supabase exposes it as a public passwordless method,
accepting `amr=otp` in RLS/trusted functions also permits OTP-only
sign-in outside this UI. If password entry must be mandatory for every
session, use only AAL2/TOTP or implement a custom password-bound email
factor.

Existing accounts that do not have a password use the **Forgot or don’t
have a password?** flow: request a generic-response recovery email, enter
the six-digit recovery code, set and confirm a password, then return to
the normal password-first sign-in flow.

The frontend may use membership information to decide which screen to
show, but frontend routing is not security enforcement. RLS and trusted
backend/database functions must enforce access independently.

------------------------------------------------------------------------

## 5. What Can the User Do After Store Setup?

The table below describes the intended MVP capabilities and the required
secure operation. It does **not** imply that direct table writes are
currently permitted.

  ----------------------------------------------------------------------------------------------------------------
  User action                Main table(s) involved   Expected operation   Policy-safe implementation
  -------------------------- ------------------------ -------------------- ---------------------------------------
  View own profile           `profiles`               Read                 Authenticated query restricted to the
                                                                           current user's profile.

  Edit profile fields        `profiles`               Update               Only if an explicit own-profile update
                                                                           policy and column restrictions permit
                                                                           it. Otherwise use a trusted backend
                                                                           function.

  Create a store             `stores`,                Insert               Call
                             `user_store_members`                          `create_store_for_current_user(...)`;
                                                                           do not let the browser assign arbitrary
                                                                           owner or membership IDs.

  View own store             `stores`,                Read                 Only through an authorized membership
                             `user_store_members`                          relationship.

  Register selling device    `store_devices`          Insert/update        Use a controlled device-authorization
                                                                           operation; exact existing write policy
                                                                           must be verified.

  View products              `products`               Read                 Store membership must be enforced.

  Add/edit/deactivate        `products`               Insert/update        Use an authorized backend/function or
  product                                                                  explicitly approved RLS write policies.
                                                                           Do not assume current policies allow
                                                                           direct writes.

  View inventory             `inventory_movements`,   Read                 Only for the user's authorized store.
  balance/history            `products`                                    Balance is calculated from movements.

  Record opening             `inventory_movements`    Insert               Must use a trusted stock operation that
  stock/restock/adjustment                                                 validates quantity and prevents
                                                                           negative stock. Direct client writes
                                                                           are not the intended approach.

  Open/close shift           `shifts`                 Insert/update        Use a trusted operation that checks
                                                                           store, device, and shift state. Verify
                                                                           existing write path before
                                                                           implementing.

  Create a sale              `sales`, `sale_items`,   Multi-table          Call the trusted `sync_sale(...)`
                             `payments`,              transaction          operation for synchronized sales; do
                             `inventory_movements`                         not directly insert into these tables
                                                                           from the browser.

  View sales history         `sales`, `sale_items`,   Read                 RLS must limit results to the
                             `payments`                                    authorized store.

  Record a shift expense     `shift_expenses`         Insert               Use a trusted operation and explicit
                                                                           authorization; verify current write
                                                                           policy.

  Reverse/refund a sale      `sale_reversals` and     Insert/transaction   Excluded from initial MVP; do not
                             related ledger tables                         expose a UI until a secure online-only
                                                                           workflow exists.

  View audit history         `store_audit_logs`       Read                 Authorized read-only access; normal
                                                                           users should not be able to rewrite
                                                                           audit records.
  ----------------------------------------------------------------------------------------------------------------

### Key rule

**RLS enabled does not mean a user can write.** RLS decides which rows a
role can access through a policy, while SQL privileges determine which
operations the role may attempt. Both must allow the operation. A
trusted `SECURITY DEFINER` function is a separate controlled path and
must perform its own authorization and validation.

### Owner and store-role operations

The new migration adds `store_roles`, `role_permissions`, and
`user_store_members.role_id`. New stores receive a built-in Cashier role;
existing `cashier` memberships are linked to it. Owners can create named
roles and assign allowlisted permissions to a verified existing Auth
account by email. Owner memberships cannot be reassigned through this UI.

Product creation uses `create_product_for_current_store(...)` and permits
the `owner` membership only. Shift opening uses `open_store_shift(...)`,
which checks the assigned `shift.open` permission, an active registered
device, and the single-open-shift rule under a transaction lock. The new
`get_store_inventory()` function calculates stock from movement rows.
Migration `202610160003_record_opening_stock.sql` adds an owner-only opening
stock operation that accepts one positive initial quantity for a product with
no movement history and locks that product row. It must be applied to the
hosted database before the Inventory form can save. Restock, adjustments,
and damaged-stock writes, product editing, shift closing, and device enrollment
remain separate work. The opening-stock RPC writes the actor and movement
details to `store_audit_logs`. The reported audit policy permits member reads
but no direct authenticated inserts, so verify the table is not forced under
RLS for the security-definer function owner before relying on the hosted
write path.

------------------------------------------------------------------------

## 6. Product Management Workflow

1.  User opens **Products**.
2.  App queries products for the authorized store.
3.  User selects **Add Product**.
4.  Form collects name, selling price, and optional SKU/barcode/cost
    price.
5.  Frontend validates fields for usability.
6.  The authorized backend operation verifies membership and validates
    the data again.
7.  Product is saved to `public.products`.
8.  The UI refreshes the product list.

For edit/deactivate, the backend must ensure the product belongs to the
current store. A product from another store must not be editable by
changing its UUID in the request.

Product management uses owner-only trusted RPCs. Editing validates the
product fields and SKU/barcode uniqueness; status changes set `is_active`
and append an actor-attributed audit event. Deactivation preserves the row
and all history. The hosted `sync_sale` definition supplied by the user locks
referenced product rows and rejects inactive or cross-store products before
writing a sale.

**Current-policy checkpoint:** Direct business-table writes remain blocked.
Product create/edit/status changes use trusted database functions and server
actions. Apply migration `202610160005_manage_products.sql` before using the
new controls. Do not bypass RLS by placing a service-role key in the browser.

------------------------------------------------------------------------

## 7. Inventory Workflow

### Opening stock / restock

1.  User opens Inventory and chooses a product.
2.  User selects **Opening Stock** or **Restock**.
3.  User enters a positive quantity and any required note/reference.
4.  Trusted operation verifies the product belongs to the store and
    locks the product row.
5.  The operation inserts a positive movement into
    `inventory_movements`. Opening stock uses `record_opening_stock`; a
    recurring restock uses `record_restock` and also appends an
    actor-attributed audit event in the same transaction.
6.  The UI recalculates current stock from the ledger.

### Stock adjustment

1.  User selects **Adjust Stock** and enters the adjustment quantity and
    reason.
2.  The trusted operation locks the product row.
3.  It calculates current stock and checks the resulting balance.
4.  It rejects any adjustment that would make stock negative.
5.  It records the movement and refreshes the balance.

Every stock-changing function must use compatible product locks.
Otherwise a sale and a restock/adjustment occurring at the same time may
bypass the intended no-negative-stock guarantee.

------------------------------------------------------------------------

## 8. Sale Workflow and Related Tables

### Online sale

1.  User opens POS and builds a cart.
2.  User applies item-level discounts and an optional overall discount.
3.  The frontend displays the subtotal and total.
4.  User selects one payment method.
5.  The app submits the sale to the trusted backend/database function.
6.  The function checks authentication, store membership, device, open
    shift, items, discounts, payment, and stock.
7.  The database transaction inserts:
    -   One row into `sales`.
    -   One row per item into `sale_items`.
    -   One negative movement per sold item into `inventory_movements`.
    -   One row into `payments`.
8.  If any required step fails, the transaction must roll back.
9.  The UI displays the receipt and the synchronization/confirmation
    state.

### Offline sale

1.  The app creates a stable sale ID.
2.  It stores the sale and queue entry in IndexedDB.
3.  It shows a pending-sync status.
4.  On reconnection, it submits the same sale ID and payload.
5.  The trusted function checks current server stock and all critical
    rules.
6.  If accepted, the server records the sale and the app marks it
    synchronized.
7.  If rejected, the sale remains visible for explicit resolution. The
    app must not silently discard it or create negative stock.

### Sale table responsibility

  -----------------------------------------------------------------------
  Table                               Meaning
  ----------------------------------- -----------------------------------
  `sales`                             One sale header: shift, subtotal,
                                      combined discount, grand total,
                                      timestamp, and idempotency payload
                                      hash.

  `sale_items`                        Item snapshots, quantities, unit
                                      prices, item-level discounts, and
                                      line totals.

  `payments`                          The single payment record for the
                                      sale.

  `inventory_movements`               Negative stock movements
                                      corresponding to sold items.
  -----------------------------------------------------------------------

These records should be created together by a trusted atomic
transaction, not by four independent browser requests.

------------------------------------------------------------------------

## 9. Shift Workflow and Table Changes

### Open shift

1.  User selects **Open Shift**.
2.  User enters the opening float.
3.  Trusted operation verifies membership and authorized device.
4.  It checks that no other open shift exists for the store.
5.  It inserts the shift row into `shifts`.
6.  Dashboard shows the active shift.

### Close shift

1.  User selects **Close Shift**.
2.  The app asks for counted cash before revealing expected cash
    (blind-drop).
3.  The trusted operation calculates expected cash according to the
    agreed cash-flow rules.
4.  It stores counted cash, expected cash, variance, and closed status
    in `shifts`.
5.  A non-zero variance is recorded and flagged but does not
    automatically prevent closure.

The exact opening/closing function permissions and implementation must
be verified before UI actions are connected to them.

------------------------------------------------------------------------

## 10. Logout and Account Switching

1.  User chooses **Sign Out**.
2.  The app clears the active online session from its runtime state.
3.  It clears account-specific in-memory data and invalidates
    account-scoped query caches.
4.  Pending local sales must remain safely stored and associated with
    their originating store/account context; they must not appear as
    another user's sales.
5.  A new user must not see the previous user's monitor, products, or
    sales.
6.  Offline access must only be available if the device's local
    authorization rules allow it.

Do not delete pending sales just because the user signs out. Instead,
protect them from cross-account exposure and define how the original
authorized account can resume synchronization.

------------------------------------------------------------------------

## 11. Suggested Page Access Rules

  -----------------------------------------------------------------------
  Page                    Who should access it?   Important guard
  ----------------------- ----------------------- -----------------------
  Sign Up / Sign In       Public before           No business data
                          authentication          displayed.

  Signup Code             Public before           Confirms the email address;
  Verification            authentication          does not create store or
                                                  membership rows.

  Second-factor           Password verified       User chooses TOTP (AAL2)
  Choice                                           or email OTP (AAL1 fallback).
                                                  Password alone has no
                                                  store access.

  Create Store            Authenticated user      Store and membership
                          without an initialized  created only by trusted
                          store                   operation.

  Dashboard               Authorized store user   Store membership and
                                                  data isolation.

  POS                     Authorized user with    Trusted sale commit;
                          permitted device and    stock and totals
                          open shift              validated server-side.

  Products                Authorized store user   Read policy and trusted
                                                  product write path.

  Inventory               Authorized store user   Trusted ledger
                                                  operations; no negative
                                                  stock.

  Shift screens           Authorized user and     Trusted open/close
                          appropriate device      operations.

  Sales History / Details Authorized store user   Store-scoped reads; no
                                                  direct edits to
                                                  completed sales.

  Sync Status             Authorized local user   Queue isolation and
                          for the queue; server   safe retry.
                          status only for         
                          authorized store        

  Settings / Device       Store owner /           Sensitive operations
  Security                authorized user         require server-side
                          according to the chosen authorization.
                          role model              

  Audit Log               Authorized reader       Prevent unauthorized
                                                  modification.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 12. What Must Be Verified in Supabase Before UI Implementation?

Run checks against the actual database before assuming the workflow is
ready.

Online app access accepts either a TOTP-verified AAL2 JWT or an email OTP
JWT at AAL1. Store-owned RLS policies and trusted functions must also
check store membership and role, and reject password-only AAL1. An RLS
condition may accept the two paths using `auth.jwt()->>'aal' = 'aal2'`
OR `auth.jwt()->'amr' @> '[{"method":"otp"}]'::jsonb`. This intentionally
allows standalone OTP-only sign-in outside the UI, because Supabase email
OTP is a separate passwordless auth method rather than a password-bound
MFA factor. If that is unacceptable, use AAL2/TOTP only or implement a
custom email factor. Verify every existing policy and
`SECURITY DEFINER` function; this example does not update the live project.

### A. List policies for all SariPOS tables

``` sql
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

This reveals which roles may `SELECT`, `INSERT`, `UPDATE`, or `DELETE`,
and the row conditions used by each policy.

### B. Check table privileges

``` sql
SELECT
    table_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
      'stores',
      'profiles',
      'user_store_members',
      'store_roles',
      'role_permissions',
      'store_devices',
      'products',
      'shifts',
      'sales',
      'sale_items',
      'payments',
      'inventory_movements',
      'shift_expenses',
      'sale_reversals',
      'store_audit_logs'
  )
ORDER BY table_name, grantee, privilege_type;
```

RLS policies and SQL grants must both be considered.

### C. Inspect the store-creation function

``` sql
SELECT pg_get_functiondef(
    'public.create_store_for_current_user(text,text)'::regprocedure
);
```

Confirm exactly which tables it writes, how it assigns
ownership/membership, and whether it safely handles retries.

### D. Check for an automatic profile trigger

Inspect triggers on `auth.users` and the definitions of any
profile-related trigger functions in the Supabase dashboard. Do not
assume `public.profiles` is automatically populated until this is
confirmed.

------------------------------------------------------------------------

## 13. Implementation Readiness Checklist

Use [missing-requirements-and-readiness.md](./missing-requirements-and-readiness.md)
for the broader readiness checklist covering data retention, deployment,
diagnostics, local queue recovery, and release testing. Items remain
planning requirements until verified against the repository and target
Supabase project.

-   [ ] Verify the exact policies and SQL grants for all tables.
-   [ ] Configure Supabase signup confirmation, email OTP, and password recovery templates with `{{ .Token }}` and production SMTP.
-   [ ] Confirm RLS policies and trusted functions accept AAL2 or `amr` containing `otp`, preserve membership/role checks, and reject password-only AAL1.
-   [ ] Verify whether signup automatically creates a `profiles` row.
-   [ ] Verify `create_store_for_current_user` creates the correct store
    and membership records atomically.
-   [ ] Define and test the device-registration operation.
-   [ ] Apply and verify trusted product create/edit/status operations and
    their audit behavior in the hosted database.
-   [ ] Apply and verify opening-stock and restock operations; define and
    test trusted adjustment behavior.
-   [ ] Define trusted open-shift and close-shift operations.
-   [ ] Correct and test sale discount validation.
-   [ ] Strengthen idempotent retry checks to validate related records.
-   [ ] Ensure all stock-changing operations share compatible locking
    rules.
-   [ ] Verify logout and account switching do not leak local data.
-   [ ] Test unauthorized reads and writes as `anon` and as a different
    authenticated user.
-   [ ] Keep the service-role key on the server only.

------------------------------------------------------------------------

## 14. Final Principle

The UI controls what the user sees and requests. It does not grant
permission.

-   **Supabase Auth** establishes the authenticated identity.
-   **Store membership** establishes which store the user is allowed to
    access.
-   **RLS and SQL privileges** control direct table access.
-   **Trusted backend/database functions** perform authorized writes and
    validate business rules.
-   **Transactions and constraints** protect consistency.
-   **IndexedDB** stores local offline data, but does not become the
    authoritative server ledger.

Treat this document as the workflow design. Before declaring a feature
implemented, verify its exact database policy, trusted write path, error
handling, and tests.
