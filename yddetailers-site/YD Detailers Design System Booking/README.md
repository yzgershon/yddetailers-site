# YD Detailers — Design System

Reverse-engineered design system for the YD Detailers mobile-detailing website and booking flow.

---

## Package contents

| File | What it is |
|---|---|
| `tokens.css` | All design tokens (colors, type, spacing, radii, motion) as CSS variables. Import at the top of any page. |
| `design-system.html` | Single-page reference: tokens + every component in one scrollable doc. |
| `marketing-site.html` | UI kit — full marketing site assembled from tokens. |
| `booking-flow.html` | UI kit — all 5 booking steps on the unified brand. |
| `SKILL.md` | How to use this system. |
| `main-site/`, `booking/` | Original source pages used for extraction. |

---

## Content fundamentals

### Voice
Confident, premium, service-first. Short sentences, clear verbs. The product **comes to you** — the copy does the same.

- **Primary CTA** is always `Reserve Your Spot` (never "Book Now", "Learn More", or "Get Started").
- **Headlines** stack two lines: a plain statement in white, then a short clause in blue. `Premium Mobile Detailing / That Comes to You.`
- **Eyebrows** label every section: 11px bold, +2.5px tracking, UPPERCASE, in brand blue.
- **Body** is informative and unfussy. 15px muted grey. Sentences under ~18 words.
- **Numbers carry authority** — use them in proof bars (`500+`, `4.9★`, `24h`).

### Avoid
- Salesy adjectives ("ultimate", "best-in-class", "transform")
- Emojis in headings or body
- Three-line headlines
- Sentence-case eyebrows — they must be uppercase + tracked

---

## Visual foundations

### Palette
One accent (brand blue `#5b7cfa`), one canvas (pure black `#000`), two surface tiers (`#111118`, `#16161f`), two text tiers (white, `#9ca3b8`). That's it.

Green (`#30c878`) and red (`#e05555`) exist **only** for status — ceramic checkmarks, "them" column in compare, error states. Never decorative.

### Rhythm
- Section vertical padding: **80px** desktop, **48px** mobile
- Page gutter: **40px** desktop, **24px** mobile
- Max content width: **1200px**
- Card inner padding: **24px**
- Buttons are pills (**50px** radius). Cards are **12–16px**. Gallery/hero cards **20px**.

### Type
**Inter** only, weights 300–900. Weight does the work. Tracking rules:
- Display (800): `-1.5px`
- H1 (800): `-0.6px`
- H2 (800): `-0.4px`
- Eyebrow (700): `+2.5px` UPPER
- Body (400): normal tracking, 1.65 line-height

### Motion
- Buttons: **200ms** base transitions; primary lifts `-1px` with a soft-blue `24px` shadow on hover
- Entries fade up **16px** over **800ms** with a stagger
- Slider handle uses **pointer events** (no drag lib) — see `marketing-site.html` footer script

---

## Iconography

- **Style**: Lucide-style line icons, stroke `2.2–2.4`, round caps, round joins.
- **Size**: `14–18px` inline with text, `22–24px` in handles/arrows, `36px+` in confirmation states.
- **Color**: Inherit (`currentColor`). In default state = `--muted`; in active/hover = `--blue`; in success = `--success`.
- **Stars** (`★`) are typographic, not SVG — colored `--blue` for ratings.
- **Checkmarks** in service lists are typographic `✓` in `--blue`.
- **Compare column icons** use green/red filled circles with `✓` / `✕` glyphs — `26px` diameter.

SVG icons used across the kits:
- Chevrons (nav arrows, gallery)
- Clock (service duration)
- Check (confirmation, compare yes)
- Social glyphs (Instagram, Facebook, Google)
- Vehicle silhouettes (sedan, SUV, truck) drawn inline in the booking flow

---

## Known issues (flagged for repair)

1. **Original booking page is off-brand** — uses Rajdhani/Montserrat/DM Mono and a slightly-off blue (`#4f7df3`). The fix lives in `booking-flow.html` (full migration to Inter + `--blue`). Swap the source page to this structure.
2. **Before/After slider on live site has no drag JS** — handle is a static icon. Fix is the pointer+touch handler at the bottom of `marketing-site.html`.
3. **Gallery references missing image paths** — slides have empty `src` attributes. Either embed as base64 or point to real `/images/*.jpg`.

---

## Using the system

```html
<!doctype html>
<link rel="stylesheet" href="tokens.css">
<style>
  .hero h1 { font-size: var(--fs-display); letter-spacing: var(--ls-display); }
  .cta    { background: var(--blue); padding: 16px 36px; border-radius: var(--r-pill); }
</style>
```

All tokens are under `:root` in `tokens.css`. See `SKILL.md` for usage patterns.
