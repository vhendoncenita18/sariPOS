# Design System & UI/UX Guidelines: SariPOS

## Visual Direction

Use the supplied dashboard reference as the product's visual anchor: an airy white operations workspace, a persistent left rail, a thin top utility bar, compact controls, and quiet bordered panels. Make the interface feel current through precise spacing, crisp black active states, and clear data hierarchy. Keep it useful for sari-sari store operators with plain labels and local commerce language.

## Design Plan

### Tokens

| Role | Value | Use |
| --- | --- | --- |
| Workspace | `#F7F8F7` | Main page background |
| Surface | `#FFFFFF` | Sidebar, toolbar, forms, and panels |
| Ink | `#171918` | Headings, figures, and selected controls |
| Muted | `#777D79` | Supporting labels and metadata |
| Line | `#E8EAE8` | Dividers, panel outlines, and input borders |
| Signal | `#16835D` | Positive change, focus, and stock status |

Use restrained green for positive or actionable states. Use black for the selected navigation item or one dominant action. Use a warm red only for errors and urgent stock warnings. Avoid large gradients, glow, glass effects, and dark canvases.

For authentication, retain the product's emerald signal and use it sparingly on the mark, focus states, and primary action; do not introduce a separate blue welcome-panel palette.

### Type

- Use the existing Geist sans family for interface text and numbers.
- Use sentence case and compact headings. Keep text left aligned.
- Use tabular numerals for currency, quantities, and dates.
- Let key totals read larger than their labels; keep metadata quiet and readable.

### Layout

Desktop application shell: fixed white left rail, top-aligned icon-and-label navigation, and a flexible content area with a slim utility header. Keep the store switcher and user identity anchored at the rail bottom. Align page title, short context, date or filter controls, and primary action in a single toolbar row where space permits.

```text
┌─────────────────────┬───────────────────────────────────────────────┐
│ SariPOS         ⌄   │ Search                         Help   Alerts  │
│                     ├───────────────────────────────────────────────┤
│ ▰ Dashboard         │ Page title                  Date   Main action │
│ □ Point of sale     │                                               │
│ □ Sales             │           Task-focused workspace              │
│ □ Products          │                                               │
│ □ Inventory         │                                               │
│                     │                                               │
│ Store selector      │                                               │
│ User / session      │                                               │
└─────────────────────┴───────────────────────────────────────────────┘
```

Use a black, high-contrast active rail item with a simple white icon and label, as in the reference. Keep inactive items on white with dark gray icons and text. At mobile widths, replace the persistent rail with a compact top bar and an accessible navigation menu; preserve the main action and essential status in the first viewport.

## Screen Patterns

- Dashboard: use a fixed white left rail, slim utility header, and light workspace as in the reference. Owners get recorded sales and ledger-derived inventory summaries. The known products schema has no low-stock-threshold column, so do not claim threshold alerts or infer a count. Label sales with their actual reporting period; the current dashboard totals are all-time, not today's. Show shift and offline-sync capabilities as unavailable until their data paths are verified; do not present fabricated shift, connectivity, queued-sale, or last-sync values. Cashiers get product availability and an honest session state; never show store-wide sales or profit to them. Do not invent orders, trends, or financial figures when the database has no records.
- Workspace navigation: each item opens its own route within the shared shell. Dashboard `/pos`, Sales `/pos/sales`, Inventory `/pos/inventory`, Products `/pos/products`, Cashier session `/pos/session`, and owner store settings `/pos/settings`. Keep active-route styling in sync with the current page; do not use section anchors as substitutes for pages.
- Products page: show store-scoped catalog search and product information. Only owners see optional cost data and management controls. Owners can edit product details and deactivate/reactivate products through trusted RPCs; deactivation preserves history and removes products from cashier-facing catalog results. Apply migration `202610160005_manage_products.sql` before use. Never write product rows directly from the browser. Hosted `sync_sale` also rejects inactive products.
- Inventory page: calculate on-hand stock from `inventory_movements`. No low-stock threshold exists in the known products schema, so show that alerts are unavailable. Owners can record one positive opening-stock movement for a product with no movement history and repeated positive restocks through trusted RPCs. Both migrations must be deployed before use; each RPC writes an actor-attributed audit event with its movement. Adjustments and damaged goods remain unavailable. Verify audit policies and hosted function execution before treating either hosted path as complete. Do not display fabricated movement history or claim no-negative-stock enforcement without database validation.
- Sales page: show only store-scoped records and fields actually available in the schema. Keep sales details, payments, receipts, and offline sync states unavailable until their schema and workflows are connected.
- Shift page: show real active-shift/device data only when the read policy and query work. The proposed migration allows shift opening only with `shift.open` and an active registered device; shift closing and cash variance remain unavailable. Do not show a fabricated zero balance.
- Store settings page: expose store editing, account security, and device controls only when their respective authorized flows are implemented.
- POS: keep search and barcode entry prominent, products and cart distinct on wide screens, and a persistent cart summary on mobile.
- Authentication journey: choose **Sign in** or **Create account**. Sign-in asks for email and password, then offers a verified authenticator code (AAL2) or email code (AAL1 fallback). Signup asks for email, password, and password confirmation, then confirms the address with a six-digit code. Existing email-OTP users can set a password through numeric recovery code. Password-only sessions do not enter store operations.
- First-time owner journey: create an email/password account and confirm its email → create the store through `public.create_store_for_current_user(...)`, which writes the store and a `user_store_members` row linking the creator with the `owner` role → authorize the selling device separately → add products/opening stock → open the first shift. The Auth identity lives in `auth.users`; migration `202610160002_create_profiles_on_signup.sql` adds a profile row for new users and backfills existing users, pending verification in the target database. The owner can use authorized management features subject to RLS, SQL grants, and trusted-operation checks. Cashiers use the owner's authorized selling device with role-limited access.
- Offline entry is only for a previously authorized device: explain that offline PIN is separate from online sign-in, show authorization expiry, and require online TOTP or email OTP when its authorization window expires. Target a 72-hour maximum; disclose that remote revocation cannot reach a disconnected device.
- Authentication layout: no sidebar or navbar. Use one centered, compact sign-in surface on a quiet cool-white canvas, with the SariPOS mark, a clear heading, concise supporting copy, and a single-column form. Use a restrained emerald signal and a small, abstract commerce motif as the visual signature; keep inputs and actions dominant. Put account creation behind a clear secondary link. Keep form dimensions stable between modes and feedback states. Do not expose dashboard data before authentication.
- Email signup confirmation and email-code fallback use six-digit, numeric-friendly fields with one-time-code autocomplete, a clear resend action, and stable live feedback without layout shifts. TOTP entry is a separate step after email/password. Email OTP establishes AAL1 and is not bound by Supabase to the preceding password screen; label it as the lower-assurance fallback.
- Role-aware navigation follows store permissions for product, inventory, and shift pages. Owners can add products, open the store shift, and assign verified existing users a built-in or custom role from Store settings. These actions use trusted database functions; the active registered selling device is required to open a shift. Never expose baseline costs or gross profit to cashiers.

