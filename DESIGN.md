# UMak SIC — Design Source of Truth

> This file is the single source of truth for all design decisions on this project.
> The AI agent reads this before generating any frontend code. Do not skip sections —
> a blank field means the agent will guess, and guessing produces slop.

---

## 0. Design Read (One-Line Brief)

**Design Read:**
Reading this as: internal admin product for a single UMak SIC administrator, with a high-end and polished language, leaning toward shadcn/ui + Tailwind v4 + Monserrat + Agrandir display type.

---

## 1. The Three Dials

| Dial | Value | Scale |
|---|---|---|
| `DESIGN_VARIANCE` | `6` | 1 = Perfect Symmetry → 10 = Artsy Chaos |
| `MOTION_INTENSITY` | `5` | 1 = Static → 10 = Cinematic / Physics |
| `VISUAL_DENSITY` | `7` | 1 = Art Gallery / Airy → 10 = Cockpit / Packed Data |

**Rationale:**
- **Variance 6** : Structured and consistent admin layout. Asymmetry is allowed in component-level details, not in page skeleton.
- **Motion 5** : Moderate: page transitions, skeleton loaders, animated metric counters. No scroll-hijack or GSAP pinning.
- **Density 7** : This is a data-dense admin tool. Tables, metrics, roster rows, delivery queues; the layout serves information, not whitespace.

---

## 2. Design System

| Decision | Choice | Reason |
|---|---|---|
| **Component library** | `shadcn/ui` | Own the code, easy token customization |
| **Styling engine** | Tailwind v4 | Already in project, `@tailwindcss/postcss` wired |
| **Animation** | `motion` (v13.4.4) | Installed. Import from `motion/react` |
| **Icon library** | `@phosphor-icons/react` | One family project-wide, `strokeWidth` standardized |
| **shadcn status** | ⬜ Not yet initialized | Run `npx shadcn@latest init` before adding components |

> **Rule:** One design system per project. Do not mix shadcn/ui with Radix Themes or any other component library.

---

## 3. Typography

### Font Stack

| Role | Font | Source | Variable |
|---|---|---|---|
| **Display / Brand** | Agrandir | Self-hosted OTF (`app/fonts/`) | `--font-agrandir` / `font-display` |
| **UI / Body** | Montserrat | `next/font/google` | `--font-montserrat` / `font-sans` |

### Agrandir Variant Usage

| Variant File | Weight | Style | Use For |
|---|---|---|---|
| `Agrandir-GrandLight.otf` | 300 | normal | Subheadings, secondary labels |
| `Agrandir-Regular.otf` | 400 | normal | Body headings |
| `Agrandir-TextBold.otf` | 700 | normal | Section titles, KPI numerals |
| `Agrandir-GrandHeavy.otf` | 800 | normal | H1 hero headings (e.g. "Good morning", "Welcome back!") |
| `Agrandir-ThinItalic.otf` | 100 | italic | Decorative accent only |
| `Agrandir-WideBlackItalic.otf` | 900 | italic | Brand splash, max 1–2 words |
| `Agrandir-Narrow.otf` | 500 / 600 | normal | Sidebar section headers, compact table headers |
| `Agrandir-Tight.otf` | 700 / 800 | normal | High-density metric numbers, calendar date numerals |

### Montserrat Usage

| Weight | Use |
|---|---|
| 300 | Metadata, timestamps, micro-copy |
| 400 | Body text, table cells |
| 500 | Input labels, nav items |
| 600 | Button labels, panel titles |
| 700 | Strong emphasis, badge text |
| 800 | Sub-metric labels |

### Typography Rules

- `h1`–`h6` and `.font-display` use `font-family: var(--font-display)` (Agrandir). **Wired globally in `globals.css`.**
- All other text defaults to `font-family: var(--font-sans)` (Montserrat). **Wired on `body` in `globals.css`.**
- **Serif is banned** on this project. Do not introduce any serif typeface.
- **Geist and Geist Mono are retired.** Do not re-import them.
- `font-display: swap` on all fonts. Already configured in `lib/fonts.ts`.

### Scale Reference (Tailwind)

