# Floorplanify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file static HTML floorplan tool with real-world units, configurable snap, auto-labeled walls, draggable corners, and A4 PDF/PNG export — to the spec in `docs/superpowers/specs/2026-06-04-floorplanify-design.md`.

**Architecture:** Single `floorplanify.html` — vanilla HTML + SVG + JS, no dependencies, no build step. Coordinates stored in cm; the editor zoom and the A4 print are both render-time transforms. State → render → interact.

**Tech Stack:** HTML5, SVG, CSS3, vanilla ES2020+ JS, browser `window.print` for PDF, `canvas.toBlob` for PNG.

**Note on TDD:** the spec calls for manual testing with no test framework. Each "test" step below is a browser verification: open the file, perform the action, observe the expected result. This is the "run the test" step in the TDD template.

---

## File structure

- `C:\Code\Floorplanify\floorplanify.html` — the entire app
- `C:\Code\Floorplanify\.gitignore` — OS / editor junk
- `C:\Code\Floorplanify\docs\superpowers/specs/2026-06-04-floorplanify-design.md` — design spec (already written)
- `C:\Code\Floorplanify\docs/superpowers/plans/2026-06-04-floorplanify.md` — this plan

In round 1 there is exactly **one** source file. Tasks add sections to it incrementally. Each task ends with a commit so the history reads as a clean series of small, reviewable changes.

---

## Task 1: Initialize git, scaffold empty floorplanify.html

**Files:**
- Create: `C:\Code\Floorplanify\.gitignore`
- Create: `C:\Code\Floorplanify\floorplanify.html`

- [ ] **Step 1: Initialize git and configure identity**

```bash
cd C:\Code\Floorplanify
git init
git config user.email "you@example.com"
git config user.name "Your Name"
```

- [ ] **Step 2: Create `.gitignore`**

`C:\Code\Floorplanify\.gitignore`:
```
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp
```

- [ ] **Step 3: Create minimal `floorplanify.html`**

`C:\Code\Floorplanify\floorplanify.html`:
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Floorplanify</title>
</head>
<body>
<h1>Floorplanify</h1>
</body>
</html>
```

- [ ] **Step 4: Verify**

Double-click the file. Expected: browser opens, shows "Floorplanify" heading.

- [ ] **Step 5: Commit**

```bash
git add .gitignore floorplanify.html
git commit -m "chore: scaffold floorplanify.html"
```

---

## Task 2: HTML structure, CSS, and toolbar markup

**Files:**
- Modify: `C:\Code\Floorplanify\floorplanify.html` (replace its full contents)

- [ ] **Step 1: Replace the file with the full HTML shell**

Replace the entire contents of `floorplanify.html` with:
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Floorplanify</title>
<style>
  :root {
    --grid-minor: #e8e8e8;
    --grid-major: #b8b8b8;
    --wall: #111;
    --wall-selected: #2266dd;
    --corner: #2266dd;
    --label: #111;
    --label-halo: #fff;
    --toolbar-bg: #f5f5f5;
    --toolbar-border: #ccc;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; font: 14px/1.4 system-ui, sans-serif; }
  #toolbar {
    position: fixed; top: 8px; left: 8px; z-index: 10;
    background: var(--toolbar-bg);
    border: 1px solid var(--toolbar-border);
    border-radius: 6px;
    padding: 8px;
    display: flex; gap: 8px; align-items: center;
    flex-wrap: wrap; max-width: calc(100vw - 16px);
  }
  #toolbar label { display: flex; gap: 4px; align-items: center; }
  #toolbar input[type="text"] { width: 200px; }
  #canvas-wrap { position: fixed; inset: 0; cursor: crosshair; }
  #canvas { width: 100%; height: 100%; display: block; }

  /* Print: A4 vector PDF */
  @page { size: A4; margin: 0; }
  @media print {
    body { background: white; }
    #toolbar { display: none; }
    #canvas-wrap { position: static; }
    #canvas { width: 21cm; height: 29.7cm; }
    .print-only { display: block; }
  }
  .print-only { display: none; }
  #titleBlock {
    position: fixed; bottom: 0.5cm; left: 0.5cm; right: 0.5cm;
    font-size: 10pt; color: #333;
    border-top: 0.5pt solid #999; padding-top: 4pt;
  }
</style>
</head>
<body>
<div id="toolbar">
  <label>Project <input type="text" id="projectName" value="Untitled floorplan"></label>
  <label>Scale
    <select id="scale">
      <option value="50">1:50</option>
      <option value="100">1:100</option>
      <option value="200">1:200</option>
    </select>
  </label>
  <label>Units
    <select id="units">
      <option value="auto">auto</option>
      <option value="cm">cm</option>
      <option value="m">m</option>
    </select>
  </label>
  <label>Snap
    <select id="snap">
      <option value="1">1 cm</option>
      <option value="5">5 cm</option>
      <option value="10" selected>10 cm</option>
      <option value="50">50 cm</option>
      <option value="100">1 m</option>
    </select>
  </label>
  <label><input type="checkbox" id="showGrid" checked> Grid</label>
  <label><input type="checkbox" id="showLabels" checked> Labels</label>
  <button id="undo">Undo</button>
  <button id="clear">Clear</button>
  <button id="exportPdf">Export PDF</button>
  <button id="exportPng">Export PNG</button>
</div>
<div id="canvas-wrap">
  <svg id="canvas" xmlns="http://www.w3.org/2000/svg"></svg>
</div>
<div class="print-only" id="titleBlock">
  <span id="titleName"></span> &middot; <span id="titleScale"></span> &middot; <span id="titleDate"></span> &middot; Drawn with Floorplanify
</div>
<script>
  // JS will be added in subsequent tasks
</script>
</body>
</html>
```