### MVP Navigation and Offline States

Use these navigation groups as the page scope grows (see [core-features.md](./core-features.md)):

- **Main:** Dashboard, POS / New Sale, Sales History, Products, Inventory, Shifts.
- **Operations:** Sync Status / Pending Sales, Stock Movement History, Shift History, and Expenses only if included in the MVP build.
- **Administration:** Settings, Device & Security, and access-controlled Audit Log.
- Keep sign-in, second-factor choice/code entry, signup confirmation, and offline unlock outside the authenticated shell. Checkout / Payment is a POS step unless the implementation has a clear reason to use a separate route.

When offline selling is implemented, show connection state and queued-sale count in the owner workspace. Each affected sale must read **Pending sync**, **Synced**, or **Sync failed**; do not make a pending sale look server-confirmed. Give failures a concise reason and retry action. Label cached stock as last known when relevant. Keep cashier navigation role-limited and avoid owner-only sync/financial reporting for cashiers.

The offline queue and status screens are target design requirements, not implemented features until the persistence and trusted synchronization architecture in [tech-stack.md](./tech-stack.md) exists.

## Interaction & Accessibility

- Keep all POS actions at least 48×48 px for touch use.
- Keep catalog table rows compact and single-line; truncate long names or identifiers with a way to inspect the full value, and vertically align each cell with consistent horizontal padding.
- Use visible focus rings, semantic labels, logical keyboard order, and accessible names for icon-only controls.
- Pair color with text or an icon for alerts, selection, and status.
- Keep loading and validation regions dimensionally stable to prevent layout shifts.
- Use an in-app confirmation dialog before consequential writes such as creating or editing products, recording inventory, assigning roles, creating a store, or opening a shift. State the effect plainly and name the action on the confirm button; keep cancel available and make destructive changes visually distinct.
- Show mutation success and errors in a shared, dismissible toast card pinned to the top right, with live announcements. Keep informational page-state explanations in context. Do not use browser alerts or confirmations, and do not add confirmation steps to routine sign-in or one-time-code entry.
- Enabled buttons, selects, inputs, textareas, and button-like controls use a pointer cursor; disabled buttons, inputs, selects, and textareas communicate their unavailable state and use a not-allowed cursor.
- Respect reduced-motion preferences. Motion should explain a user action, not decorate the dashboard.
- Maintain readable contrast across white surfaces and do not depend on hover to reveal prices or actions.
- For authentication, expose form errors through a persistent live region, disable repeat submission while pending, and preserve enough reserved space to avoid content jumps.
- Email OTP errors and resend feedback use a persistent live region; disable repeat submission while pending and preserve enough reserved space to avoid content jumps.
- On sign out or account switch, clear the active user's visible data and in-memory state. Keep queued sales isolated to their originating account/store; explain that the original account must sign back in to resume synchronization.