| Element | Class |
|---|---|
| Page H1 (greeting, hero) | `text-4xl md:text-5xl tracking-tight leading-tight font-display font-extrabold` |
| Section title | `text-2xl tracking-tight font-display font-bold` |
| Card title / metric | `text-xl font-display font-bold` |
| Body / table cell | `text-sm font-sans` |
| Metadata / timestamp | `text-xs text-muted font-sans font-light` |
| Button label | `text-sm font-sans font-semibold` |

---

## 4. Color Palette

> All tokens are registered as CSS custom properties in `app/globals.css` and exposed to Tailwind v4 via `@theme inline`.

### Brand Colors

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--ink` | `#12333a` | `#f0f7f7` | Primary text, sidebar bg |
| `--muted` | `#607579` | `#96aeb1` | Secondary text, meta labels |
| `--muted-light` | `#8ca3a7` | `#6a8286` | Placeholder text, disabled |
| `--canvas` | `#e8f1f1` | `#0a1c20` | App background |
| `--paper` | `#fbfdfd` | `#0f272c` | Content area background |
| `--card` | `#ffffff` | `#132e34` | Card/panel surfaces |
| `--line` | `#cfe0e0` | `#22434a` | Borders, dividers |
| `--line-subtle` | `#e7eeee` | `#19383e` | Row separators, light rules |

### Accent Color (Cyan — the ONE accent)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--cyan` | `#087f8c` | `#22b8c9` | Primary buttons, active nav, links |
| `--cyan-hover` | `#076d78` | `#1ca1b1` | Button hover state |
| `--cyan-soft` | `#d9f1f0` | `#163e44` | Hero cards, highlighted rows, badge bg |
| `--cyan-muted` | `#e0f3f3` | `#13383e` | Subtle info backgrounds |
| `--cyan-border` | `#aedbd9` | `#235861` | Accent borders |

> **Color Consistency Lock:** Cyan is the **only** accent. No purple, no blue-grey, no teal variants outside this palette. Once cyan is set on a screen, it is used consistently across all interactive and highlighted elements on that screen.

### Semantic Feedback Colors

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--green` | `#176c59` | `#29a388` | Attended / Published / Success |
| `--green-soft` | `#dff1e9` | `#133930` | Success badge background |
| `--amber` | `#9c6016` | `#d98d2b` | Draft / Queued / Warning |
| `--amber-soft` | `#fbf0df` | `#3b2810` | Warning badge background |
| `--red` | `#a43d49` | `#d95d6b` | Absent / Failed / Error |
| `--red-soft` | `#ffe9eb` | `#3d171c` | Error badge background |

### Tailwind Usage

Use the registered theme tokens as Tailwind utilities:

```html
<!-- Text -->
<p class="text-ink">Primary text</p>
<p class="text-muted">Secondary text</p>

<!-- Backgrounds -->
<div class="bg-card border border-line rounded-lg">Panel</div>
<div class="bg-cyan-soft border border-cyan-border">Highlighted</div>

<!-- Buttons -->
<button class="bg-cyan text-white hover:bg-cyan-hover">Primary</button>

<!-- Badges -->
<span class="bg-green-soft text-green">Attended</span>
<span class="bg-amber-soft text-amber">Draft</span>
<span class="bg-red-soft text-red">Failed</span>
```

---

## 5. Corner Radius (Shape System)

> **Rule:** One radius scale, applied consistently everywhere. Mixed systems are a Pre-Flight Fail.

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | `4px` | Micro chips, tiny indicators |
| `--radius-sm` | `6px` | Inputs, selects, small buttons |
| `--radius-md` | `9px` | Metric panels, list items, secondary cards |
| `--radius-lg` | `12px` | Primary cards, modals, screen frames |
| `--radius-xl` | `16px` | Hero cards, large surfaces |
| `--radius-full` | `9999px` | Badges, status pills, avatars |

**Tailwind equivalents to use:** `rounded-[4px]`, `rounded-[6px]`, `rounded-[9px]`, `rounded-[12px]`, `rounded-[16px]`, `rounded-full`

---

## 6. Icons

