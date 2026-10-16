# SariPOS Database Reference for AI Coding Agents

**Database:** Supabase / PostgreSQL  
**Purpose:** Shared reference for the current SariPOS tables, policies, trusted functions, relationships, and invariants.

**Project use:** This is the mandatory starting point for every database-dependent task. Read it before changing database-backed application code or other SariPOS rules. It is the shared reference, not proof of hosted state: live SQL and versioned migrations determine what is actually deployed.

> **Accuracy notice:** This is a working reference based on previously reviewed schema and policy information, not a live database dump. Exact columns, policy expressions, indexes, triggers, constraints, and grants must be verified against the current Supabase project. If this document differs from the live database, inspect the difference and update this file; never guess.

## 1. Mandatory instructions for AI agents

Before making database-dependent changes:

1. Read this file and the other SariPOS docs.
2. Inspect the existing repository, migrations, and current database definitions before editing.
3. Do not invent table names, columns, enum values, relationships, function signatures, or policy behavior.
4. Never disable RLS or broaden grants just to make an operation work.
5. Never expose the Supabase service-role key in browser code or a `NEXT_PUBLIC_` variable.
6. Treat all browser-supplied IDs, prices, totals, role names, and store IDs as untrusted.
7. Use an approved trusted database function/server operation for sensitive writes.
8. Every store-owned record and referenced row must be checked against the caller's authorized store.
9. Add positive, negative, cross-store, retry, and concurrency tests for protected operations.
10. If the live policy/function behavior is unknown, state the uncertainty and inspect it before implementation.

## 2. Known tables

RLS was previously confirmed enabled for these 13 public tables:

| Table | Purpose and known facts |
|---|---|
| `stores` | Store/business records; parent scope for business data. Store creation should use the approved function. |
| `profiles` | App profile for an authenticated user, keyed by `user_id` referencing the Auth user; `created_at` defaults to the current time and `display_name` is optional. The local migration `202610160002_create_profiles_on_signup.sql` creates rows from an `auth.users` trigger and backfills existing accounts. Deployment and trigger behavior must be verified in the target project. Users should only read their own profile unless a policy explicitly allows otherwise. |
| `user_store_members` | Links users to stores and records membership/role. Store access must be based on this membership. Store creator is intended to become `owner`; verify the stored role and function body. |
| `store_devices` | Registered selling devices. `sync_sale` checks `id`, `store_id`, `is_active`, and `revoked_at`. An active row alone is not cryptographic proof of physical-device identity. |
| `products` | Store-scoped product catalog. Known fields include name, SKU/barcode, `selling_price >= 0`, optional `cost_price >= 0`, `is_active`, timestamps. Known unique `(store_id,id)` and per-store partial unique indexes for SKU/barcode. No stock column; stock is ledger-derived. |
| `shifts` | Store/device shift and cash reconciliation. Known fields include open/close timestamps, opening float, counted/expected cash, variance, status. Known composite store/device relationship, unique `(store_id,id)`, and partial unique index for one open shift per store. |
| `sales` | Sale header: ID, store, shift, status, subtotal, discount amount, grand total, occurred/received timestamps, required `payload_hash`. Known checks: nonnegative totals, `discount_amount <= subtotal`, `grand_total = subtotal - discount_amount`, completed status, store/shift relationship, unique `(store_id,id)`. |
| `sale_items` | Item snapshots: store, sale, product, product-name snapshot, unit price, quantity, line discount, line total. Known checks: nonnegative price/discount, quantity positive, discount no greater than gross line value, `line_total = unit_price * quantity - line_discount`. |
| `payments` | One payment per sale. Known methods: `cash`, `gcash`, `maya`; unique sale payment. Cash tender/change are validated for cash; non-cash payments should not have cash-only values. A reference is not proof a wallet transfer was received. |
| `inventory_movements` | Inventory ledger. Hosted columns confirmed from the project on 2026-10-16: `id`, `store_id`, `product_id`, nullable `sale_id`, nullable `sale_item_id`, `quantity_change`, `reason`, and `created_at`. Stock is `SUM(quantity_change)` by store/product. Known reasons: `opening_stock`, `restock`, `sale`, `adjustment`, `return`, `damage`; `quantity_change <> 0`. Sale movement requires sale and sale-item references and must be negative; non-sale movement has no sale-item reference. Known unique movement per sale item. The confirmed column list has no actor field; trusted stock operations must use `store_audit_logs` for actor attribution. Constraints and policies still require live verification. |
| `shift_expenses` | Expenses associated with shifts. Exact columns, policies, and trusted write path must be verified. |
| `sale_reversals` | Table exists for future/controlled reversal workflows. Refunds/voids are outside the initial MVP; do not implement without reviewing the schema and approved workflow. |
| `store_audit_logs` | Audit trail for store actions. Hosted columns reported by the user on 2026-10-16: `id`, `store_id`, nullable `actor_user_id`, `event_type`, `details`, and `created_at`. Reported constraints require referenced store and actor rows to remain, and require a nonblank event type. The reported policy permits authenticated store members to read; it has no direct authenticated insert policy. Trusted writes must use a controlled database function. Other policies, RLS force status, and append-only protections remain to verify. |

