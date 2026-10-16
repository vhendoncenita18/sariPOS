Type: task
Status: resolved
Blocked by:

## Question

What is the exact hosted contract for `public.store_devices`, its RLS policies and grants, and any existing device registration/revocation functions?

Before implementation, inspect the live Supabase database and share the output for:

- columns, types, nullability, and defaults for `public.store_devices`;
- constraints, indexes, foreign keys, and triggers;
- RLS enabled/forced state, policies, and table grants;
- function signatures, definitions, and execute grants for functions that read, register, activate, or revoke devices;
- the hosted `sync_sale` device check and any uniqueness rule limiting active devices per store.

The current repo rules identify the table but do not provide its complete schema or a confirmed enrollment RPC. Do not infer deployed behavior from local files.

## Answer

The hosted contract was confirmed from the user's SQL Editor output:

- Columns: `id uuid` (default `gen_random_uuid()`), `store_id uuid NOT NULL`, `device_name text NOT NULL`, nullable `credential_public_key text`, `is_active boolean NOT NULL DEFAULT true`, `enrolled_at timestamptz NOT NULL DEFAULT now()`, nullable `revoked_at timestamptz`, and `created_at timestamptz NOT NULL DEFAULT now()`.
- Constraints include primary key `id`, foreign key `store_id -> stores(id) ON DELETE RESTRICT`, unique `(store_id,id)`, nonblank device name, and the check `is_active = false OR revoked_at IS NULL`.
- Partial unique index `one_active_device_per_store` enforces at most one active device per store.
- RLS is enabled and not forced. The only reported policy is authenticated member `SELECT` through `private.is_store_member(store_id)`.
- SQL Editor output reports table grants for all listed operations to `anon` and `authenticated`, as well as owner/service roles. With only the reported member-read policy, RLS denies client writes; the enrollment migration should still revoke broad `anon`/`authenticated` write privileges and grant only what its chosen server path needs.
- No triggers exist on `store_devices` (confirmed: “Success. No rows returned”). The supplied function query showed `sync_sale` but no device enrollment/revocation RPC.
- Hosted `sync_sale` is executable by `authenticated`, not `anon`. It checks that the supplied device belongs to the store and is active/not revoked, and that the supplied shift is open for that device. It does not use `credential_public_key` to prove possession of the device.

This confirms a server-side authorization/enrollment path is needed. Do not use direct client table writes or treat device ID/browser fingerprint as proof. The key column's intended format and lifecycle are not established by this output.

## Comments

- User provided hosted columns, constraints/indexes, RLS/policies/grants, `sync_sale` definition/grants, and confirmed no `store_devices` triggers.
