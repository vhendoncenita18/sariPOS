# Offline-first sales with server-authoritative synchronization

Use [the database reference](../../rules/database-reference.md) for the recorded `sync_sale` function signature, table relationships, and inventory invariants; verify these against live SQL before implementation.

The MVP targets one active selling device per store and must keep checkout available during temporary outages. Sales are persisted locally and retried through the trusted `public.sync_sale` operation using stable identifiers and server-enforced idempotency; the server remains authoritative for stock and atomically commits sale records. This accepts that stale offline stock can make a queued sale fail on synchronization, while excluding concurrent multi-device selling from MVP. Offline PIN access targets a maximum 72-hour authorization window; a disconnected device cannot receive revocation until it reconnects or its local window expires, so this is a bounded risk rather than immediate revocation.
