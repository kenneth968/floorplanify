# Floorplanify — Design

**Date:** 2026-06-04
**Status:** Draft for review
**Author:** Sisyphus (brainstorming session)
**File:** `C:\Code\Floorplanify\floorplanify.html`

## Purpose

A single static HTML file that lets you draw a floor plan (orthogonal walls) in
real-world units (cm/m), see each wall's length auto-labeled, and export to an
A4-sized PDF or PNG that is **to scale at a chosen print ratio** (1:50, 1:100,
1:200).

Open by double-clicking. No install, no server, no dependencies, no CDN. Works
fully offline. Round 1 has no save/load — the floorplan lives in the page
session only.

## Round 1 scope

### In scope

- Single floorplan per session
- Draw orthogonal walls with **configurable snap** (1 cm / 5 cm / 10 cm / 50 cm / 1 m)
- Each wall labeled with its length (auto cm/m)
- Drag corners to move them (snaps to current snap value)
- Delete selected walls
- Undo (and clear with confirm)
- Grid overlay (current snap value minor, 10× the snap value major, toggleable)
- Length labels (toggleable)
- Export to A4 PDF (vector via browser print) and A4 PNG (300 DPI)
- 3 print scales: 1:50, 1:100, 1:200
- Editable project name on the title block
- Auto-filled date and scale on the title block

### Out of scope (round 2+)

- Doors, windows
- Multi-room / interior walls
- Furniture
- Save/load (localStorage or `.json` file)
- Multi-floor
- Dimensions on both sides / extension lines
- Undo across reloads
- Collaboration / sharing via URL

## Architecture

One self-contained `floorplanify.html` file. Three sections in one document:

1. **HTML** — `<svg id="canvas">` for the floorplan, `<div id="toolbar">` for
   controls.
2. **CSS** — screen layout, plus a `@media print` block that takes over the
   page for A4 export.
3. **JS** — one IIFE, three logical concerns:
   - `state` — the floorplan data (single source of truth)
   - `render` — turns state into SVG DOM (idempotent, called after any state
     change)
   - `interact` — mouse and keyboard handlers

### Tech stack

- HTML5
- SVG (no library)
- CSS3 (no preprocessor)
- Vanilla JavaScript (ES2020+, no framework, no bundler)
- Browser print-to-PDF (built into every modern browser)
- `canvas.toBlob` for PNG export (built into every modern browser)

### Why these choices

- One file, double-click to open, fully offline, easy to email, easy to version
  in git.
- SVG is vector by default, sharp at any zoom.
- Browser print is free vector PDF with no library.

## Data model

All coordinates are stored in **cm** (real-world). The data is scale-
independent: the editor zoom is a render-time `transform: scale(zoom)`, and
the A4 print uses a different transform at the chosen print scale.

```js
state = {
  scale: 50,           // print scale: 1:N (e.g. 50 = 1:50)
  units: 'auto',       // 'auto' | 'cm' | 'm' — label unit
  snap: 10,            // cm: 1, 5, 10, 50, or 100
  zoom: 20,            // editor: pixelsPerCm
  projectName: 'Untitled floorplan',
  walls: [
    { id: 'w1', a: { x: 0,   y: 0   }, b: { x: 420, y: 0   } },  // 4.20 m
    { id: 'w2', a: { x: 420, y: 0   }, b: { x: 420, y: 300 } },  // 3.00 m
  ],
  nextId: 3
}
```

- `walls[i].a` and `walls[i].b` are endpoints in cm.
- `lengthCm(wall) = hypot(b.x - a.x, b.y - a.y)` — derived, never stored.
- Each wall renders one `<line>` and one `<text>` label.
- Snap on click: `Math.round(px / snap) * snap` to the nearest multiple of the
  current snap value (in cm).

### Label formatting

- **Auto unit:** `cm` if `lengthCm < 100`, `m` otherwise.
- **cm format:** e.g. `87 cm` (integer).
- **m format:** e.g. `1.23 m` (two decimal places, leading zero stripped).

## Drawing interaction

| Action | Result |
|---|---|
| Click empty canvas | Start a new wall chain at the snapped click point |
| Move mouse | Live preview wall from last placed corner to current snapped position |
| Click again | Commit the wall; next wall starts from this point |
| Enter or double-click | Finish the chain (stops, no closing required in round 1) |
| Esc or right-click | Cancel the in-progress wall |
| Click a corner | Select it (highlighted) |
| Drag selected corner | Move it (snaps to current snap value); adjacent walls follow |
| Click a wall | Select it (highlighted) |
| Delete or Backspace | Remove the selected wall |
| Click empty space | Deselect |
| Ctrl+Z or Undo button | Pop the last action off the undo stack |
| Clear button | Empty state (with confirm) |

