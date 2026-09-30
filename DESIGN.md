# UMak SIC — Design Source of Truth (Non-Negotiable)

> [!IMPORTANT]
> **NON-NEGOTIABLE CHARTER:** This document is the absolute, legally binding design and UX source of truth for the entire UMak SIC repository. All AI agents, contributors, and pull requests MUST strictly adhere to every token, rule, typography constraint, plain language standard, and UX heuristic defined herein. Skipping sections, introducing ad-hoc hex values, using unauthorized fonts/icons, or introducing technical developer jargon into user-facing copy constitutes an automatic pre-flight failure.

---

## 0. Design Read (One-Line Brief)

**Design Read:**
Reading this as: internal admin product for a single UMak SIC administrator, with a high-end and polished language, strictly locked to shadcn/ui + Tailwind v4 + Montserrat + Agrandir display typography + `@phosphor-icons/react`.

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
| **Icon library** | `@phosphor-icons/react` | One family project-wide, strict size/weight tokens |
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

## 6. Icons & Iconography System

| Decision | Value |
|---|---|
| **Library** | `@phosphor-icons/react` (Exclusively) |
| **Default weight** | `regular` (for UI, navigation, table rows), `bold` (for primary action buttons and status pills) |
| **Special weight** | `fill` (reserved exclusively for active favorite/selected markers) |
| **Stroke width** | Managed by Phosphor weight variants. Never override stroke width manually. |

### Size Matrix

| Token | Size | Context & Placement | Example Phosphor Icons |
|---|---|---|---|
| **Micro / Table** | `size={16}` | Table rows, status badges, chip indicators, inline meta | `<Check size={16} />`, `<X size={16} />`, `<Clock size={16} />` |
| **Nav & Input** | `size={18}` | Sidebar navigation items, form input icons, dropdown menu options | `<CalendarBlank size={18} />`, `<Users size={18} />`, `<EnvelopeSimple size={18} />` |
| **Action & Header** | `size={20}` | Primary action buttons, card headers, toolbars, modal trigger buttons | `<Plus size={20} weight="bold" />`, `<QrCode size={20} />`, `<DownloadSimple size={20} />` |
| **Hero & Dialog** | `size={24}` | Modal dialog titles, scanner viewports, empty state graphics | `<Camera size={24} />`, `<WarningCircle size={24} />`, `<FileText size={24} />` |

### Iconography Rules & UX Standards
1. **Never use lone icons for primary actions**: Always pair icons with explicit text labels (e.g. `<Plus size={16} weight="bold" /> Create event`).
2. **Leading vs Trailing Icons**:
   - **Leading icon**: Communicates action intent or noun type (e.g., `<QrCode /> Check In`, `<UploadSimple /> Import CSV`).
   - **Trailing icon**: Communicates hierarchy or navigation continuation (e.g., `View Details <ArrowRight size={14} />`, `Sort <CaretDown size={14} />`).
3. **Accessibility**:
   - Decorative icons accompanying text must have `aria-hidden="true"`.
   - Standalone icon buttons (e.g. close modal, search clear) MUST have an explicit `aria-label` and `title` tooltip.
4. **Strict Library Lock**: Never hand-roll SVG paths. Never mix Phosphor with Lucide, Feather, Heroicons, or Material Icons.

---

## 7. Plain Language & Copy Guidelines (Zero Technical Jargon)

> [!CAUTION]
> **Zero Technical Jargon Policy:** The application is operated by student leaders, university administrators, and faculty. Never expose backend database nomenclature, cloud infrastructure terminology, or API error codes to the user.

### Banned Technical Jargon Lookup Table

| ❌ Banned Technical / Backend Jargon | ✅ Mandatory Plain Language / Operator Term |
|---|---|
| `Mutate attendance tuple / record` | `Mark attendance` / `Check in attendee` |
| `Dispatch SMTP payload / job` | `Send email` / `Send campaign` |
| `R2 Object Blob Storage / Key` | `Uploaded files` / `Asset library` |
| `Worker queue locked by thread` | `Processing email delivery` |
| `RFC 5322 regex validation error` | `Please enter a valid UMak email address` |
| `Query returned 404 / null set` | `No attendees found matching this search` |
| `Idempotency key collision` | `Already checked in` / `Duplicate delivery prevented` |
| `Ingest CSV payload stream` | `Import student list` |
| `Purge schema cache` | `Refresh list` |
| `Clerk auth token expired` | `Session expired. Please sign in again` |
| `Trigger cron retention job` | `Automated 5-year data archiving` |
| `ends_at + 120min threshold` | `Check-in closes 2 hours after event end` |

### Human-Centered Error and Notice Styles
- **Specific & Action-Oriented**: Tell the user what happened and how to fix it immediately (e.g., *"Camera permission was denied. Allow camera access in browser settings, then try again"* rather than *"Hardware stream error: PermissionDenied"*).
- **Constructive Tone**: No scolding or cryptic codes. State clearly: *"1 duplicate skipped because it already exists in this roster."*

---

## 8. UX Best Practices & Interaction Heuristics

All screens and interactions in UMak SIC are built around the Nielsen Norman 10 Usability Heuristics:

1. **Visibility of System Status**:
   - Provide instant visual feedback for all operations: active button loading spinners, batch import progress counts (`2 valid attendees ready to add`), and delivery queue counters (`92/100 sent`).
2. **User Control and Freedom**:
   - Every creation and editing step supports `Save draft` before publishing.
   - Destructive actions (e.g. clearing roster, permanent deletion) require explicit confirmation dialogs.
