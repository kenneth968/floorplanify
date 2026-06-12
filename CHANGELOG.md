# Changelog

All notable changes to Floorplanify are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Right-click to cancel an in-progress wall chain.** No more accidental
  5th wall when you finish drawing 3–4 walls. Right-click during a chain
  snapshots, clears the in-progress state, and shows "Avbrutt kjede."
- **Door hinge on either side of the opening.** New `mirror` flag in the
  opening model; sidebar gets a "Hengslet på" select (start/slutt) so
  doors can swing the way that matches the room layout. Print/PDF/PNG/SVG
  export honor the same flag.
- **Equal-length wall match hint.** When drawing a wall whose length is
  within snap of an existing wall, the existing wall gets a green glow
  and the status bar shows `match: 5.00 m (2 vegger)`. Useful for parallel
  wall runs that should align.
- **Door/window snap to wall endpoints, midpoint, and other openings.** All
  candidate positions are shown as small ticks on the wall when the door
  or window tool is active. The currently-locked target renders larger.
- **Trackpad two-finger pan.** Horizontal scroll on a trackpad (or
  Shift+wheel on a mouse) pans the canvas without zooming.
- **Free-form pan.** The viewBox no longer snaps to canvas aspect ratio
  while the user is panning, so the drawing doesn't jump mid-drag.
- **`?` keyboard shortcut** toggles the help panel.
- **`beforeunload` warning** when there are unsaved changes.
- **Sidebar hover highlight.** Hovering a wall or opening in the canvas
  highlights the matching row in the object sidebar (no re-render).
- **Wall gaps at openings.** Walls are now drawn as segments that
  physically stop at each opening, so the gap is visible on screen and
  in the printed/exported plan.

### Changed
- `drawOpening()` now uses a small hinge dot, 2-line window convention,
  and a 90° arc whose direction follows `swing` AND `mirror`. The
  in-screen render and the print SVG share the same geometry logic.
- `findWallsByLength()` and `snapTOnWall()` exposed as helpers; both
  available via `window.__floorplanify`.

### Migration notes
- Saved JSON files load without changes. Openings without a `mirror` key
  default to `false` (hinge on the start of the opening).
- Sidebar `sections.collapse` preferences stay in `localStorage` under
  `floorplanify.sidebar.v1`.

## [0.5.x] - 2026-06

Earlier development versions. Tagged commits available in git history.

### Added
- Room tool creates boundary walls, snap indicator, live length+angle.
- Export sizing and title block fix.
- Rooms with m², doors/windows, zoom/pan, multi-select, JSON save/load.
- Print-scale-aware export.
- A4 PNG export at 300 DPI.