## UI

- **Toolbar** (top-left, fixed): Project name (text input) · Scale selector
  (1:50 / 1:100 / 1:200) · Units (auto / cm / m) · **Snap selector (1 cm / 5 cm
  / 10 cm / 50 cm / 1 m)** · Grid toggle · Labels toggle · Undo · Clear (with
  confirm) · Export PDF · Export PNG.
- **Canvas:** full viewport below toolbar.
- **Grid:** current snap value as minor lines (light gray), 10× the snap value
  as major lines (darker); drawn as an SVG `<pattern>`. So:
  - snap = 1 cm → 1 cm minor, 10 cm major
  - snap = 10 cm → 10 cm minor, 1 m major
  - snap = 1 m → 1 m minor, 10 m major
- **Wall:** 2 px stroke (at default zoom 20) in black.
- **Selected wall:** 4 px stroke in blue.
- **Length label:** at wall midpoint, offset 8 px perpendicular to the wall,
  12 px font, white text-stroke halo for legibility.
- **Cursor:** crosshair on canvas, default on toolbar.

## Export

### A4 PDF (vector)

- Trigger: "Export PDF" button → `window.print()`.
- CSS:
  ```css
  @page { size: A4; margin: 0; }
  @media print {
    #toolbar { display: none; }
    #canvas { /* sized in cm based on bounding box and scale */ }
    /* title block: project name, scale, date, "Drawn with Floorplanify" */
  }
  ```
- The SVG is sized in cm based on the floorplan's bounding box and the chosen
  scale. Example: a 10 m × 8 m room at 1:50 → 20 cm × 16 cm on paper, centered
  on A4 with a print-only title block.
- **Orientation:** pick landscape (29.7 × 21 cm) or portrait (21 × 29.7 cm)
  based on the floorplan's aspect ratio (landscape if `width >= height`).
- **Auto-shrink:** if the floorplan doesn't fit on A4 at the chosen scale, the
  renderer auto-shrinks to the largest scale that fits (e.g. 1:50 → 1:75 → 1:100
  → 1:150 → 1:200), and the title block shows the actual scale used
  (e.g. `Scale 1:75 (auto)`).
- **Vector:** walls, labels, and grid are SVG, so the PDF stays sharp at any
  zoom.
- User saves via the browser's "Save as PDF" / "Print to PDF" — built into
  every modern browser.

### A4 PNG (300 DPI)

- Trigger: "Export PNG" button.
- Steps:
  1. Compute the floorplan's bounding box in cm.
  2. Pick the larger dimension; choose A4 landscape (29.7 × 21 cm) or portrait
     (21 × 29.7 cm) to best fit.
  3. Create a hidden `<canvas>` at 300 DPI (3508 × 2480 px landscape,
     2480 × 3508 px portrait).
  4. Serialize the print-mode SVG to a data URL.
  5. Draw it into the canvas at the right scale.
  6. `canvas.toBlob('image/png')` → trigger download via `<a download>`.
- The PNG is raster, but 300 DPI is enough to print.

### Title block (both exports)

- Project name (editable in toolbar).
- Scale (e.g. `Scale 1:50`).
- Date (auto, `new Date().toISOString().slice(0, 10)`).
- `Drawn with Floorplanify` footer.

## Testing (manual, no framework)

For each of the latest 2 versions of Chrome, Firefox, Edge, and Safari:

1. Open `floorplanify.html` (double-click).
2. Draw a 5 m × 4 m rectangle (4 walls).
3. Verify each wall label shows the correct length.
4. Drag a corner; verify adjacent walls follow and their labels update.
5. Delete a wall; verify it's gone.
6. Undo; verify it's back.
7. Toggle grid on / off.
8. Toggle labels on / off.
9. Click "Export PDF" → "Save as PDF" → open the PDF → print it → hold a ruler
   to a wall → verify it matches the labeled length at 1:50.
10. Click "Export PNG" → open the PNG → verify sharp at 100 % zoom.
11. Verify every click snaps to a whole cm at snap=1 cm, and snaps to the
    selected value at higher snap values (e.g. snap=10 cm → every click lands
    on a 10 cm multiple).
12. Verify the grid redraws to match the snap value.
13. Verify labels don't overlap walls (offset perpendicular to wall, 8 px).

## Browser support

Latest 2 versions of Chrome, Firefox, Edge, Safari. No IE. No mobile-specific
testing in round 1.

## Known limitations (round 1)

- One floorplan per session — refresh the page to start over.
- No save/load — close the page, lose your work.
- No undo across reloads.
- No multi-room.
- No doors, windows, or furniture.
- Manual testing only.