- [ ] **Step 2: Verify**

Open in a browser. Expected: a fixed toolbar at the top-left, an empty white canvas below, no console errors.

- [ ] **Step 3: Commit**

```bash
git add floorplanify.html
git commit -m "feat: shell — toolbar, canvas, print CSS, title block"
```

---

## Task 3: State, helpers, and the render() function

**Files:**
- Modify: `C:\Code\Floorplanify\floorplanify.html` (replace the `<script>` block)

- [ ] **Step 1: Replace the `<script>` block with state + helpers + render**

Replace `<script>// JS will be added in subsequent tasks</script>` with:
```html
<script>
(function () {
  'use strict';

  // --- state ---
  const state = {
    scale: 50,                      // print scale: 1:N
    units: 'auto',                  // 'auto' | 'cm' | 'm'
    snap: 10,                       // cm: 1, 5, 10, 50, 100
    zoom: 20,                       // editor: pixelsPerCm
    showGrid: true,
    showLabels: true,
    projectName: 'Untitled floorplan',
    walls: [],                      // [{ id, a:{x,y}, b:{x,y} }, ...]
    nextId: 1,
    selection: null,                // { type: 'wall'|'corner', id?, pos? } or null
    inProgress: null,               // { from:{x,y}, to:{x,y} } or null
  };

  // --- pure helpers (testable in console) ---
  function lengthCm(w) { return Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y); }

  function formatLength(cm, units) {
    if (units === 'cm') return Math.round(cm) + ' cm';
    if (units === 'm')  return (cm / 100).toFixed(2).replace(/^0+/, '') + ' m';
    if (cm < 100) return Math.round(cm) + ' cm';
    return (cm / 100).toFixed(2).replace(/^0+/, '') + ' m';
  }

  function snapCm(px, snap) { return Math.round(px / snap) * snap; }

  function pointToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t*dx), p.y - (a.y + t*dy));
  }

  // --- SVG helpers ---
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs) {
    const el = document.createElementNS(SVG_NS, name);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // --- render ---
  function render() {
    const svg = document.getElementById('canvas');
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    if (state.showGrid) renderGrid(svg);
    for (const w of state.walls) renderWall(svg, w, { interactive: true });
    if (state.inProgress) {
      renderWall(svg, { a: state.inProgress.from, b: state.inProgress.to }, { preview: true });
    }
  }

  function renderGrid(svg) {
    const defs = svgEl('defs');
    const minor = state.snap * state.zoom;
    const major = state.snap * 10 * state.zoom;
    const pattern = svgEl('pattern', {
      id: 'cmgrid', width: minor, height: minor, patternUnits: 'userSpaceOnUse',
    });
    const p1 = svgEl('path', { d: `M ${minor} 0 L 0 0 0 ${minor}`, fill: 'none', stroke: 'var(--grid-minor)', 'stroke-width': 1 });
    const p2 = svgEl('path', { d: `M ${major} 0 L 0 0 0 ${major}`, fill: 'none', stroke: 'var(--grid-major)', 'stroke-width': 1.5 });
    pattern.appendChild(p1); pattern.appendChild(p2);
    defs.appendChild(pattern);
    svg.appendChild(defs);
    svg.appendChild(svgEl('rect', {
      x: -100000, y: -100000, width: 200000, height: 200000, fill: 'url(#cmgrid)',
    }));
  }

  function renderWall(svg, w, opts) {
    opts = opts || {};
    const isSelected = !opts.preview && state.selection
      && state.selection.type === 'wall' && state.selection.id === w.id;
    const stroke = isSelected ? 'var(--wall-selected)' : 'var(--wall)';
    const strokeWidth = isSelected ? 4 : 2;
    const lineAttrs = {
      x1: w.a.x * state.zoom, y1: w.a.y * state.zoom,
      x2: w.b.x * state.zoom, y2: w.b.y * state.zoom,
      stroke, 'stroke-width': strokeWidth,
    };
    if (opts.preview) {
      lineAttrs['stroke-dasharray'] = '4 4';
      lineAttrs['pointer-events'] = 'none';
    } else if (opts.interactive) {
      lineAttrs['data-wall-id'] = w.id;
      lineAttrs.class = 'wall';
    }
    svg.appendChild(svgEl('line', lineAttrs));

    if (state.showLabels && !opts.preview) {
      const cm = lengthCm(w);
      if (cm > 0) {
        const mx = (w.a.x + w.b.x) / 2, my = (w.a.y + w.b.y) / 2;
        const dx = w.b.x - w.a.x, dy = w.b.y - w.a.y;
        const len = Math.hypot(dx, dy);
        const px = -dy / len, py = dx / len;
        const offsetCm = 12 / state.zoom;
        const tx = (mx + px * offsetCm) * state.zoom;
        const ty = (my + py * offsetCm) * state.zoom;
        const text = svgEl('text', {
          x: tx, y: ty, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
          'font-size': 12, fill: 'var(--label)',
          stroke: 'var(--label-halo)', 'stroke-width': 3, 'paint-order': 'stroke fill',
          'pointer-events': 'none',
        });
        text.textContent = formatLength(cm, state.units);
        svg.appendChild(text);
      }
    }
  }

  window.__floorplanify = { state, lengthCm, formatLength, snapCm, pointToSegment, render };
})();
</script>
```

