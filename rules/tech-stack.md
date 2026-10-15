# Tech Stack & System Architecture: SariPOS

## Core Stack
- **Framework:** Next.js (App Router, TypeScript, React Server Components)
- **Styling:** Tailwind CSS with Lucide React icons
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth with `@supabase/ssr`

## Architecture & Code Conventions
- **Routing:** App Router (`src/app` or `app/`). Server Components default; `use client` only for interactive UI states (cart drawer, keypad, forms).
- **State Management:** React Context or Zustand for local POS cart state before submission.
- **Database Client:**
  - `lib/supabase/client.ts` — Browser client for client components.
  - `lib/supabase/server.ts` — Server client for Server Actions, Server Components, and Route Handlers.
  - `middleware.ts` — Session refresh and route protection via `@supabase/ssr`.

## Database Security & Atomic Execution
- **RPC Checkout:** All sales processing is delegated to `public.sync_sale(p_sale_data jsonb)`.
- **Row Level Security (RLS):** Enabled on all tables (`products`, `sales`, `sale_items`, `profiles`, `audit_logs`).
- **MFA Enforcement:** Middleware and RLS verify `authenticator_assurance_level` (AAL2) for active sessions.