The local migration `supabase/migrations/202610160001_owner_roles_and_operations.sql`
proposes `store_roles`, `role_permissions`, and `user_store_members.role_id`.
These are repository definitions only until the migration is applied and
verified in the target Supabase project; do not count them as confirmed live
tables yet.

Local migration `supabase/migrations/202610160004_record_restock.sql` adds
`public.record_restock(uuid, numeric) RETURNS uuid`, an owner-only trusted
operation that writes a positive `restock` movement and matching audit event.
It is not available in the hosted database until applied and verified there.

Supabase Auth owns `auth.users`. Do not insert directly into `auth.users`; use supported Supabase Auth flows.

## 3. Known security model and functions

### RLS and grants

RLS is enabled on the 13 tables above. Previously reviewed policies were described as read-only for business tables, with users allowed to read their own profile. Direct client writes to sales and inventory tables are intentionally blocked until trusted transaction functions are used.

This summary is not a substitute for exact policy expressions. Inspect both RLS (`USING`, `WITH CHECK`) and SQL grants. RLS being enabled does not automatically mean a table is secure.

### Membership helper

`private.is_store_member(UUID)` exists. Previously reviewed properties: `SECURITY DEFINER`, fixed empty `search_path`, execute intended for `authenticated` and `postgres`, revoked from `anon` and `PUBLIC`. Verify the live definition and grants.

### Store creation

`public.create_store_for_current_user(TEXT,TEXT)` exists. Previously recorded execute grants: `authenticated`, `postgres`, `service_role`; not `anon`/`PUBLIC`.

**Verify its body:** arguments, return value, store insert, owner membership insert, transaction behavior, and any profile writes. Do not assume the role or tables written based on its name.

### Profile creation

The local migration `supabase/migrations/202610160002_create_profiles_on_signup.sql`
creates a `SECURITY DEFINER` trigger function on `auth.users` that inserts
`profiles.user_id` on account creation. It also backfills existing Auth users
and uses `ON CONFLICT (user_id) DO NOTHING` to avoid duplicate profile rows.
This behavior is not active in the hosted project until the migration is
applied and verified there.

### Sale synchronization

Known signature:

```sql
public.sync_sale(
  p_store_id uuid,
  p_sale_id uuid,
  p_shift_id uuid,
  p_device_id uuid,
  p_occurred_at timestamptz,
  p_items jsonb,
  p_payment jsonb,
  p_subtotal numeric,
  p_discount_amount numeric,
  p_grand_total numeric
) RETURNS jsonb
```

Previously reviewed version is `SECURITY DEFINER` with a fixed empty `search_path`. It is intended to check authentication/membership, active device, matching open shift, payment validity, item values, product ownership/active status, stock, and then atomically write `sales`, `sale_items`, `inventory_movements`, and `payments`.

The function has been revised during planning. **Inspect the current live body before relying on this summary**, particularly the discount/subtotal formula, idempotency behavior, and execute grants.

### Stock helper

`public.get_product_stock(p_store_id uuid, p_product_id uuid) RETURNS NUMERIC` exists. Previously recorded behavior sums `inventory_movements.quantity_change` for a store/product pair. It was `STABLE SECURITY INVOKER`, empty `search_path`, execute granted to `authenticated`, revoked from `PUBLIC` and `anon`. Verify live definition and grants.

## 4. Business invariants

### Store isolation

- A user may only access stores where membership and operation-level authorization permit it.
- Never trust a client-supplied `store_id` by itself.
- Validate that referenced products, shifts, sales, devices, payments, and movements belong to the same store.
- Use composite foreign keys including `store_id` where appropriate and present in the schema.
- Do not let users assign themselves a higher role through a client-supplied role string.

### Product and inventory

- Current stock is ledger-derived; do not add a separate authoritative stock field without an approved migration/design.
- Every stock-changing operation must use compatible product-row locks, re-check stock while holding the lock, and prevent negative stock.
- Opening stock, restock, adjustment, damage, and sale deductions must be represented in the movement ledger with an allowed reason.
- Do not directly update/delete completed sale movements through ordinary client access.
- Product creation/edit/deactivation and inventory write functions must be inspected; do not assume they exist.

### Sales and discounts

Agreed calculation:

```text
subtotal = SUM(unit_price * quantity) before item-level discounts
line_total = unit_price * quantity - line_discount
discount_amount = SUM(line_discount) + overall_sale_discount
grand_total = subtotal - discount_amount
```

The trusted operation must validate items and recompute totals; do not trust totals from the browser. Existing sale and sale-item checks were previously reviewed as consistent with these formulas, but the live function must also follow the same contract. Currency precision and rounding still require an explicit decision.

### Payments

- Initial MVP: one payment per sale.
- Methods: `cash`, `gcash`, `maya`.
- Payment amount equals validated grand total.
- Cash tender must be at least the payment amount.
- Change equals `cash_tendered - amount`.
- GCash/Maya records are not direct wallet integrations and are not automatically verified.
- Split payments are out of scope.

### Shifts

- Sale sync requires a matching open shift and active registered device.
- One open shift per store is intended and backed by a partial unique index.
- Blind-drop closing means counted cash is entered before expected cash is revealed.
- Verify the actual expected-cash formula and trusted shift open/close operations before implementation.

### Offline sync and idempotency

- Keep the same sale ID and canonical payload for retries.
- A timeout does not prove the server failed to commit.
- Same ID + same payload should return an idempotent result only after checking related records are consistent.
- Same ID + different payload must be rejected.
- Sale, items, stock movements, and payment must commit or roll back atomically.
- Never silently discard or rewrite a rejected offline sale.
- Concurrent sale attempts must not oversell stock.

## 5. Trusted operations inventory

Do not assume every operation below already has a function.

| Operation | Required checks | Current status from known information |
|---|---|---|
| Create store | Authenticated caller; create store and owner membership atomically | Function exists; inspect body |
| Register/revoke device | Owner/authorized role; store scope; revocation | Table exists; write path needs verification |
| Create/edit/deactivate product | Owner and permitted-auth checks; valid price; SKU/barcode uniqueness; store scope; audit | Local migration `202610160005_manage_products.sql` adds owner-only edit and reversible active-status RPCs; hosted deployment remains pending |
| Opening stock | Owner and permitted-auth checks; positive quantity; same-store product row lock; one-time initial movement; actor-attributed audit event | Local `record_opening_stock` migration added; hosted deployment and audit policy/constraint verification pending |
| Restock/adjustment/damage | Validate quantity/reason; lock product; prevent negative stock; append ledger; audit | Write path not confirmed here |
| Open/close shift | Authorized store/device; enforce one open shift; calculate cash values on trusted side | Local migration proposes shift-open RPC; close path and hosted deployment remain unverified |
| Record expense | Correct shift/store; amount/reason; audit and cash treatment | Write path needs verification |
| Sync sale | Auth, membership, device, open shift, item/total/payment validation, stock lock, atomic inserts | User-provided hosted definition inspected; locks product rows and rejects inactive/cross-store products; verify other policies and grants |
| Refund/void/reversal | Controlled, auditable compensating records and ledger entries | Future scope; do not implement in MVP |
| Read reports | Enforce store membership and store-scoped queries | Verify policy and query paths |

The local owner/role migration proposes `create_product_for_current_store`,
`open_store_shift`, role-management RPCs, and an inventory aggregation RPC.
Review their definitions and test them after applying the migration. In
The new product-management migration adds `update_product_for_current_store`
and `set_product_active_for_current_store`; it deactivates products rather
than deleting rows, preserving sale and inventory history. The hosted
`sync_sale` definition supplied by the user locks product rows and rejects
inactive or cross-store products before inserting sales. The shift RPC
requires a pre-registered active device. Product creation and its auth helper
were previously confirmed deployed by the user; verify new functions against
the target project.

Migration `202610160003_record_opening_stock.sql` adds the owner-only
`record_opening_stock(uuid, numeric)` operation. It records a positive
`opening_stock` movement once for a product with no prior movement history,
after locking the product row. This migration is local until applied to the
hosted project. Actor attribution is not available in the confirmed movement
columns; the function also writes `inventory.opening_stock_recorded` to
`store_audit_logs` with the authenticated actor and movement details. Verify
the reported live audit contract permits the nonblank event name and
authenticated actor reference. The audit table has no direct authenticated
insert policy; writes go through this `SECURITY DEFINER` function. Verify that
RLS is not forced for the function owner and confirm hosted execution before
treating the path as fully verified.

Do not solve missing write functions by granting broad direct `INSERT`, `UPDATE`, or `DELETE` access to `authenticated`.

## 6. Roles

The MVP recognizes an `owner` membership. A local migration proposes
`store_roles` and `role_permissions`, with a built-in Cashier role and
allowlisted permissions. Those tables and `user_store_members.role_id` are
**not confirmed in the hosted database until the migration is applied and
verified**.