- [ ] **Step 2: Verify in the browser console**

Open the file, press F12, run in the console:
```js
__floorplanify.formatLength(420, 'auto')   // "4.20 m"
__floorplanify.formatLength(87,  'auto')   // "87 cm"
__floorplanify.formatLength(420, 'm')      // "4.20 m"
__floorplanify.formatLength(420, 'cm')     // "420 cm"
__floorplanify.snapCm(243, 10)             // 240
__floorplanify.snapCm(247, 10)             // 250
__floorplanify.snapCm(247, 1)              // 247
```
All match.

Then render a sample rectangle:
```js
__floorplanify.state.walls.push({id:'w1', a:{x:0,y:0}, b:{x:420,y:0}});
__floorplanify.state.walls.push({id:'w2', a:{x:420,y:0}, b:{x:420,y:300}});
__floorplanify.state.walls.push({id:'w3', a:{x:420,y:300}, b:{x:0,y:300}});
__floorplanify.state.walls.push({id:'w4', a:{x:0,y:300}, b:{x:0,y:0}});
__floorplanify.render();
```
Expected: a 4.20 m × 3.00 m rectangle appears on a cm-grid with each wall labeled.

- [ ] **Step 3: Commit**

```bash
git add floorplanify.html
git commit -m "feat(state): state object, helpers, render() with grid/walls/labels"
```

---

## Task 4: Click-to-place interaction (start of editing)

**Files:**
- Modify: `C:\Code\Floorplanify\floorplanify.html` (add interaction block before `})();`)

- [ ] **Step 1: Add the mouse and keyboard handlers**

Locate `window.__floorplanify = { state, lengthCm, formatLength, snapCm, pointToSegment, render };` and add the following **immediately before** the `})();` line (i.e. inside the IIFE, after the existing code):
```js
  // --- interaction: click-to-place ---
  function clientToCm(evt) {
    const rect = document.getElementById('canvas').getBoundingClientRect();
    return {
      x: snapCm((evt.clientX - rect.left) / state.zoom, state.snap),
      y: snapCm((evt.clientY - rect.top)  / state.zoom, state.snap),
    };
  }

  const svg = document.getElementById('canvas');

  svg.addEventListener('mousemove', (evt) => {
    if (!state.inProgress) return;
    state.inProgress.to = clientToCm(evt);
    render();
  });

  svg.addEventListener('click', (evt) => {
    const p = clientToCm(evt);
    if (state.selection) state.selection = null;            // clear selection on canvas click
    if (!state.inProgress) {
      state.inProgress = { from: p, to: p };
    } else {
      const w = { id: 'w' + (state.nextId++), a: state.inProgress.from, b: p };
      if (lengthCm(w) > 0) {
        state.walls.push(w);
        state.inProgress = { from: p, to: p };
      }
    }
    render();
  });

  function finishChain() {
    if (state.inProgress) { state.inProgress = null; render(); }
  }
  svg.addEventListener('dblclick', finishChain);
  document.addEventListener('keydown', (evt) => {
    if (evt.target.tagName === 'INPUT' || evt.target.tagName === 'SELECT') return;
    if (evt.key === 'Enter')      finishChain();
    else if (evt.key === 'Escape'){ if (state.inProgress) finishChain(); else if (state.selection) { state.selection = null; render(); } }
  });
```

