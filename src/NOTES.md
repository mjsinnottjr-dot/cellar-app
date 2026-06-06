# CELLAR APP — Project Notes

**LIVE:** thecellarapp.netlify.app
**CODE:** github.com/mjsinnottjr-dot/cellar-app (`src/App.jsx`, single file)
**STACK:** React + Vite, localStorage persistence, deployed via Netlify auto-build on push

## Workflow
Edit `src/App.jsx` → commit to GitHub → Netlify auto-rebuilds → refresh phone app.
Data saves per-device (no cross-device sync). Backup/Restore buttons on Home move data via .json file.

## Decisions
- Personal tool, **NOT social**. No accounts / feed / followers / notifications.
- Beli-style ranking: pick sentiment bucket → head-to-head compare → 0–10 score (dynamic).
- Cocktail matching is **type-exact** (Dark Rum ≠ Light Rum); separate "bar pantry" for mixers/bitters/citrus.
- Taste characteristics set **during review**, not when adding a bottle.
- Spirits live in "Barrel Room", wine in "Cellar"; cocktails have a recipe book.

## Roadmap
- [ ] Settings + Profile (local, no social)
- [ ] Wave 2: stats dashboard, per-type leaderboards, recommend-my-next-buy
- [ ] Wave 3: cocktail "one ingredient away" + shopping list
- [ ] Wave 5: barcode scan
- [ ] Deferred: share-a-bottle-card as image

## How to resume with Claude
New chat won't remember this project. Start by pasting this file + the current `src/App.jsx`.

Technical gotchas we hit (so we don't relearn them):

Vite 8 / Rolldown crashes in StackBlitz — pinned to vite@^5.4.10 and @vitejs/plugin-react@^4.3.4
localStorage doesn't persist inside Claude's preview (sandbox limit) — only works on the real Netlify/phone build
StackBlitz preview caches aggressively; the source of truth is Netlify after a GitHub push

Conventions baked into the code:

Single-file app, everything in src/App.jsx
localStorage keys are prefixed cc_ (cc_wines, cc_spirits, cc_cocktails, cc_wishlist, cc_infinity, cc_pantry)
Color system is a constant S = {...}; bottle-type colors in WINE_TYPE_COLORS / SPIRIT_TYPE_COLORS

Your preferences (how you like to work):

You're on a PC; iPhone, no Mac
Edit via GitHub pencil or StackBlitz, commit, Netlify auto-deploys
You don't track pour volume (we removed it) — just Sealed/Open
Build in small "waves," confirm each works before the next

If you add those to NOTES.md, then next time you literally paste two things — NOTES.md and App.jsx — and I'm fully caught up.
Two genuinely useful habits going forward, both you've basically got already:

Commit often with short messages — that's your undo history
Back up your data (the ⬇ button) before big changes, so a bad import or reset can't lose your real bottles
