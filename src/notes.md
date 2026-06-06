CELLAR APP — project notes

LIVE: thecellarapp.netlify.app
CODE: github.com/mjsinnottjr-dot/cellar-app (src/App.jsx, single file)
STACK: React + Vite, localStorage persistence, deployed via Netlify auto-build on push

DECISIONS:
- Personal tool, NOT social. No accounts/feed/followers.
- Beli-style ranking: sentiment bucket + head-to-head compare → 0–10 score
- Cocktail matching is type-exact (Dark Rum ≠ Light Rum); bar pantry for mixers
- Taste set during review, not when adding a bottle

ROADMAP:
- Settings + Profile (local)
- Wave 2: stats dashboard, per-type leaderboards, recommend-my-next-buy
- Wave 3: cocktail "one ingredient away" + shopping list
- Wave 5: barcode scan
- Deferred: share-a-bottle-card as image