- [ ] **Step 2: Verify in the browser**

- Click on the canvas: a dashed preview line follows the mouse.
- Move the mouse: the preview follows.
- Click again: a wall is committed; the next preview starts from the new point.
- Press Enter or double-click: in-progress chain is cleared.
- Press Esc: in-progress chain is cleared.

- [ ] **Step 3: Commit**

```bash
git add floorplanify.html
git commit -m "feat(interact): click-to-place, dbl-click/Enter to finish, Esc to cancel"
```

---

## Task 5: Click-to-select walls, Delete to remove

**Files:**
- Modify: `C:\Code\Floorplanify\floorplanify.html` (replace the click handler from Task 4)

- [ ] **Step 1: Replace the click handler with a version that handles selection**

Find the `svg.addEventListener('click', ...)` block added in Task 4 and replace it with:
```js
  function hitWall(p) {
    const tol = 6 / state.zoom;                            // 6 px tolerance
    let best = null, bestD = Infinity;
    for (const w of state.walls) {
      const d = pointToSegment(p, w.a, w.b);
      if (d < tol && d < bestD) { best = w; bestD = d; }
    }
    return best;
  }

  svg.addEventListener('click', (evt) => {
    const p = clientToCm(evt);
    const hit = hitWall(p);
    if (hit) {
      if (state.selection && state.selection.type === 'wall' && state.selection.id === hit.id) {
        state.selection = null;                            // toggle off
      } else {
        state.selection = { type: 'wall', id: hit.id };
        state.inProgress = null;
      }
    } else {
      // empty canvas: extend (or start) a chain
      state.selection = null;
      if (!state.inProgress) {
        state.inProgress = { from: p, to: p };
      } else {
        const w = { id: 'w' + (state.nextId++), a: state.inProgress.from, b: p };
        if (lengthCm(w) > 0) {
          state.walls.push(w);
          state.inProgress = { from: p, to: p };
        }
      }
    }
    render();
  });

  document.addEventListener('keydown', (evt) => {
    if (evt.target.tagName === 'INPUT' || evt.target.tagName === 'SELECT') return;
    if (evt.key === 'Delete' || evt.key === 'Backspace') {
      if (state.selection && state.selection.type === 'wall') {
        state.walls = state.walls.filter(w => w.id !== state.selection.id);
        state.selection = null;
        render();
      }
    }
  });
```

(Keep the `dblclick` and `Enter`/`Escape` handlers from Task 4 — only the `click` handler is replaced.)

- [ ] **Step 2: Verify in the browser**

- Draw a few walls.
- Click a wall: it becomes blue (4 px).
- Click empty canvas: a new chain starts.
- Click the same wall again: it deselects.
- With a wall selected, press Delete: the wall is removed.

- [ ] **Step 3: Commit**

```bash
git add floorplanify.html
git commit -m "feat(interact): click-to-select walls, Delete to remove"
```

---

## Task 6: Drag a corner to move it (both connected walls follow)

**Files:**
- Modify: `C:\Code\Floorplanify\floorplanify.html` (add corner hit-testing, render corners, drag handler)

- [ ] **Step 1: Update `render()` to also draw corner handles**

In the `render()` function, after the `for (const w of state.walls) renderWall(...)` line, add:
```js
    for (const w of state.walls) {
      renderCorner(svg, w.a, w);
      renderCorner(svg, w.b, w);
    }
```

Then add the `renderCorner` function next to `renderWall` (still inside the IIFE, just before the `window.__floorplanify = ...` line):
```js
  function renderCorner(svg, p, w) {
    // Draw a small hit-target rectangle around each corner (only when labels are on, to keep editor clean)
    if (!state.showLabels) return;
    const isSelected = state.selection
      && state.selection.type === 'corner'
      && state.selection.wallId === w.id
      && state.selection.end === (p === w.a ? 'a' : 'b');
    const r = isSelected ? 6 : 4;
    const c = svgEl('circle', {
      cx: p.x * state.zoom, cy: p.y * state.zoom, r,
      fill: isSelected ? 'var(--corner)' : '#fff',
      stroke: 'var(--corner)', 'stroke-width': 1.5,
      'data-corner-wall': w.id,
      'data-corner-end': p === w.a ? 'a' : 'b',
    });
    svg.appendChild(c);
  }
```

- [ ] **Step 2: Add corner hit-testing and drag handler**

