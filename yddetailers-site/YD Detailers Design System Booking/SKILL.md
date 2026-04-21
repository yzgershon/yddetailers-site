# YD Detailers — Design System Skill

Guide for using this design system in new work. Read this before designing any new page or prototype for YD Detailers.

---

## Quick start

1. Every HTML file starts with:
   ```html
   <link rel="stylesheet" href="tokens.css">
   ```
2. Use CSS variables from `tokens.css`. **Do not invent new colors, radii, or font sizes.** If a token doesn't exist, add it to `tokens.css` and document it.
3. Reference `marketing-site.html` and `booking-flow.html` for how components are composed.

---

## Golden rules

### 1. One accent color
`--blue` is the only chromatic color. Never add orange, teal, purple, or gradients between arbitrary hues. The only approved gradient is `linear-gradient(135deg, var(--blue), var(--blue-dark))` (logo mark, avatars).

### 2. Black canvas, layered surfaces
- Page background: `--bg` (`#000`)
- First card/surface: `--card` (`#111118`)
- Nested inside a card: `--card2` (`#16161f`)
- Form fields sitting on a card: `--card3` (`#1c1c28`)

Never put a card directly on another card of the same value — always step down one tier.

### 3. Type hierarchy
- Section eyebrow (required for every named section) → H2 → `.bar` (60×4px blue divider) → sub copy
- Display headlines stack on two lines: plain white, then `<span class="blue">blue clause.</span>`
- Body copy is muted grey (`--muted`) at 15px. White body is reserved for the hero lead paragraph.

### 4. Buttons are pills
- Primary: solid `--blue`, white text, `50px` radius, lifts `-1px` with `--shadow-glow` on hover.
- Outline: `rgba(255,255,255,.06)` on a `1.5px` `rgba(255,255,255,.25)` border.
- White: used only on dark imagery (hero, story badge).
- Ghost: text + chevron, gap grows on hover.

Never use sharp-corner buttons. Never use full-color secondary buttons.

### 5. Spacing rhythm
Use the `--sp-*` scale. **80px** between major sections, **48px** inside dense panels, **24px** card padding, **12–16px** grid gaps.

---

## Component inventory

All components live in the two UI kits. Copy the markup + class names; avoid forking styles.

| Component | Where | Notes |
|---|---|---|
| Nav (sticky + blur) | `marketing-site.html` | Fixed 64px height, `rgba(0,0,0,.88)` + `blur(16px)` |
| Hero (video/radial) | `marketing-site.html` | Full viewport, badge + display headline + dual CTA + 3 proof stats |
| Service card | `marketing-site.html` | 3-column grid, optional `.featured` + `.svc-pop` ribbon |
| Before/After slider | `marketing-site.html` | Pointer + touch handler at bottom of file |
| Testimonial | `marketing-site.html` | Huge Georgia `"` mark in top-right, stars, quote, avatar+name |
| Compare table | `marketing-site.html` | YD (blue-wash) vs Them (red-wash) two-column layout |
| Gallery | `marketing-site.html` | Slide + arrow bar + dot pagination |
| Story section | `marketing-site.html` | 2-col image+copy, floating badge overlay on image |
| Footer | `marketing-site.html` | 4 columns: brand+social / Services / Serving / Contact |
| Stepper | `booking-flow.html` | Numbered dots with `.active` and `.done` states |
| Accordion block | `booking-flow.html` | For completed steps above the active one |
| Vehicle picker | `booking-flow.html` | 3-card grid with inline SVG silhouettes |
| Service row | `booking-flow.html` | Horizontal card with price on right + duration metadata |
| Add-on row | `booking-flow.html` | Compact version of service row |
| Calendar | `booking-flow.html` | 7-col grid, `.available / .past / .selected / .empty` |
| Time slots | `booking-flow.html` | 4-col grid (3-col on mobile), `.booked` is struck through |
| Summary box | `booking-flow.html` | Sits on top of form/confirmation; `.total` row uses blue display number |
| Form fields | `booking-flow.html` | `--card` bg, focus flips to `--card2` + blue border |
| Confirmation | `booking-flow.html` | Green check disc, ref code pill, reuses summary box |

---

## When adding a new component

1. **Before drawing pixels**, ask: does this overlap with anything in the kits? Reuse before creating.
2. Build with existing tokens. If you need a new one, add it to `tokens.css` + document it in `README.md`.
3. Add the new component to `design-system.html` with a section label.
4. Add a usage example to one of the UI kits.

---

## Migrating existing pages

The `booking/index.html` source page uses a different type stack and a slightly off blue. To migrate any page to the unified system:

1. Delete local `@import` of Rajdhani/Montserrat/DM Mono fonts.
2. Replace local `:root` variables with `<link rel="stylesheet" href="../tokens.css">`.
3. Rename classes to match the booking-flow kit's vocabulary (`step-dot` → `step-dot`, etc).
4. Re-check spacing: the source page used 18px step padding; unified system uses 20px.
5. Re-check CTA language: any "Book Now" or "Continue ahead" should become `Reserve Your Spot` or `Continue →`.

---

## Responsive breakpoints

- Mobile: `< 700px` — single column, stepper labels hide, grid collapses
- Tablet: `700–900px` — 2-col grids, nav collapses
- Desktop: `900px+` — full layout

Use `clamp()` for all display/heading sizes so they fluidly scale; don't write separate font-size rules per breakpoint.

---

## Accessibility

- All interactive elements have hover AND focus states (currently visible via `border-color` change).
- Minimum body size: **13px**. Minimum tap target: **44px** (buttons are 46–50px by default).
- Contrast: `--muted` on `--bg` clears WCAG AA at 15px+. Don't use `--muted` under 13px.
- Icons get `aria-label` when they're the only content of a button (see nav arrows in `booking-flow.html`).
