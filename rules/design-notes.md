# Design System & UI/UX Guidelines: SariPOS

## Visual Identity & Tone
- **Tone:** Clean, high-contrast, efficient, and intuitive for everyday store operators.
- **Color Palette:**
  - **Primary:** Deep Emerald / Forest Green (`#059669` / `emerald-600`) — signifies commerce, trust, and clarity.
  - **Secondary / Accent:** Warm Amber (`#d97706` / `amber-600`) — used for alerts, low stock indicators, and primary action highlights.
  - **Backgrounds:** Adaptive neutral palette (`zinc-50` light mode / `zinc-900` dark mode).

## Mobile-First & Touch Ergonomics
- **Target Devices:** Smartphones, handheld POS tablets, and desktop browsers.
- **Touch Targets:** Minimum button size of 48x48px for all checkout actions (add to cart, quick increment/decrement, pay button).
- **Cart Access:** On mobile, cart drawer or persistent bottom bar displaying active total and items count.
- **Barcode & Quick Grid:** Support fast visual product selection via quick-category tiles alongside manual search input.

## Skill & Architectural Compliance
- Follow `Frontend Design`, `Vercel React Best Practices`, and `Web Design Guidelines` skills.
- Zero layout shifting (CLS): Use Skeleton loaders for server components and dynamic data fetch states.
- High accessibility (a11y): High contrast text ratios, visible focus rings, and full keyboard navigation support for barcode scanners.