Append inside the IIFE (before `})();`):
```js
  function hitCorner(p) {
    const tol = 8 / state.zoom;
    for (const w of state.walls) {
      for (const end of ['a', 'b']) {
        const ep = w[end];
        if (Math.hypot(ep.x - p.x, ep.y - p.y) < tol) {
          return { wall: w, end, pos: { x: ep.x, y: ep.y } };
        }
      }
    }
    return null;
  }

  function findWallsAt(pos) {
    // Walls whose a or b endpoint is at this exact position (round 1 = no T-junctions, max 2 walls)
    return state.walls.filter(w =>
      (w.a.x === pos.x && w.a.y === pos.y) ||
      (w.b.x === pos.x && w.b.y === pos.y)
    );
  }

  let dragCorner = null; // { pos, walls: [{w, end}] }
  svg.addEventListener('mousedown', (evt) => {
    if (evt.button !== 0) return;
    const p = clientToCm(evt);
    const hit = hitCorner(p);
    if (!hit) return;
    state.selection = { type: 'corner', wallId: hit.wall.id, end: hit.end, pos: hit.pos };
    dragCorner = { origPos: { ...hit.pos }, walls: findWallsAt(hit.pos).map(w => ({
      w, end: (w.a.x === hit.pos.x && w.a.y === hit.pos.y) ? 'a' : 'b',
    })) };
    render();
  });
  svg.addEventListener('mousemove', (evt) => {
    if (dragCorner) {
      const p = clientToCm(evt);
      for (const { w, end } of dragCorner.walls) {
        w[end] = { x: p.x, y: p.y };
      }
      render();
    } else if (state.inProgress) {
      state.inProgress.to = clientToCm(evt);
      render();
    }
  });
  document.addEventListener('mouseup', () => { dragCorner = null; });
```

- [ ] **Step 3: Verify in the browser**

- Draw a 4-wall rectangle. White circle dots appear at every corner.
- Click and drag a corner: both connected walls follow; their length labels update live.
- Release: the corner stays.
- Drag an empty area: nothing happens.

- [ ] **Step 4: Commit**

```bash
git add floorplanify.html
git commit -m "feat(interact): drag corner handles, both connected walls follow"
```

---

## Task 7: Undo stack and Clear (with confirm)

**Files:**
- Modify: `C:\Code\Floorplanify\floorplanify.html` (add undo stack; wire Undo and Clear buttons; bind Ctrl+Z)

- [ ] **Step 1: Add the undo stack and snapshot calls**

Add an undo stack at the top of the IIFE (right after the `state` declaration):
```js
  const undoStack = [];
  function snapshot() {
    undoStack.push(JSON.stringify({
      walls: state.walls,
      nextId: state.nextId,
      selection: state.selection,
      inProgress: state.inProgress,
    }));
    if (undoStack.length > 100) undoStack.shift();
  }
```

In the **click** handler (Task 5), at the very top, prepend `snapshot();`.
In the **mousedown** drag handler (Task 6), at the very top, prepend `snapshot();`.
In the **Delete** / **Backspace** keydown handler (Task 5), at the very top, prepend `snapshot();`.

- [ ] **Step 2: Wire Undo, Clear, and Ctrl+Z**

Append inside the IIFE (before `})();`):
```js
  function restore(snap) {
    const s = JSON.parse(snap);
    state.walls = s.walls;
    state.nextId = s.nextId;
    state.selection = s.selection;
    state.inProgress = s.inProgress;
    render();
  }

  document.getElementById('undo').addEventListener('click', () => {
    const last = undoStack.pop();
    if (last) restore(last);
  });

  document.getElementById('clear').addEventListener('click', () => {
    if (state.walls.length === 0) return;
    if (!confirm('Clear the entire floorplan?')) return;
    snapshot();
    state.walls = [];
    state.nextId = 1;
    state.selection = null;
    state.inProgress = null;
    render();
  });

  document.addEventListener('keydown', (evt) => {
    if (evt.target.tagName === 'INPUT' || evt.target.tagName === 'SELECT') return;
    if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'z') {
      evt.preventDefault();
      const last = undoStack.pop();
      if (last) restore(last);
    }
  });
```

- [ ] **Step 3: Verify in the browser**

- Draw 3 walls. Click Undo: 2 walls. Undo: 1 wall. Undo: empty. Draw a wall, select it, Delete: gone. Ctrl+Z: back. Draw a wall, click Clear, OK: empty. Click Clear on empty: no confirm dialog.

- [ ] **Step 4: Commit**

```bash
git add floorplanify.html
git commit -m "feat(edit): undo stack, Clear with confirm, Ctrl+Z binding"
```

---

## Task 8: Wire the toolbar (scale, units, snap, grid, labels, project name)

**Files:**
- Modify: `C:\Code\Floorplanify\floorplanify.html` (add toolbar event handlers)

- [ ] **Step 1: Wire each toolbar control**

