# Handoff

Last updated:
- 2026-07-02 by Codex

Current goal:
- Review Yish's recent site/CRM/booking changes and keep the live repo ready for Claude or Codex to continue safely.

Current state:
- What works:
  - Repo is `C:\Dev\yddetailers-site`, remote `https://github.com/yzgershon/yddetailers-site.git`.
  - Recent commits added/restored `booking.html`, left `booking.html.html` as a redirect shim, added `terms.html`, moved heavy inline images into assets, compressed the hero video, and set hours to 8am-8pm.
  - Site links now point to `booking.html`; `booking.html.html` redirects to `booking.html`.
  - TikTok links remain corrected to `https://www.tiktok.com/@yddetailers`.
  - Local Chrome check passed for `index.html`, `booking.html`, `booking.html.html` redirect, `terms.html`, and `/crm/`.
- What is broken:
  - Nothing confirmed after this review.
- What is intentionally unfinished:
  - Codex removed an accidental Claude/Omelette preview injection from `crm/index.html`; this needs commit/push/deploy approval from Yish.

Done this session:
- Checked repo status and recent commits.
- Reviewed booking/terms/hours/link changes.
- Found and removed a production CRM injected preview script from `crm/index.html`.
- Added this handoff file.
- Added shared handoff rules to `C:\Dev\SecondBrain\AGENTS.md` and `C:\Dev\SecondBrain\CLAUDE.md`.
- Verified locally in Chrome:
  - Main page loads with booking links pointing to `booking.html`.
  - `booking.html` renders.
  - `booking.html.html?service=signature#step` redirects to `booking.html?service=signature#step`.
  - `terms.html` renders.
  - `/crm/` renders the sign-in gate without the injected preview script.

Files changed:
- `crm/index.html`
- `HANDOFF.md`
- `C:\Dev\SecondBrain\AGENTS.md`
- `C:\Dev\SecondBrain\CLAUDE.md`
- `C:\Dev\AIOS\HANDOFF.md`

Important context:
- Do not edit stale site copies in `C:\Dev\SecondBrain\Detail Site` or `C:\Dev\Detail Site` unless Yish explicitly targets them.
- CRM is read-only unless Yish explicitly approves saves, deletes, exports, imports, sends, or other side effects.
- Do not push/deploy without explicit approval.

Do not touch yet:
- Firebase/CRM security rules
- Real customer data exports/deletes
- Booking fixes beyond the current review unless Yish asks

Next steps:
1. Commit the CRM cleanup + handoff if not already committed.
2. Ask Yish before pushing/deploying.
3. After deploy, verify live `/crm/` no longer contains the injected script.

How to verify:
- Open local site root.
- Open `/booking.html` and `/booking.html.html`.
- Open `/terms.html`.
- Open `/crm/`.
- Check:
  - No `data-omelette-injected`, `omelette`, or `__om_eval` remains in CRM.
  - Booking page renders.
  - Redirect shim sends old booking URL to `booking.html`.
  - Footer Terms link works.
