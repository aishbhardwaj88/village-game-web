# Inbox

Drop files here any time — the game-building session checks this folder every loop
cycle and picks up anything new. Never blocks if it's empty.

## What to drop here

- **Character/prop images** from Gemini (for later Tripo 3D conversion) — any common
  image format (PNG/JPG/WebP).
- **Finished 3D models** from Tripo — `.glb` files, named however you like; the session
  will rename/shrink/place them correctly per `docs/asset-slots.md`.

## What happens next

The session names the file per `docs/asset-slots.md`'s slot table, shrinks it with
`tools/shrink.js`, moves it into `public/assets/models/`, verifies it swaps into the
game correctly, and logs it in `docs/CREDITS.md`. You'll see it marked "used" (with
where it ended up in the game) on the dashboard (`Dopahar dashboard.command`).

## Easiest way to add files

Open the dashboard (double-click `Dopahar dashboard.command` in the repo root) and
drag files onto the upload box — no need to find this folder manually. Dropping files
directly into `inbox/` on disk works too.
