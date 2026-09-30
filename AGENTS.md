# Non-Negotiable Design & UX Charter

`DESIGN.md` and the `design-taste-frontend` skill are **strictly non-negotiable** for all frontend and UI work in this repository. All AI agents, contributors, and reviewers must strictly adhere to these standards without exception:

1. **Strict Design Token & Typography Compliance**:
   - All UI components, layouts, and styles must strictly consume design tokens from `DESIGN.md` (`--ink`, `--cyan`, `--canvas`, `--paper`, `--muted`, and semantic feedback tokens). Never introduce hardcoded hex colors, ad-hoc palette variations, or extraneous font families.
   - Display/Headings must use **Agrandir** (`font-display`), and Body/UI text must use **Montserrat** (`font-sans`). Serif fonts are banned.
   - Adhere strictly to the corner radius scale (`rounded-[4px]`, `rounded-[6px]`, `rounded-[9px]`, `rounded-[12px]`, `rounded-[16px]`, `rounded-full`).

2. **Plain Language & Jargon Prohibition Rule**:
   - **Zero Technical Jargon in UI**: User-facing copy, labels, tooltips, error states, and notices must be written in clear, plain, human-readable English tailored for university student leaders and administrative operators.
   - Never expose raw database entities, API/worker error strings, cloud storage internal terms, or backend mechanics in the interface (e.g. use "Uploaded files" instead of "R2 Object Blobs", "Send email" instead of "Dispatch SMTP Payload", "Check in" instead of "Mutate Attendance Tuple").
   - Follow the **Banned Technical Jargon Table** in `DESIGN.md`.

3. **Iconography & UX Best Practices**:
   - Use exclusively `@phosphor-icons/react`. Never mix icon libraries or hand-craft inline SVG paths.
   - Pair icons with text labels for primary navigation and critical actions. Provide explicit `aria-label`s for icon-only buttons.
   - Follow standard Phosphor weights (`regular` for interface UI, `bold` for CTAs and status pills) and sizing tokens (`16px` for tables/chips, `18px` for nav/inputs, `20px` for header actions, `24px` for modal dialogs/empty states).
   - Adhere to the core UX heuristics outlined in `DESIGN.md` (immediate visual feedback, destructive action confirmations, inline validation on blur, and progressive disclosure).

4. **Pre-Flight Verification**:
   - Before shipping any frontend code or component modifications, the 50+ item pre-flight checklist in `DESIGN.md` must be thoroughly executed and verified.

---

# Pull Request Templates

Before creating or editing a pull request, read `.github/PULL_REQUEST_TEMPLATE.md`
from the intended base branch and use every template section. Mark checkboxes only
for verification actually performed; use `Related issue: #<number>` rather than a
closing keyword when the pull request targets `dev`.

# Pull Request Issue Links

Feature pull requests target `dev`, not the repository's default branch. GitHub
ignores `Closes #<issue>` and similar closing keywords on non-default-base pull
requests, so those keywords neither close nor link the issue.

After creating a feature pull request, manually link its issue in GitHub:

1. Open the pull request.
2. In the right sidebar, open **Development**.
3. Select the related issue and apply the link.

This populates the Project's read-only **Linked pull requests** field. The `gh
pr create` and `gh pr edit` commands do not have a flag for this manual issue
link; `--project` only adds the pull request itself to a Project.