Append inside the IIFE (before `})();`):
```js
  document.getElementById('projectName').addEventListener('input', (e) => {
    state.projectName = e.target.value;
  });
  document.getElementById('scale').addEventListener('change', (e) => {
    state.scale = parseInt(e.target.value, 10);
  });
  document.getElementById('units').addEventListener('change', (e) => {
    state.units = e.target.value;
    render();
  });
  document.getElementById('snap').addEventListener('change', (e) => {
    state.snap = parseInt(e.target.value, 10);
    render();
  });
  document.getElementById('showGrid').addEventListener('change', (e) => {
    state.showGrid = e.target.checked;
    render();
  });
  document.getElementById('showLabels').addEventListener('change', (e) => {
    state.showLabels = e.target.checked;
    render();
  });
```

- [ ] **Step 2: Verify in the browser**

- Change Project Name: `__floorplanify.state.projectName` reflects the new value.
- Change Scale: `__floorplanify.state.scale` updates.
- Change Units: labels re-render in the chosen unit.
- Change Snap: grid redraws at the new snap; clicks snap to the new value.
- Toggle Grid: grid appears / disappears.
- Toggle Labels: labels and corner dots appear / disappear.

- [ ] **Step 3: Commit**

```bash
git add floorplanify.html
git commit -m "feat(toolbar): wire project name, scale, units, snap, grid, labels"
```

---

## Task 9: A4 PDF export (window.print + auto-shrink + title block)

**Files:**
- Modify: `C:\Code\Floorplanify\floorplanify.html` (add export helpers and PDF button handler)

- [ ] **Step 1: Add the export helpers and the Export PDF handler**

Append inside the IIFE (before `})();`):
```js
  function boundingBox() {
    if (state.walls.length === 0) return { x: 0, y: 0, w: 1000, h: 800 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const w of state.walls) {
      minX = Math.min(minX, w.a.x, w.b.x);
      minY = Math.min(minY, w.a.y, w.b.y);
      maxX = Math.max(maxX, w.a.x, w.b.x);
      maxY = Math.max(maxY, w.a.y, w.b.y);
    }
    // pad by 1 m so the outermost wall isn't flush with the page edge
    return { x: minX - 100, y: minY - 100, w: (maxX - minX) + 200, h: (maxY - minY) + 200 };
  }

  function autoShrink(bb, pageW, pageH, targetScale) {
    const series = [50, 75, 100, 150, 200];
    let chosen = series[series.length - 1];
    for (const s of series) {
      if (s < targetScale) continue;
      const paperW = bb.w / s, paperH = bb.h / s;
      if (paperW <= pageW - 2 && paperH <= pageH - 2) { chosen = s; break; }
      chosen = s;
    }
    const paperW = bb.w / chosen, paperH = bb.h / chosen;
    return { paperW, paperH, actualScale: chosen };
  }

  function updateTitleBlock(actualScale) {
    document.getElementById('titleName').textContent = state.projectName || 'Untitled';
    document.getElementById('titleScale').textContent =
      'Scale 1:' + actualScale + (actualScale !== state.scale ? ' (auto)' : '');
    document.getElementById('titleDate').textContent = new Date().toISOString().slice(0, 10);
  }

  document.getElementById('exportPdf').addEventListener('click', () => {
    const bb = boundingBox();
    const landscape = bb.w >= bb.h;
    const [pageW, pageH] = landscape ? [29.7, 21] : [21, 29.7];
    const fit = autoShrink(bb, pageW, pageH, state.scale);
    updateTitleBlock(fit.actualScale);

    const svg = document.getElementById('canvas');
    svg.setAttribute('viewBox',
      (bb.x * state.zoom) + ' ' + (bb.y * state.zoom) + ' ' +
      (bb.w * state.zoom) + ' ' + (bb.h * state.zoom));
    svg.style.width  = fit.paperW  + 'cm';
    svg.style.height = fit.paperH  + 'cm';
    svg.style.position = 'absolute';
    svg.style.left = ((pageW - fit.paperW) / 2) + 'cm';
    svg.style.top  = ((pageH - fit.paperH) / 2) + 'cm';

    window.print();

    setTimeout(() => {
      svg.removeAttribute('viewBox');
      svg.style.width = ''; svg.style.height = '';
      svg.style.position = ''; svg.style.left = ''; svg.style.top = '';
    }, 200);
  });
```

- [ ] **Step 2: Verify in the browser**

- Draw a 5 m × 4 m rectangle.
- Click "Export PDF" → print dialog opens → "Save as PDF" → save → open the PDF.
- Expected: a centered floorplan at scale 1:50 on A4, with a title block at the bottom showing the project name, scale, today's date, and "Drawn with Floorplanify".
- Print the PDF and hold a ruler to a wall: it should match the labeled length (4.20 m or 5.00 m).

- [ ] **Step 3: Commit**

```bash
git add floorplanify.html
git commit -m "feat(export): A4 PDF via window.print with auto-shrink and title block"
```

---

## Task 10: A4 PNG export (canvas, 300 DPI)

