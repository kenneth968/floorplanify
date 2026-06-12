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
- **Two-tier length-match hint.** Walls within ±10cm of the segment
  being drawn get an orange highlight; walls within snap distance go
  green, so the user can tell "loose match" apart from "on the right
  length."
- **`Q` toggles rectangle mode for the wall and room tools.** In rect
  mode the user clicks the first corner, then the opposite corner, and
  the tool creates 4 walls (wall) or a 4-point room (room). A bold
  dashed preview with a corner marker follows the mouse after the
  first click, the status bar shows "REKTANGEL" while the mode is on,
  and Esc cancels a captured first corner.
- **Right-click quick tool menu.** On bare canvas, the context menu now
  has a "Verktøy" section with Vegg, Rom, Trapp, Dør, Vindu so the
  active tool can be switched without dragging back to the toolbar.

### Changed
- `drawOpening()` now uses a small hinge dot, 2-line window convention,
  and a 90° arc whose direction follows `swing` AND `mirror`. The
  in-screen render and the print SVG share the same geometry logic.
- **Fravelg (sidebar header + context menu) now returns to the select
  tool.** Previously it just cleared the selection while leaving the
  active drawing tool in place; now the cursor leaves wall/room/door
  mode too.
- `findWallsByLength()`, `findWallsAtPoint()`, and `snapTOnWall()` are
  exposed on `window.__floorplanify` for console testing.

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
