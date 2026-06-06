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