- Verify the role actually inserted by `create_store_for_current_user`.
- Keep role-table changes in the versioned migration; do not assume the proposal is deployed.
- Enforce each cashier/custom-role permission in trusted functions, not just by hiding UI buttons. Existing `sync_sale` role enforcement must be checked separately.
- Owner status does not bypass data-integrity, store-scope, or transaction rules.

## 7. Supabase inspection queries

Run these read-only queries in Supabase SQL Editor before implementing or changing database behavior.

### Columns

```sql
SELECT table_schema, table_name, ordinal_position, column_name,
       data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### RLS enabled status

```sql
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
```

### Policies

```sql
SELECT schemaname, tablename, policyname, permissive, roles,
       cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname IN ('public', 'private')
ORDER BY schemaname, tablename, policyname;
```

### Constraints

```sql
SELECT ns.nspname AS schema_name, tbl.relname AS table_name,
       con.conname AS constraint_name, con.contype AS constraint_type,
       pg_catalog.pg_get_constraintdef(con.oid) AS definition
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS tbl ON tbl.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = tbl.relnamespace
WHERE ns.nspname = 'public'
ORDER BY tbl.relname, con.conname;
```

### Function definitions and security attributes

```sql
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_catalog.pg_get_function_result(p.oid) AS result_type,
       p.prosecdef AS security_definer, p.proconfig AS function_settings,
       pg_catalog.pg_get_userbyid(p.proowner) AS owner,
       pg_catalog.pg_get_functiondef(p.oid) AS definition
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'private')
ORDER BY n.nspname, p.proname;
```

### Function execute grants

```sql
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
       r.rolname AS role_name,
       has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
CROSS JOIN pg_catalog.pg_roles AS r
WHERE n.nspname IN ('public', 'private')
  AND r.rolname IN ('anon', 'authenticated', 'postgres', 'service_role')
ORDER BY n.nspname, p.proname, role_name;
```

### Triggers

```sql
SELECT event_object_schema, event_object_table, trigger_name,
       action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema IN ('public', 'auth')
ORDER BY event_object_schema, event_object_table, trigger_name;
```

These are inspection queries only. Do not run destructive DDL or test sales against production data without a safe plan and test environment.

## 8. Required authorization tests

| Scenario | Expected result |
|---|---|
| Anonymous caller accesses protected business data | Denied |
| Authenticated user has no membership | Denied |
| Store A member requests Store B records | Denied |
| User bypasses UI and calls database directly | Same protections still apply |
| User submits another store's product/shift/device ID | Denied |
| Revoked/inactive device attempts sale sync | Denied |
| Sale has no matching open shift | Denied |
| Sale totals or payment are inconsistent | Denied |
| Stock insufficient | Denied; no partial writes |
| Same sale ID and same payload retried | Safe idempotent result after integrity check |
| Same sale ID with different payload | Denied |
| Two sales compete for remaining stock | Stock never becomes negative |
| Any sale sub-operation fails | Whole transaction rolls back |

## 9. Migrations and change management

- Keep schema changes in migration files in the repository; do not rely only on manual SQL Editor changes.
- Use a test Supabase project or safe synthetic data for experiments.
- Review every migration before applying it.
- After changing a function, re-check its body, `search_path`, security mode, grants, and tests.
- After changing RLS, rerun positive and negative authorization tests.
- Do not remove constraints or weaken policies just to make tests pass.
- Update this document, application types, tests, and related docs together.

## 10. Verification checklist

- [ ] Inspect exact live DDL for all 13 public tables.
- [ ] Capture every exact RLS policy expression.
- [ ] Verify table and column grants.
- [ ] Verify profile trigger behavior on signup.
- [ ] Verify `create_store_for_current_user` inserts the owner membership correctly.
- [ ] Verify current `sync_sale` body matches the agreed discount formula.
- [ ] Verify `sync_sale` execute grants for `anon`, `authenticated`, `postgres`, and `service_role`.
- [ ] Verify `get_product_stock` definition and grants.
- [ ] Inventory indexes and unique constraints.
- [ ] Identify trusted product, inventory, shift, and expense write functions.
- [ ] Verify audit log protections.
- [ ] Add automated authorization, atomicity, idempotency, and concurrency tests.

## 11. Related SariPOS documents

Read alongside:
- `CORE_FEATURES_AND_PAGE_LIST.md`
- `END_TO_END_WORKFLOW.md`
- `USER_FLOW_AND_DATABASE_POLICIES.md`
- `MISSING_REQUIREMENTS_AND_READINESS.md`

Use the actual filenames already present in the repository if they differ from the suggested names.

**Final rule:** If code conflicts with a live constraint, policy, grant, or trusted function, stop and explain the conflict. Do not silently weaken the database security model.