3. **Error Prevention & Resolution**:
   - Email addresses and student IDs are automatically trimmed and normalized on blur.
   - Ingestion conflicts present an interactive side-by-side diff review screen before changes are committed.
4. **Recognition over Recall**:
   - Search inputs include placeholder examples (`Search name, student ID, or email`).
   - Sticky tab navigation and contextual breadcrumbs keep the operator oriented at all times.
5. **Aesthetic and Minimalist Cockpit Design**:
   - Visual Density is locked to `7` (Cockpit). Layouts prioritize information clarity, high tabular readability, and logical visual groupings over unnecessary decorative whitespace.

---

## 9. Motion & Animation

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

## 10. Theme & Layout Architecture

- **Max content width:** `max-w-[1400px] mx-auto` or `max-w-7xl`
- **App shell:** 2-column grid — fixed sidebar (`bg-ink text-paper`, dark teal always) + fluid content area (`bg-paper`)
- **Viewport stability:** Always `min-h-[100dvh]`, never `h-screen`
- **Grid over flex-math:** Use `grid grid-cols-*` instead of percentage flex-math

---

## 11. App Screens & User Flows Reference

> Structured identically to the 26 mid-fidelity screens in [`app/mid-fid.html`](./app/mid-fid.html), organized into 8 tabbed user flows:

| # | Screen Name | Tab | User Flow Step |
|---|---|---|---|
| 01 | Sign in | Auth & Access | Step 1: Institutional Credentials |
| 02 | Account access & recovery | Auth & Access | Step 2: Session Expiry & Recovery |
| 03 | Overview | Overview | Step 1: Daily Operations Dashboard |
| 04 | Events catalog | Events | Step 1: Lifecycle Directory & Filter |
| 05 | Create event | Events | Step 2: Draft Event in Timezone |
| 06 | Event detail | Events | Step 3: Readiness & Roster Funnel |
| 07 | Live check-in (Desktop) | Live Check-in | Step 1: Real-time Camera Scanner |
| 08 | Mobile check-in | Live Check-in | Step 2: Phone Kiosk Check-in |
| 09 | Camera recovery & errors | Live Check-in | Step 3: Permission & Retry States |
| 10 | Manual ticket code | Live Check-in | Step 4: Rate-limited Fallback Entry |
| 11 | Scan result and export | Live Check-in | Step 5: Duplicate Prevention & CSV Export |
| 12 | Attendee directory | Attendees | Step 1: Global Identity Master List |
| 13 | Import attendees | Attendees | Step 2: CSV Upload & Normalization |
| 14 | Import conflict review | Attendees | Step 3: Side-by-Side Overwrite Diff |
| 15 | Event attendee roster | Attendees | Step 4: Event-specific Roster & Outcomes |
| 16 | Campaign performance | Campaigns & Email | Step 1: Overview & Provider Delivery |
| 17 | Campaign recipients | Campaigns & Email | Step 2: Eligibility & Exclusion Filters |
| 18 | Email composer | Campaigns & Email | Step 3: Markdown & Recipient Tags |
| 19 | Composer assets & test send | Campaigns & Email | Step 4: File Attachments & Test Email |
| 20 | Email preview & QR ticket | Campaigns & Email | Step 5: Recipient Preview Dialog |
| 21 | Delivery queue | Campaigns & Email | Step 6: Mailgun / Brevo Capacity Queue |
| 22 | Delivery diagnostics | Campaigns & Email | Step 7: Per-recipient Logs & Retries |
| 23 | Provider limits & quotas | Campaigns & Email | Step 8: Quota Windows & Contracts |
| 24 | Asset library | Assets | Step 1: File Storage & R2 Browser |
| 25 | Asset policy | Assets | Step 2: Upload Limits & Delete Lock |
| 26 | System settings | System & Admin | Step 1: Auto-close & 5-Year Retention |

---

## 12. Pre-Flight Checklist (Mandatory Non-Negotiable Gate)

Before claiming any task complete or submitting a pull request, every item below MUST be verified:

- [ ] **Design Tokens**: Using only `--ink` / `--cyan` / semantic tokens — zero hardcoded hex values in components.
- [ ] **Typography**: All headings use `font-display` (Agrandir), all body uses `font-sans` (Montserrat). No serif typefaces.
- [ ] **Corner Radius**: Strictly adheres to the 6-tier radius scale (`rounded-[4px]`, `rounded-[6px]`, `rounded-[9px]`, `rounded-[12px]`, `rounded-[16px]`, `rounded-full`).
- [ ] **Icon Library**: Exclusively `@phosphor-icons/react` with strict weight (`regular`/`bold`) and size tokens (`16px`, `18px`, `20px`, `24px`).
- [ ] **Icon Pairing & Accessibility**: Action buttons have icon + label; standalone icon buttons have `aria-label` and `title`.
- [ ] **Zero Technical Jargon**: All user-facing text, tooltips, error notices, and buttons use plain, operator-first language. No raw database, cloud, or worker jargon.
- [ ] **Viewport & Layout**: Always `min-h-[100dvh]`, never `h-screen`. Fixed sidebar is always `bg-ink`.
- [ ] **Motion Safety**: Motion components have `'use client'`, cleanup handlers, and check `useReducedMotion()`.
- [ ] **Punctuation & Copy**: No em-dashes (`—`) in visible user text. Button labels stay on one line on desktop.
- [ ] **Accessibility**: WCAG AA contrast on all interactive buttons, badges, and inputs.