**Files:**
- Modify: `C:\Code\Floorplanify\floorplanify.html` (add Export PNG handler)

- [ ] **Step 1: Add the Export PNG handler**

Append inside the IIFE (before `})();`):
```js
  function buildPrintSvg(bb) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('viewBox',
      (bb.x * state.zoom) + ' ' + (bb.y * state.zoom) + ' ' +
      (bb.w * state.zoom) + ' ' + (bb.h * state.zoom));

    if (state.showGrid) {
      const defs = document.createElementNS(SVG_NS, 'defs');
      const pattern = document.createElementNS(SVG_NS, 'pattern');
      const minor = state.snap * state.zoom;
      const major = state.snap * 10 * state.zoom;
      pattern.setAttribute('id', 'cmgrid');
      pattern.setAttribute('width', minor);
      pattern.setAttribute('height', minor);
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      const p1 = document.createElementNS(SVG_NS, 'path');
      p1.setAttribute('d', 'M ' + minor + ' 0 L 0 0 0 ' + minor);
      p1.setAttribute('stroke', '#e8e8e8'); p1.setAttribute('fill', 'none');
      const p2 = document.createElementNS(SVG_NS, 'path');
      p2.setAttribute('d', 'M ' + major + ' 0 L 0 0 0 ' + major);
      p2.setAttribute('stroke', '#b8b8b8'); p2.setAttribute('fill', 'none');
      pattern.appendChild(p1); pattern.appendChild(p2);
      defs.appendChild(pattern);
      svg.appendChild(defs);
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', bb.x * state.zoom);
      rect.setAttribute('y', bb.y * state.zoom);
      rect.setAttribute('width',  bb.w * state.zoom);
      rect.setAttribute('height', bb.h * state.zoom);
      rect.setAttribute('fill', 'url(#cmgrid)');
      svg.appendChild(rect);
    }

    for (const w of state.walls) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', w.a.x * state.zoom);
      line.setAttribute('y1', w.a.y * state.zoom);
      line.setAttribute('x2', w.b.x * state.zoom);
      line.setAttribute('y2', w.b.y * state.zoom);
      line.setAttribute('stroke', '#111');
      line.setAttribute('stroke-width', 2);
      svg.appendChild(line);
      if (state.showLabels) {
        const cm = lengthCm(w);
        if (cm > 0) {
          const mx = (w.a.x + w.b.x) / 2, my = (w.a.y + w.b.y) / 2;
          const dx = w.b.x - w.a.x, dy = w.b.y - w.a.y;
          const len = Math.hypot(dx, dy);
          const px = -dy / len, py = dx / len;
          const offsetCm = 12 / state.zoom;
          const text = document.createElementNS(SVG_NS, 'text');
          text.setAttribute('x', (mx + px * offsetCm) * state.zoom);
          text.setAttribute('y', (my + py * offsetCm) * state.zoom);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('font-size', 12);
          text.setAttribute('fill', '#111');
          text.setAttribute('stroke', '#fff');
          text.setAttribute('stroke-width', 3);
          text.setAttribute('paint-order', 'stroke fill');
          text.textContent = formatLength(cm, state.units);
          svg.appendChild(text);
        }
      }
    }
    return svg;
  }

  document.getElementById('exportPng').addEventListener('click', () => {
    const bb = boundingBox();
    const landscape = bb.w >= bb.h;
    const pageW = landscape ? 29.7 : 21;
    const pageH = landscape ? 21   : 29.7;
    const fit = autoShrink(bb, pageW, pageH, state.scale);

    const svg = buildPrintSvg(bb);
    svg.setAttribute('width',  fit.paperW + 'cm');
    svg.setAttribute('height', fit.paperH + 'cm');
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const DPI = 300;
      const cmToInch = 1 / 2.54;
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(pageW * cmToInch * DPI);
      canvas.height = Math.round(pageH * cmToInch * DPI);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img,
        Math.round(((pageW - fit.paperW) / 2) * cmToInch * DPI),
        Math.round(((pageH - fit.paperH) / 2) * cmToInch * DPI),
        Math.round(fit.paperW  * cmToInch * DPI),
        Math.round(fit.paperH  * cmToInch * DPI));
      canvas.toBlob((b) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = (state.projectName || 'floorplan').replace(/[^a-z0-9-_]+/gi, '_') + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = url;
  });
```

- [ ] **Step 2: Verify in the browser**

- Draw a 5 m × 4 m rectangle.
- Click "Export PNG" → a `.png` file downloads (name = `<projectName>.png`).
- Open the PNG: it shows the floorplan centered on a white A4 background at 300 DPI; labels are sharp.

- [ ] **Step 3: Commit**

```bash
git add floorplanify.html
git commit -m "feat(export): A4 PNG export at 300 DPI"
```

