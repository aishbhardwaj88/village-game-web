# Asset budgets

Enforced by `tools/check-budget.js` — run `npm run check-budget` before every commit
that touches `public/assets`.

| Budget | Limit |
|---|---|
| `public/assets/` total size | 40 MB |
| Any single model (`.glb`/`.gltf`) | 5 MB |
| Texture dimensions, general | 1024×1024 (1K) max |
| Texture dimensions, small props (path contains `props/`) | 512×512 max |

Runtime targets (printed by `tools/screenshot.js` from `renderer.info`, not hard-enforced
by the budget script — watch them in every screenshot run):

| Target | Limit |
|---|---|
| Triangles | under 400,000 |
| Draw calls | under 150 |

If a budget is exceeded, `check-budget.js` exits non-zero and lists every offending
file. Fix the asset (resize, `tools/shrink.js`, drop unused maps) rather than raising
the limit.
