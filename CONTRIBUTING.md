# Contributing to Floorplanify

Thanks for the interest. This is a small, single-file project, so the
contribution loop is intentionally low-friction.

## Ground rules / Grunnreglar

- The whole app lives in one `floorplanify.html`. Please keep it that way.
- No external runtime dependencies. No npm, no bundler, no CDN links.
- The UI is Norwegian. New strings should follow the existing tone.
- The on-screen render and the print/PDF/PNG/SVG export must stay in
  sync visually. If you change geometry, update both renderers.
- Keep edits scoped. One feature or fix per commit.

## Dev loop / Utviklingsloop

1. Open `floorplanify.html` in a browser.
2. Edit, save, refresh.
3. The `window.__floorplanify` global is exposed for poking at state from
   the console.

```js
__floorplanify.addWall({x:0,y:0}, {x:500,y:0}, 'ext');
__floorplanify.state.walls.length;  // sanity check
__floorplanify.zoomFit();
```

## Pull request checklist

- [ ] Manual test in a real browser (Chrome + Firefox at minimum).
- [ ] `Ctrl+S` → reload via `Ctrl+O` round-trips the plan (no data loss).
- [ ] A4 PDF / PNG / SVG export still renders correctly.
- [ ] No console errors or warnings in DevTools.
- [ ] Touched a helper? Expose it on `window.__floorplanify` so it stays
      reachable for console testing.
- [ ] Update `CHANGELOG.md` under `[Unreleased]`.

## File layout / Filstruktur

- `floorplanify.html` — the whole app.
- `docs/` — design spec, implementation plan.
- `.github/` — CI, issue templates.
- `CHANGELOG.md`, `LICENSE`, `README.md`.

## Commit messages / Commit-meldingar

Short imperative subject, ~50 chars max. Body explains why, not what.
Example:

```text
feat(door): add mirror flag so hinge can be on either end

Lets the user put the hinge on the +t side of the opening so the
panel reads as hinged the other way across the wall. Print/export
updated to honor the same flag.
```