---

## Task 11: Manual smoke test (per the spec's test plan)

**Files:**
- Read: `C:\Code\Floorplanify\docs/superpowers/specs/2026-06-04-floorplanify-design.md` (testing section)
- Modify: `C:\Code\Floorplanify\floorplanify.html` (only if any verification step fails)

- [ ] **Step 1: Run the test plan**

For each of the latest 2 versions of Chrome, Firefox, Edge, and Safari:

1. Double-click `floorplanify.html` to open.
2. Click four corners to draw a 5 m × 4 m rectangle (snap = 10 cm).
3. Verify each wall label shows the correct length (`5.00 m` and `4.00 m`).
4. Drag a corner: both connected walls follow; their labels update live.
5. Click a wall: it becomes blue. Press Delete: it's removed.
6. Click Undo: the wall comes back.
7. Toggle Grid: grid appears/disappears.
8. Toggle Labels: labels and corner dots appear/disappear.
9. Change Snap to 1 m: grid redraws, clicks now snap to 1 m.
10. Click "Export PDF" → "Save as PDF" → open the PDF → hold a ruler to a wall: it should match the labeled length at 1:50.
11. Click "Export PNG" → open the PNG: it should be sharp at 100 % zoom.
12. Verify every click snaps to the current snap value.
13. Verify labels don't overlap walls (perpendicular offset, white halo).

- [ ] **Step 2: Triage and fix any failures**

If any step fails, edit `floorplanify.html`, re-test, and commit the fix. Re-run the test plan from Step 1.

- [ ] **Step 3: Final commit (only if changes were made)**

```bash
git add floorplanify.html
git commit -m "chore: smoke test pass"
```

---

## Self-review

**1. Spec coverage:**

| Spec requirement | Task |
|---|---|
| Single floorplan per session | Implied by single-file design |
| Draw orthogonal walls with configurable snap (1/5/10/50/100 cm) | T2 (toolbar) + T4 (click-to-place) + T8 (snap wiring) |
| Each wall labeled with its length (auto cm/m) | T3 (`formatLength` + `renderWall`) |
| Drag corners (snaps to current snap value); both connected walls follow | T6 |
| Delete selected walls | T5 (Delete/Backspace handler) |
| Undo (Ctrl+Z) | T7 |
| Clear (with confirm) | T7 |
| Grid overlay (current snap value minor, 10× major) | T3 (`renderGrid`) + T8 (toggle) |
| Length labels (toggleable) | T3 + T8 |
| A4 PDF export (vector) with auto-shrink | T9 |
| A4 PNG export (300 DPI) | T10 |
| 3 print scales (1:50, 1:100, 1:200) | T9 (toolbar) + T9 (auto-shrink series) |
| Editable project name on title block | T2 (input) + T8 (wiring) + T9 (rendered into title block) |
| Auto-filled date and scale on title block | T9 (`updateTitleBlock`) |

**2. Placeholder scan:** No "TBD" / "TODO" / "fill in later". All code blocks are complete. All verification steps are explicit.

**3. Type / name consistency:**

- State: `scale`, `units`, `snap`, `zoom`, `showGrid`, `showLabels`, `projectName`, `walls`, `nextId`, `selection`, `inProgress` — used identically across all tasks.
- Helpers: `lengthCm(w)`, `formatLength(cm, units)`, `snapCm(px, snap)`, `pointToSegment(p, a, b)`, `clientToCm(evt)`, `hitWall(p)`, `hitCorner(p)`, `boundingBox()`, `autoShrink(bb, pageW, pageH, targetScale)`, `updateTitleBlock(actualScale)`, `buildPrintSvg(bb)`, `snapshot()`, `restore(snap)` — names consistent across tasks.
- DOM IDs: `projectName`, `scale`, `units`, `snap`, `showGrid`, `showLabels`, `undo`, `clear`, `exportPdf`, `exportPng`, `canvas`, `canvas-wrap`, `toolbar`, `titleBlock`, `titleName`, `titleScale`, `titleDate` — defined in T2, used in T7–T10.

**4. Ambiguity check:**

- "Current snap value" = `state.snap` (cm). `snapCm(px, snap)` rounds to the nearest multiple.
- "Auto-shrink series" = `[50, 75, 100, 150, 200]`. The chosen scale is the smallest in the series ≥ the user's chosen scale that fits on A4 (with a 1 cm margin all around).
- "Title block" = `print-only` div populated by `updateTitleBlock()` just before `window.print()`.
- "Drag a corner" = click on a white circle at a wall endpoint; both walls sharing that endpoint move together. (Round 1 supports up to 2 walls per corner; T-junctions with 3+ walls are round 2.)
- "Wall measurement" in the smoke test is checked by printing the PDF and holding a ruler to the printed page.