| Decision | Value |
|---|---|
| **Library** | `@phosphor-icons/react` |
| **Default weight** | `regular` (for UI), `bold` for actions/primary CTAs |
| **Stroke width** | N/A (Phosphor uses weight variants, not strokeWidth) |
| **Size defaults** | `size={16}` for inline/table, `size={18}` for nav, `size={20}` for action buttons |

> **Rule:** Never hand-roll SVG paths. Never mix with Lucide or any other icon family.

---

## 7. Motion

| Decision | Value |
|---|---|
| **Library** | `motion` — import from `motion/react` |
| **MOTION_INTENSITY** | `5` (Moderate) |
| **What gets animated** | Page/route transitions, skeleton loaders, metric counter tick-ups, notification toasts |
| **What stays static** | Data tables, form inputs, sidebar nav items (unless navigating), row-level actions |
| **Physics preset** | `type: "spring", stiffness: 120, damping: 20` |
| **Reduced motion** | All motion above intensity 3 must honor `useReducedMotion()` |

> **Rules:**
> - Never use `window.addEventListener("scroll", ...)` — use `motion/react` `useScroll()` instead.
> - Never drive animation with React `useState` — use `useMotionValue` / `useTransform`.
> - Every `useEffect` animation has a cleanup function (`return () => ctx.revert()` for GSAP, `.stop()` for motion).
> - All animated components are **client leaf components** with `'use client'` at the top.

---

## 8. Theme

| Decision | Value |
|---|---|
| **Strategy** | Both light and dark, driven by `prefers-color-scheme` |
| **Lock** | ONE theme per session. No mid-page section flips. |
| **Implementation** | `@media (prefers-color-scheme: dark)` in `globals.css`. Already wired. |
| **shadcn theme** | Set once in `layout.tsx` when shadcn is initialized. |

---

## 9. Page & Layout Conventions

- **Max content width:** `max-w-[1400px] mx-auto` or `max-w-7xl`
- **App shell:** 2-column grid — fixed sidebar (118px wide per mid-fid, may expand) + fluid content area
- **Sidebar background:** `bg-ink text-paper` (dark teal, always — not affected by light/dark page theme)
- **Content background:** `bg-paper`
- **Breakpoints:** `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`
- **Viewport stability:** Always `min-h-[100dvh]`, never `h-screen`
- **Grid over flex-math:** Use `grid grid-cols-*` instead of percentage flex-math

---

## 10. App Screens Reference

> Based on the mid-fidelity board at [`app/mid-fid.html`](./app/mid-fid.html). These are the 24 screens to implement.

| # | Screen | Section |
|---|---|---|
| 01 | Sign in | Auth |
| 02 | Overview (dashboard) | Events |
| 03 | Event detail | Events |
| 04 | Live check-in (camera scanner) | Events |
| 05 | Campaign delivery status | Campaigns |
| 06 | Attendee roster | Attendees |
| 07 | Email composer | Campaigns |
| 08 | Create event | Events |
| 09 | Import attendees | Attendees |
| 10 | Asset library | Assets |
| 11 | Delivery queue | Campaigns |
| 12 | Scan result and export | Events |
| 13 | Mobile check-in | Events |
| 14 | Import conflict review | Attendees |
| 15 | Email preview | Campaigns |
| 16 | Delivery diagnostics | Campaigns |
| 17 | Asset policy | Assets |
| 18 | System settings | Settings |
| 19 | Camera recovery states | Events |
| 20 | Campaign recipients review | Campaigns |
| 21 | Events list | Events |
| 22 | Attendee directory | Attendees |
| 23 | Composer assets | Campaigns |
| 24 | Manual ticket code | Events |

---

## 11. Things To Fill In

### 11.1 Reference Images / Inspirations

