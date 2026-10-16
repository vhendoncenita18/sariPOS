# Tech Stack & System Architecture: SariPOS

For every database-backed change, read [database-reference.md](./database-reference.md) first, then verify repository migrations and live SQL as available. The reference is a working guide, not proof of deployment.

## Core Stack

- **Framework:** Next.js App Router, TypeScript, React Server Components by default.
- **Styling:** Tailwind CSS and Lucide React.
- **Database and auth:** Supabase PostgreSQL, Supabase Auth, and `@supabase/ssr`.
- **Offline storage:** IndexedDB for eligible cached data and durable queued sales. Keep browser storage behind a small client-side persistence boundary; select a helper library only when implementation needs it.

## App Router and Supabase Clients

- Use `lib/supabase/client.ts` for browser components and `lib/supabase/server.ts` for Server Components, Server Actions, and Route Handlers.
- Use `middleware.ts` for session refresh and route protection. Verify users with `auth.getUser()`. Operational routes accept a signed JWT with `aal=aal2` after TOTP or `amr` containing `otp` after email OTP; reject password-only AAL1 sessions. Continue to enforce store membership and roles through trusted server/database authorization and RLS.
- The end-to-end target journeys are in [end-to-end-workflow.md](./end-to-end-workflow.md); keep implementation and security behavior aligned with those flows.
- Store setup, table access boundaries, RLS/grant verification queries, and logout isolation are specified in [user-flow-and-database-policies.md](./user-flow-and-database-policies.md).
- Cross-cutting implementation gaps, trusted-operation inventory, test gates, privacy/recovery requirements, and unresolved release decisions are tracked in [missing-requirements-and-readiness.md](./missing-requirements-and-readiness.md).
- Server Components are the default. Use `'use client'` only for UI interaction, local cart state, offline storage, or browser connectivity.
- Validate all inputs and authorization in trusted server/database code. Never expose the service-role key to the browser.

## Trusted Sale Synchronization

- Online checkout and queued offline sales must finish through the trusted `public.sync_sale(p_store_id, p_sale_id, p_shift_id, p_device_id, p_occurred_at, p_items, p_payment, p_subtotal, p_discount_amount, p_grand_total)` operation; no direct client-side database mutations for sales or stock. The current checkout action payload does not match this documented signature and must not be treated as a verified working flow.
- The sync contract must include a stable sale ID and enforce idempotency on the server. Retrying a committed or in-flight sale must not create duplicates.
- The server validates membership, device authorization, active shift, product availability, payment, discounts, and authoritative stock, and atomically records sale, items, payment, and inventory movements.
- Server-side stock is authoritative. Offline cached stock is advisory; surface a clear failed-sync result when stock or other validation changes before synchronization.
- Do not queue arbitrary edits as sales. Store only the minimum data needed for a retry, with explicit `pending`, `syncing`, `synced`, `retryable_error`, and `needs_resolution` states.
- Use a documented local queue lifecycle and stable retry identity. Keep diagnostics privacy-conscious, redact credentials and tokens, and distinguish retryable transport errors from permanent validation conflicts.

## Readiness and Release Controls

- Keep database schema changes in version-controlled migrations and verify policy conditions alongside SQL grants; neither RLS enablement nor a successful UI flow proves authorization.
- Maintain a function/policy inventory for each trusted write path, including caller, authorization, tables, atomicity, validation, idempotency, grants, tests, and verification status.
- Use isolated test data for authorization, money/discount, inventory concurrency, transaction atomicity, idempotency, offline recovery, and account-switching checks. Do not use real sales as test data.
- Before relying on offline sales, document local-data loss/recovery limits, backup and restore ownership, retention/deletion rules, and device replacement/revocation behavior.
- Follow [missing-requirements-and-readiness.md](./missing-requirements-and-readiness.md) for detailed gaps and decisions; keep planning status separate from implementation status.

## Current Implementation Status

The workspace has separate `/pos`, `/pos/sales`, `/pos/inventory`, `/pos/products`, `/pos/session`, `/pos/session/history`, and `/pos/settings` routes. Product stock is calculated from `inventory_movements`; do not query `products.stock_quantity` or `products.low_stock_threshold`, which are absent from the known schema. Product creation and the owner operations migration were confirmed deployed by the user. Migrations `202610160003_record_opening_stock.sql` and `202610160004_record_restock.sql` add owner-only inventory RPCs and forms; apply both before use. Migration `202610160005_manage_products.sql` adds owner-only product edit and reversible deactivate/reactivate RPCs; apply it before use. These operations write actor-attributed `store_audit_logs` events. The hosted `sync_sale` definition supplied by the user locks the matching shift row and product rows, and rejects a missing/open-shift mismatch or inactive/cross-store products. Adjustment/damage writes, device enrollment, and role enforcement inside live `sync_sale` remain unverified. Migration `202610160006_close_and_reconcile_shifts.sql` adds trusted shift close, cash-expense and cash-movement RPCs, and reconciliation history; apply and verify it before use. Closing is online-only until durable offline authorization and queues exist. The hosted `sync_sale` signature and other schema facts are in [database-reference.md](./database-reference.md). Existing checkout is online-only; the durable queue and idempotency flow are not implemented. Its current payment shape also needs alignment with the database's `cash`, `gcash`, and `maya` methods. Sign-in uses email/password followed by a choice of TOTP or email OTP. TOTP verification yields AAL2; email OTP establishes an independent AAL1 session and is not cryptographically bound to the preceding password step. Middleware and POS guards accept `aal=aal2` or signed `amr` containing `otp`, and reject password-only sessions. Auth creates `auth.users`; migration `202610160002_create_profiles_on_signup.sql` adds a profile trigger and backfills existing accounts, pending deployment verification. Store setup uses `create_store_for_current_user`. Devices are registered separately. Configure Supabase email templates and production SMTP. Opening a shift requires a registered active device.

## Security and Data Integrity

- Enable and verify RLS for all store-owned records, including products, sales, sale items, payments, inventory movements, shifts, memberships, devices, and audit logs.
- Every query and mutation must be scoped to the authenticated store membership; cashier permissions must not expose baseline costs or gross profit.
- Require an authenticated session with either `aal=aal2` or `amr` containing `otp` for online access; reject password-only AAL1. Email OTP is an independent AAL1 sign-in and its database policy branch does not prove that a password was also entered. Offline PIN unlock is device-local authorization and does not replace online verification.
- Offline access targets a maximum 72-hour local authorization window. Document and accept the disconnected-device revocation delay; browser-only expiry enforcement is not tamper-proof.
- Keep database changes in version-controlled migrations. Checkout and stock updates must be atomic and prevent negative authoritative stock.