- **Reference 1**: `WEBSITE UI.jpg` — Split-view authentication portal. Left column houses the centered institutional credential access form ("Welcome back! / Enter your details below"), unified email/username inputs, and Google SSO button. Right column features a soft mint canvas (`#E8F8EE` to `#F1FBF5`) with zen administrative vector illustration, real-time floating indicator pill ("Ongoing event / 1,240 Check-ins"), and core organizational thesis: "Manage events, attendance, and event communication."
- **Reference 2**: `WEBSITE UI (1).jpg` — Operational admin dashboard cockpit. Highlights the UMAK SIC CCIS seal header, categorized vertical sidebar, top breadcrumb bar (`Pages / Overview`), 3-card KPI summary header (Upcoming events, Participant Entries, Attendance rate), centralized multi-frequency attendance trend chart, mini monthly calendar grid, and chronological upcoming event action roster with immediate `Check In` and `View` actions.
- **Other references**: Modern university administrative cockpit combining Linear-style high-density tabular mechanics and crisp boundaries with an institutional emerald/cyan visual identity.

### 11.2 Logo Usage Rules

- **Logo file**: `assets/sic_logo.png` / `assets/sic_logo_nobg.png` (UMak SIC CCIS official circular emblem)
- **Sidebar logo size**: `32px` diameter circular avatar container paired with dual-line text locked to `text-xs font-semibold leading-tight`: line 1 `UMAK SIC`, line 2 `CCIS`.
- **Logo treatment in dark sidebar**: Use `assets/sic_logo_nobg.png` enclosed within a subtle white badge container (`bg-white/10 ring-1 ring-white/15 p-0.5 rounded-full`) to ensure optimal contrast of the teal/green seal against `--ink`.
- **Logo treatment on login screen**: Centered at the top of the auth card at `48px` diameter (`size-12`) with full natural colors against the white canvas, positioned directly above the `Welcome back!` H1.

### 11.3 Navigation Labels (Final)

Current mid-fid labels: `Overview`, `Events`, `Attendees`, `Campaigns`, `Assets`

- Confirmed? ☑ **Yes** (Strictly aligned to mid-fid routes and UI categories):
  - **Dashboard**: `Overview`
  - **Event Operations**: `Events`, `Attendees`
  - **Outreach**: `Campaigns`, `Assets`
  - **General**: `Logout` (pinned to bottom sidebar base)

### 11.4 Brand Voice / Copy Register

- **Tone**: Professional, clear, and institutional. Avoid colloquial filler while maintaining an efficient and supportive voice for student leaders and CCIS administrators.
- **Example greeting**: Dynamic time-of-day greeting tied to verified profile data: `"Good day, Joey"` or `"Good morning, Charles"` paired with the contextual subhead `"Here is what needs attention today."`
- **Form error style**: Explicit, direct, and field-focused without punctuation clutter (e.g., `"Enter your UMak student email or ID"` rather than vague statements like `"Invalid input"`).

### 11.5 Agrandir Narrow / Tight Usage

- `Agrandir-Narrow.otf`: Sidebar section category headers (`text-[11px] uppercase tracking-wider font-semibold text-muted`) and dense data table column headers to prevent layout overflow.
- `Agrandir-Tight.otf`: High-density metric values (`text-3xl` or `text-4xl` numerals like `150` and `78%`) and calendar date numerals to ensure crisp vertical rhythm and horizontal economy.

---

## 12. Pre-Flight Checklist (Run Before Every Screen)

The skill has a 50+ item pre-flight. These are the ones most relevant to **this specific project**:

- [ ] Using only `--ink` / `--cyan` / semantic tokens — no hardcoded hex values in components
- [ ] All headings use `font-display` (Agrandir), all body uses `font-sans` (Montserrat)
- [ ] All corners follow the radius scale — no random `rounded-xl` where `rounded-[9px]` is specified
- [ ] Sidebar always `bg-ink`, never affected by light/dark page theme
- [ ] Badge pills always `rounded-full`
- [ ] Icon size matches context (`size={16}` table, `size={18}` nav, `size={20}` actions)
- [ ] No `h-screen` — always `min-h-[100dvh]`
- [ ] All motion components have `'use client'` and cleanup functions
- [ ] `useReducedMotion()` checked before any animation fires
- [ ] No em-dashes (`—`) anywhere in visible text
- [ ] Button labels on one line at desktop, no wrapping
- [ ] WCAG AA contrast on all buttons and form inputs