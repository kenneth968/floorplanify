<!-- markdownlint-disable -->

# Floorplanify Toolbar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce top-bar clutter by turning Floorplanify into a calmer canvas workspace with a slim project/action bar, a left drawing-tool rail, contextual tool options, compact View/Export menus, and the existing right-side object inspector.

**Architecture:** Keep the no-build single-file app. Preserve existing control IDs and state/event wiring wherever possible, but move the controls into clearer surfaces: `#toolbar` for project/actions, `#toolRail` for drawing modes, `#toolOptionsBar` for active-tool settings, menu flyouts for View/Export, and `#selectionEditor` inside `#objectSidebar`. Add a small menu helper in vanilla JS for `aria-expanded`, outside-click close, and Escape handling.

**Tech Stack:** `floorplanify.html` with vanilla HTML/CSS/JavaScript, plus Node-based smoke tests in `tests/smoke.test.js`.

## Global Constraints

- Keep the app portable: no build step, no framework, no new package dependency.
- Preserve all existing core behavior: drawing, selection, object editing, grid/view toggles, export, print, save/load, undo/redo, keyboard shortcuts, autosave.
- Preserve existing DOM IDs used by current JavaScript and CI: `toolbar`, `canvas`, `objectSidebar`, `statusbar`, `saveJson`, `loadJson`, `exportPdf`, `exportPng`, `exportSvg`.
- Preserve existing control IDs where wiring already exists: `projectName`, `restoreDraft`, `snap`, `wallType`, `stairDir`, `openingWidth`, `ortho`, `angle45`, `showGrid`, `showLabels`, `roomInfo`, `showNorth`, `scale`, `units`, `printFitInfo`, `undo`, `redo`, `clear`, `applyDimensions`, `editLength`, `editWidth`, `editHeight`.
- The toolbar must not wrap into a tall command wall on desktop; overflow belongs in menus or responsive rail behavior.
- Tool buttons must remain usable by pointer and keyboard, expose `aria-pressed`, and keep shortcut hints in `title`.
- Menus must close on Escape, outside click, and when another chrome menu opens.
- Print mode must hide `#toolbar`, `#toolOptionsBar`, `#toolRail`, `#statusbar`, `#help`, `#contextMenu`, `#objectSidebar`, and `#print-container` exactly as appropriate.
- Norwegian UI copy remains Norwegian. Use HTML entities if editing through ASCII-only tooling.
- Keep visual style restrained and work-focused; no landing page, hero, decorative orbs, or visual theme detour.

---

## File Structure

- Modify: `C:\Users\kenne\Documents\floorplanify\tests\smoke.test.js`
  - Adds structural regression coverage for the new chrome landmarks and preserved IDs.
- Modify: `C:\Users\kenne\Documents\floorplanify\floorplanify.html`
  - CSS: replaces toolbar/group styling with chrome, rail, contextual options, menu, and responsive rules.
  - Markup: moves tool buttons from `#toolbar` into `#toolRail`; moves drawing options into `#toolOptionsBar`; moves view/export controls into menus; moves `#selectionEditor` into `#objectSidebar`.
  - JavaScript: adds menu behavior helpers while leaving existing control event listeners intact.
- Modify: `C:\Users\kenne\Documents\floorplanify\README.md`
  - Updates "toolbar" wording to "tool rail" where the user switches drawing tools.

---

### Task 1: Lock The Chrome Target With Smoke Tests

**Files:**
- Modify: `C:\Users\kenne\Documents\floorplanify\tests\smoke.test.js`

**Interfaces:**
- Consumes: raw `floorplanify.html` string already loaded as `html`.
- Produces: smoke-test expectations for `#toolRail`, `#toolOptionsBar`, `#viewMenu`, `#exportMenu`, and sidebar placement of `#selectionEditor`.

- [ ] **Step 1: Add structural helpers after `requireNoMatch`**

```js
function htmlBetween(startNeedle, endNeedle) {
  const start = html.indexOf(startNeedle);
  assert.notStrictEqual(start, -1, `${startNeedle} should exist`);
  const end = html.indexOf(endNeedle, start + startNeedle.length);
  assert.notStrictEqual(end, -1, `${endNeedle} should exist after ${startNeedle}`);
  return html.slice(start, end);
}
```

- [ ] **Step 2: Add chrome structure assertions before `console.log('smoke tests passed');`**

```js
requireMatch(
  /id="toolRail"[\s\S]*data-tool="select"[\s\S]*data-tool="wall"[\s\S]*data-tool="room"[\s\S]*data-tool="mark"[\s\S]*data-tool="stair"[\s\S]*data-tool="door"[\s\S]*data-tool="window"[\s\S]*data-tool="pan"[\s\S]*data-tool="measure"/,
  'primary drawing tools should live together in the left tool rail'
);

requireMatch(
  /id="toolOptionsBar"[\s\S]*id="snap"[\s\S]*id="wallType"[\s\S]*id="stairDir"[\s\S]*id="openingWidth"[\s\S]*id="ortho"[\s\S]*id="angle45"/,
  'drawing options should live in the contextual tool options bar'
);

requireMatch(
  /id="viewMenuButton"[\s\S]*aria-controls="viewMenu"[\s\S]*id="viewMenu"[\s\S]*id="showGrid"[\s\S]*id="showLabels"[\s\S]*id="roomInfo"[\s\S]*id="showNorth"[\s\S]*id="zoomFit"[\s\S]*id="zoom100"/,
  'view controls should be grouped in a compact View menu'
);

requireMatch(
  /id="exportMenuButton"[\s\S]*aria-controls="exportMenu"[\s\S]*id="exportMenu"[\s\S]*id="scale"[\s\S]*id="units"[\s\S]*id="exportPdf"[\s\S]*id="exportPng"[\s\S]*id="exportSvg"[\s\S]*id="printFitInfo"/,
  'print scale, units, export commands, and fit status should be grouped in the Export menu'
);

requireMatch(
  /id="objectSidebar"[\s\S]*id="selectionEditor"[\s\S]*id="objectList"/,
  'selection dimensions editor should live in the object sidebar instead of the top chrome'
);

const topToolbarSource = htmlBetween('<div id="toolbar"', '<div id="toolOptionsBar"');
assert.doesNotMatch(
  topToolbarSource,
  /data-tool="/,
  'top toolbar should not contain drawing tool buttons after the redesign'
);
```

- [ ] **Step 3: Run the smoke test and confirm it fails before implementation**

Run:

```powershell
node tests\smoke.test.js
```

Expected: FAIL with an assertion mentioning `primary drawing tools should live together in the left tool rail`.

- [ ] **Step 4: Commit the failing target tests**

```powershell
git add tests\smoke.test.js
git commit -m "Guard the toolbar redesign target

Constraint: Floorplanify has smoke-test coverage, no browser test harness, and no build step
Confidence: high
Scope-risk: narrow
Directive: Keep the new chrome landmark ids stable during the implementation
Tested: node tests\smoke.test.js fails before implementation with the expected missing toolRail assertion
Not-tested: Browser layout"
```

---

### Task 2: Refactor The Markup Into Distinct Work Surfaces

**Files:**
- Modify: `C:\Users\kenne\Documents\floorplanify\floorplanify.html`

**Interfaces:**
- Consumes: existing control IDs and event listeners.
- Produces: `#toolbar`, `#toolOptionsBar`, `#toolRail`, `#viewMenuButton`, `#viewMenu`, `#exportMenuButton`, `#exportMenu`, and `#selectionEditor` in their new locations.

- [ ] **Step 1: Replace the current `#toolbar` markup with slim app chrome**

Replace the block from `<div id="toolbar">` through the closing `</div>` immediately before `<div id="workspace">` with this structure. Preserve the hidden `#loadJsonInput`.

```html
<div id="toolbar" class="app-chrome" role="toolbar" aria-label="Prosjekt og eksport">
  <div class="chrome-section project-section">
    <input type="text" id="projectName" value="Uten navn" title="Prosjektnavn" aria-label="Prosjektnavn">
    <button id="saveJson" type="button" title="Lagre plantegningen som JSON">Lagre</button>
    <button id="loadJson" type="button" title="Last inn plantegning fra JSON">Last inn</button>
    <button id="restoreDraft" type="button" title="Gjenopprett automatisk lagret utkast" hidden>Gjenopprett</button>
    <input type="file" id="loadJsonInput" accept="application/json" style="display:none">
  </div>

  <div class="chrome-section edit-section" aria-label="Rediger">
    <button id="undo" type="button" title="Angre (Ctrl+Z)" aria-label="Angre">&#8630;</button>
    <button id="redo" type="button" title="Gj&oslash;r om (Ctrl+Y)" aria-label="Gj&oslash;r om">&#8631;</button>
  </div>

  <div class="chrome-spacer"></div>

  <div class="chrome-menu-wrap">
    <button id="viewMenuButton" class="menu-button" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="viewMenu">Vis</button>
    <div id="viewMenu" class="chrome-menu" role="group" aria-labelledby="viewMenuButton" hidden>
      <label><input type="checkbox" id="showGrid" checked> Rutenett</label>
      <label><input type="checkbox" id="showLabels" checked> Veggm&aring;l</label>
      <label>Rommerking
        <select id="roomInfo" title="Hva som vises inne i definerte rom">
          <option value="both" selected>areal + lengder</option>
          <option value="area">kun areal</option>
          <option value="lengths">kun lengder</option>
          <option value="off">av</option>
        </select>
      </label>
      <label><input type="checkbox" id="showNorth" checked> Nordpil</label>
      <div class="menu-row compact">
        <button id="zoomFit" type="button" title="Tilpass visning (F)">Tilpass</button>
        <button id="zoomIn" type="button" title="Zoom inn (+)">+</button>
        <button id="zoomOut" type="button" title="Zoom ut (-)">&#8722;</button>
        <button id="zoom100" type="button" title="Faktisk st&oslash;rrelse 1:1 skjermpiksler per cm">1:1</button>
      </div>
    </div>
  </div>

  <div class="chrome-menu-wrap">
    <button id="exportMenuButton" class="menu-button primary-menu" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="exportMenu">Eksporter</button>
    <div id="exportMenu" class="chrome-menu export-menu" role="group" aria-labelledby="exportMenuButton" hidden>
      <label>M&aring;lestokk
        <select id="scale" title="Tilpass A4 automatisk, eller l&aring;s en standardm&aring;lestokk">
          <option value="0" selected>Tilpass A4</option>
          <option value="50">1:50</option>
          <option value="100">1:100</option>
          <option value="200">1:200</option>
        </select>
      </label>
      <label>Enhet
        <select id="units" title="Enhet for m&aring;l">
          <option value="auto" selected>auto</option>
          <option value="cm">cm</option>
          <option value="m">m</option>
        </select>
      </label>
      <div class="menu-row compact">
        <button id="exportPdf" type="button" title="Eksporter A4 PDF / skriv ut (vektor)">PDF</button>
        <button id="exportPng" type="button" title="Eksporter A4 PNG (300 DPI)">PNG</button>
        <button id="exportSvg" type="button" title="Eksporter A4 SVG (vektor)">SVG</button>
      </div>
      <span id="printFitInfo" class="print-fit-info" title="A4-eksport bruker et fast 2 cm infofelt nederst">A4: tegn f&oslash;rst</span>
    </div>
  </div>

  <button id="clear" class="danger" type="button" title="T&oslash;m alt">T&oslash;m</button>
</div>

<div id="toolOptionsBar" role="toolbar" aria-label="Verkt&oslash;yvalg">
  <label>Rutenett
    <select id="snap" title="Fest til rutenett (cm)">
      <option value="1">1 cm</option>
      <option value="5">5 cm</option>
      <option value="10" selected>10 cm</option>
      <option value="25">25 cm</option>
      <option value="50">50 cm</option>
      <option value="100">1 m</option>
    </select>
  </label>
  <label id="wallTypeWrap" title="Yttervegg blir tykk og heltrukken. Innervegg blir tynn og stiplet.">Nye vegger
    <select id="wallType">
      <option value="ext" selected>Yttervegg (tykk)</option>
      <option value="part">Innervegg (stiplet)</option>
    </select>
  </label>
  <label id="stairDirWrap" title="Retning for nye trapper">Trapp
    <select id="stairDir">
      <option value="up" selected>Opp</option>
      <option value="down">Ned</option>
    </select>
  </label>
  <label id="openingWidthWrap" title="Bredde for nye d&oslash;rer og vinduer">
    <span id="openingWidthLabel">&Aring;pning B</span>
    <input type="number" id="openingWidth" min="10" step="10" inputmode="decimal" value="90">
  </label>
  <label id="orthoWrap" title="Hold nye vegger, romkanter og hj&oslash;rneflytting vannrette eller loddrette"><input type="checkbox" id="ortho" checked> Tving 90&deg;</label>
  <label id="angle45Wrap" title="Begrens nye linjer til 0&deg;, 45&deg; eller 90&deg;. Hold Alt mens du tegner."><input type="checkbox" id="angle45"> 45&deg;</label>
</div>
```

- [ ] **Step 2: Insert the left tool rail as the first child of `#workspace`**

Inside `<div id="workspace">`, before `<div id="canvas-wrap">`, add:

```html
  <nav id="toolRail" aria-label="Tegneverkt&oslash;y">
    <button class="tool-btn" type="button" data-tool="select" title="Velg / flytt (V)" aria-label="Velg-verkt&oslash;y"><span class="tool-icon">&#8598;</span><span class="tool-text">Velg</span></button>
    <button class="tool-btn" type="button" data-tool="wall" title="Tegn vegg (W)" aria-label="Vegg-verkt&oslash;y"><span class="tool-icon">&#9634;</span><span class="tool-text">Vegg</span></button>
    <button class="tool-btn" type="button" data-tool="room" title="Dra et rektangul&aelig;rt rom, eller klikk hj&oslash;rner (R)" aria-label="Romboks-verkt&oslash;y"><span class="tool-icon">&#9635;</span><span class="tool-text">Romboks</span></button>
    <button class="tool-btn" type="button" data-tool="mark" title="Klikk inne i en lukket veggsl&oslash;yfe for &aring; opprette rommerking (K)" aria-label="Definer rom-verkt&oslash;y"><span class="tool-icon">&#9636;</span><span class="tool-text">Definer rom</span></button>
    <button class="tool-btn" type="button" data-tool="stair" title="Dra for &aring; markere trappeareal (S)" aria-label="Trapp-verkt&oslash;y"><span class="tool-icon">&#8645;</span><span class="tool-text">Trapp</span></button>
    <button class="tool-btn" type="button" data-tool="door" title="Plasser d&oslash;r p&aring; vegg (D)" aria-label="D&oslash;r-verkt&oslash;y"><span class="tool-icon">&#8976;</span><span class="tool-text">D&oslash;r</span></button>
    <button class="tool-btn" type="button" data-tool="window" title="Plasser vindu p&aring; vegg (N)" aria-label="Vindu-verkt&oslash;y"><span class="tool-icon">&#9707;</span><span class="tool-text">Vindu</span></button>
    <button class="tool-btn" type="button" data-tool="pan" title="Panorer (H eller hold mellomrom)" aria-label="Panorer-verkt&oslash;y"><span class="tool-icon">&#10021;</span><span class="tool-text">Panorer</span></button>
    <button class="tool-btn" type="button" data-tool="measure" title="M&aring;l avstand (M)" aria-label="M&aring;leverkt&oslash;y"><span class="tool-icon">&#10236;</span><span class="tool-text">M&aring;l</span></button>
  </nav>
```

- [ ] **Step 3: Move `#selectionEditor` into the object sidebar**

Inside `<aside id="objectSidebar">`, place this block after `.sidebar-head` and before `<div id="objectList" class="object-list"></div>`.

```html
    <div class="selection-panel" id="selectionEditor" hidden>
      <span class="selection-title" id="selectionEditorTitle">Valgt</span>
      <label id="editLengthWrap"><span id="editLengthLabel">Lengde</span> <input type="number" id="editLength" min="0" step="10" inputmode="decimal" title="Valgt vegglengde i cm"></label>
      <label id="editWidthWrap"><span id="editWidthLabel">Bredde</span> <input type="number" id="editWidth" min="0" step="10" inputmode="decimal" title="Valgt bredde i cm"></label>
      <label id="editHeightWrap"><span id="editHeightLabel">H&oslash;yde</span> <input type="number" id="editHeight" min="0" step="10" inputmode="decimal" title="Valgt h&oslash;yde i cm"></label>
      <button id="applyDimensions" type="button" title="Bruk valgte m&aring;l">Bruk</button>
    </div>
```

- [ ] **Step 4: Run tests and confirm Task 1 is still failing because CSS/JS is not done**

Run:

```powershell
node tests\smoke.test.js
```

Expected: PASS for structure-only assertions if the markup is complete; existing app may still need CSS/JS before manual browser QA.

- [ ] **Step 5: Commit the markup refactor**

```powershell
git add floorplanify.html
git commit -m "Separate Floorplanify commands into clearer surfaces

Constraint: Existing JavaScript wiring is id-based, so moved controls must keep their current ids
Rejected: Rebuilding the UI with a framework | The repo is intentionally a single portable HTML file
Confidence: medium
Scope-risk: moderate
Directive: Keep drawing modes in toolRail and keep top toolbar free of data-tool buttons
Tested: node tests\smoke.test.js
Not-tested: Browser layout and menu behavior"
```

---

### Task 3: Add The Chrome, Rail, Menu, And Responsive CSS

**Files:**
- Modify: `C:\Users\kenne\Documents\floorplanify\floorplanify.html`

**Interfaces:**
- Consumes: Task 2 markup landmarks.
- Produces: desktop layout, mobile layout, menu styling, selection panel styling, and updated print hiding.

- [ ] **Step 1: Replace old toolbar/group styles with app chrome styles**

Replace the current `#toolbar`, `#toolbar .group`, `#toolbar .group-title`, `#toolbar label`, `#toolbar input[type="text"]`, `#toolbar input[type="number"]`, `#toolbar select, #toolbar button`, button states, `.print-fit-info`, and `.tool-btn` rules near the top of the stylesheet with this block. Keep the existing color variables.

```css
  #toolbar,
  #toolOptionsBar {
    background: var(--toolbar-bg);
    border-bottom: 1px solid var(--toolbar-border);
    flex-shrink: 0;
    z-index: 4;
  }
  #toolbar {
    min-height: 46px;
    padding: 7px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 1px 0 rgba(17, 24, 39, 0.04), 0 8px 22px rgba(17, 24, 39, 0.08);
  }
  #toolOptionsBar {
    min-height: 38px;
    padding: 5px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
  }
  .chrome-section,
  .menu-row,
  #toolOptionsBar label,
  .chrome-menu label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .project-section { min-width: 0; }
  .edit-section { padding-left: 4px; border-left: 1px solid var(--toolbar-border); }
  .chrome-spacer { flex: 1 1 auto; min-width: 12px; }
  #toolbar input[type="text"] {
    width: clamp(140px, 22vw, 240px);
    padding: 6px 8px;
    border: 1px solid #c9d1dc;
    border-radius: 6px;
    background: #fff;
    font: inherit;
  }
  #toolbar input[type="number"],
  #toolOptionsBar input[type="number"],
  .chrome-menu input[type="number"] {
    width: 74px;
    padding: 5px 7px;
    border: 1px solid #c9d1dc;
    border-radius: 6px;
    background: #fff;
    font: inherit;
  }
  #toolbar select,
  #toolbar button,
  #toolOptionsBar select,
  #toolOptionsBar button,
  .chrome-menu select,
  .chrome-menu button,
  .selection-panel button {
    min-height: 30px;
    padding: 5px 9px;
    border: 1px solid #c9d1dc;
    border-radius: 6px;
    background: #fff;
    color: #1f2937;
    cursor: pointer;
    font: inherit;
  }
  #toolbar button,
  #toolOptionsBar button,
  .chrome-menu button,
  .selection-panel button { background: #f8fafc; }
  #toolbar button:hover,
  #toolOptionsBar button:hover,
  .chrome-menu button:hover,
  .selection-panel button:hover { background: var(--accent-soft); border-color: var(--accent); }
  #toolbar button:disabled,
  #toolbar select:disabled,
  #toolbar input:disabled,
  #toolOptionsBar button:disabled,
  #toolOptionsBar select:disabled,
  #toolOptionsBar input:disabled,
  .chrome-menu button:disabled,
  .chrome-menu select:disabled,
  .chrome-menu input:disabled,
  .selection-panel button:disabled,
  .selection-panel input:disabled {
    opacity: 0.48;
    cursor: not-allowed;
  }
  #toolbar button:focus-visible,
  #toolbar input:focus-visible,
  #toolbar select:focus-visible,
  #toolOptionsBar button:focus-visible,
  #toolOptionsBar input:focus-visible,
  #toolOptionsBar select:focus-visible,
  #toolRail button:focus-visible,
  .chrome-menu button:focus-visible,
  .chrome-menu input:focus-visible,
  .chrome-menu select:focus-visible,
  .selection-panel button:focus-visible,
  .selection-panel input:focus-visible {
    outline: 2px solid rgba(31, 111, 235, 0.35);
    outline-offset: 1px;
  }
  #toolbar button.danger { color: var(--danger); }
```

- [ ] **Step 2: Add menu and export status styles**

```css
  .chrome-menu-wrap { position: relative; }
  .menu-button[aria-expanded="true"],
  .primary-menu {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }
  .chrome-menu {
    position: absolute;
    top: calc(100% + 7px);
    right: 0;
    min-width: 230px;
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--toolbar-border);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
    z-index: 30;
  }
  .chrome-menu[hidden] { display: none; }
  .chrome-menu label {
    justify-content: space-between;
    color: #344054;
  }
  .menu-row.compact { justify-content: flex-start; flex-wrap: wrap; }
  .export-menu { min-width: 250px; }
  .print-fit-info {
    display: inline-flex;
    align-items: center;
    max-width: 220px;
    min-height: 30px;
    padding: 4px 7px;
    border: 1px solid #dbe1e8;
    border-radius: 6px;
    background: #f8fafc;
    color: #475467;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .print-fit-info.warn {
    border-color: #f2c66d;
    background: #fff7e6;
    color: #7a4d00;
  }
```

- [ ] **Step 3: Add tool rail styles**

```css
  #toolRail {
    flex: 0 0 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 8px 6px;
    border-right: 1px solid var(--toolbar-border);
    background: #fff;
    box-shadow: 8px 0 18px rgba(17, 24, 39, 0.05);
    overflow-y: auto;
    z-index: 3;
  }
  #toolRail .tool-btn {
    width: 42px;
    min-height: 42px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 4px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: #1f2937;
    cursor: pointer;
    font: inherit;
  }
  #toolRail .tool-btn:hover { background: var(--accent-soft); border-color: #c6d8fb; }
  #toolRail .tool-btn.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18);
  }
  .tool-icon { width: 1.15em; text-align: center; font-size: 15px; line-height: 1; }
  .tool-text {
    max-width: 38px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 9px;
    line-height: 1.05;
  }
```

- [ ] **Step 4: Add selection panel styles**

```css
  .selection-panel {
    display: grid;
    gap: 8px;
    padding: 10px;
    border-bottom: 1px solid var(--toolbar-border);
    background: #f8fafc;
  }
  .selection-panel[hidden] { display: none; }
  .selection-title {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 750;
  }
  .selection-panel label {
    display: grid;
    grid-template-columns: minmax(58px, 1fr) 86px;
    align-items: center;
    gap: 8px;
  }
  .selection-panel input[type="number"] {
    width: 100%;
    min-height: 30px;
    padding: 5px 7px;
    border: 1px solid #c9d1dc;
    border-radius: 6px;
    background: #fff;
    font: inherit;
  }
```

- [ ] **Step 5: Update contextual visibility selectors**

Keep the existing tool-dependent logic, but point it at `#toolOptionsBar` controls:

```css
  body:not(.tool-wall):not(.tool-room) #wallTypeWrap { display: none; }
  body:not(.tool-stair) #stairDirWrap { display: none; }
  body:not(.tool-door):not(.tool-window) #openingWidthWrap { display: none; }
  body:not(.tool-wall):not(.tool-room):not(.tool-measure) #angle45Wrap { display: none; }
```

- [ ] **Step 6: Replace mobile rules for chrome and rail**

Replace the current `@media (max-width: 820px)` toolbar block with:

```css
  @media (max-width: 820px) {
    #toolbar {
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: visible;
      gap: 6px;
    }
    #toolbar input[type="text"] { width: min(170px, 44vw); }
    #toolOptionsBar { gap: 6px; }
    #workspace { flex-direction: column; }
    #toolRail {
      flex: 0 0 52px;
      width: 100%;
      flex-direction: row;
      justify-content: flex-start;
      overflow-x: auto;
      overflow-y: hidden;
      border-right: 0;
      border-bottom: 1px solid var(--toolbar-border);
      box-shadow: 0 6px 16px rgba(17, 24, 39, 0.06);
    }
    #toolRail .tool-btn {
      width: 46px;
      min-width: 46px;
      min-height: 40px;
    }
    .tool-text { display: none; }
    .chrome-menu {
      position: fixed;
      left: 10px;
      right: 10px;
      top: 52px;
      min-width: 0;
    }
    #objectSidebar { width: 100%; flex: 0 0 28vh; border-left: 0; border-top: 1px solid var(--toolbar-border); }
    #objectSidebar.collapsed { width: 100%; flex: 0 0 42px; min-width: 0; }
    #sidebarResizer { display: none; }
    #help { display: none; }
    #statusbar { flex-wrap: wrap; gap: 6px 8px; }
    #statusbar .right { margin-left: 0; width: 100%; }
  }
```

- [ ] **Step 7: Update print hiding**

Change the print selector to:

```css
    #toolbar, #toolOptionsBar, #toolRail, #statusbar, #help, #contextMenu, #objectSidebar, #print-container { display: none !important; }
```

- [ ] **Step 8: Run the smoke test**

Run:

```powershell
node tests\smoke.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit the CSS pass**

```powershell
git add floorplanify.html
git commit -m "Give the editor chrome a calmer layout

Constraint: The app must remain a single-file browser tool with no build step
Rejected: Keeping all commands visible in the top row | It keeps the clutter problem and forces wrapping
Confidence: medium
Scope-risk: moderate
Directive: Put secondary controls in menus and keep toolRail as the only drawing-mode surface
Tested: node tests\smoke.test.js
Not-tested: Live desktop/mobile rendering"
```

---

### Task 4: Wire Menus And Preserve Existing Commands

**Files:**
- Modify: `C:\Users\kenne\Documents\floorplanify\floorplanify.html`

**Interfaces:**
- Consumes: `#viewMenuButton`, `#viewMenu`, `#exportMenuButton`, `#exportMenu`.
- Produces: `setupChromeMenus()`, `closeChromeMenus(exceptPanel)`, and accessible open/close behavior.

- [ ] **Step 1: Add constants after existing DOM constants**

After `const selectionEditor = document.getElementById('selectionEditor');`, add:

```js
  const chromeMenuPairs = [
    {
      button: document.getElementById('viewMenuButton'),
      panel: document.getElementById('viewMenu'),
    },
    {
      button: document.getElementById('exportMenuButton'),
      panel: document.getElementById('exportMenu'),
    },
  ].filter(pair => pair.button && pair.panel);
```

- [ ] **Step 2: Add menu helper functions before `syncOpeningWidthInput()`**

```js
  function setChromeMenuOpen(pair, open) {
    if (!pair || !pair.button || !pair.panel) return;
    pair.panel.hidden = !open;
    pair.button.setAttribute('aria-expanded', String(open));
  }

  function closeChromeMenus(exceptPanel) {
    chromeMenuPairs.forEach(pair => {
      if (pair.panel !== exceptPanel) setChromeMenuOpen(pair, false);
    });
  }

  function hasOpenChromeMenu() {
    return chromeMenuPairs.some(pair => pair.panel && !pair.panel.hidden);
  }

  function closeOpenChromeMenus() {
    if (!hasOpenChromeMenu()) return false;
    closeChromeMenus();
    return true;
  }

  function setupChromeMenus() {
    chromeMenuPairs.forEach(pair => {
      pair.button.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = pair.panel.hidden;
        closeChromeMenus(pair.panel);
        setChromeMenuOpen(pair, willOpen);
      });
      pair.panel.addEventListener('click', (e) => e.stopPropagation());
    });
    document.addEventListener('click', () => closeChromeMenus());
  }
```

- [ ] **Step 3: Close open chrome menus in the main keyboard handler**

After the confirm-dialog keyboard block, before the form-field guard, add:

```js
    if (evt.key === 'Escape' && closeOpenChromeMenus()) {
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }
```

This keeps Escape from also triggering drawing cancellation, selection clearing, or tool switching while a chrome flyout is open.

- [ ] **Step 4: Call `setupChromeMenus()` in toolbar wiring**

At the start of the `// === TOOLBAR WIRING ===` block, before binding `.tool-btn`, add:

```js
  setupChromeMenus();
```

- [ ] **Step 5: Close menus after destructive or export actions**

Update export and clear handlers so open menus dismiss after an action:

```js
  document.getElementById('clear').addEventListener('click', async () => {
    closeChromeMenus();
    if (state.walls.length === 0 && state.rooms.length === 0 && state.openings.length === 0 && state.stairs.length === 0 && state.guides.length === 0) return;
    if (!(await requestConfirm({
      title: 'T&oslash;m plantegningen?',
      message: 'Alle vegger, rom, &aring;pninger, trapper og m&aring;lelinjer fjernes.',
      confirmLabel: 'T&oslash;m',
      danger: true,
    }))) return;
    snapshot();
    state.walls = []; state.rooms = []; state.openings = []; state.stairs = []; state.guides = [];
    state.nextId = 1;
    state.selection = null; state.multiSel.clear(); state.inProgress = null;
    clearAutosave();
    render();
  });
  document.getElementById('exportPdf').addEventListener('click', () => { closeChromeMenus(); exportPdf(); });
  document.getElementById('exportPng').addEventListener('click', () => { closeChromeMenus(); exportPng(); });
  document.getElementById('exportSvg').addEventListener('click', () => { closeChromeMenus(); exportSvg(); });
```

If applying this exact snippet would duplicate the existing clear body, modify only the first line and export listeners. Keep the existing Norwegian text exactly as encoded in the file when patching.

- [ ] **Step 6: Run smoke tests**

Run:

```powershell
node tests\smoke.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit menu wiring**

```powershell
git add floorplanify.html
git commit -m "Wire compact chrome menus accessibly

Constraint: View and export controls are still plain DOM controls with existing ids and listeners
Rejected: CSS-only menus | They would not give reliable Escape, outside-click, and aria-expanded behavior
Confidence: medium
Scope-risk: moderate
Directive: Keep menu state helper small and avoid coupling it to drawing state
Tested: node tests\smoke.test.js
Not-tested: Pointer and keyboard menu behavior in browser"
```

---

### Task 5: Update Copy, Run Browser QA, And Finish

**Files:**
- Modify: `C:\Users\kenne\Documents\floorplanify\README.md`
- Modify if needed: `C:\Users\kenne\Documents\floorplanify\floorplanify.html`

**Interfaces:**
- Consumes: completed UI refactor.
- Produces: updated README wording and final verification evidence.

- [ ] **Step 1: Update README shortcut wording**

In `README.md`, change:

```md
3. Switch tool with the toolbar or these shortcuts:
```

to:

```md
3. Switch tool with the left tool rail or these shortcuts:
```

- [ ] **Step 2: Run smoke tests**

Run:

```powershell
node tests\smoke.test.js
```

Expected: `smoke tests passed`.

- [ ] **Step 3: Run the HTML parse check locally**

Run:

```powershell
@'
import html.parser
class P(html.parser.HTMLParser):
    def error(self, message):
        raise SystemExit("parse error: " + message)
p = P()
with open("floorplanify.html", "r", encoding="utf-8") as f:
    p.feed(f.read())
print("HTML parses OK")
'@ | python -
```

Expected: `HTML parses OK`.

- [ ] **Step 4: Manual browser QA**

Serve the app:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/floorplanify.html` and verify:

- Desktop at about 1440px wide: top bar is one slim row, tool rail is left, contextual options are below the top bar, object sidebar remains right.
- Mobile/narrow at about 390px wide: top bar scrolls horizontally if needed, tool rail becomes horizontal, sidebar moves below canvas as before.
- Tool rail clicks switch `aria-pressed` and active state for every tool.
- Keyboard shortcuts `V`, `W`, `R`, `K`, `S`, `D`, `N`, `H`, `M` still switch tools.
- View menu opens/closes, Escape closes it, outside click closes it, and controls update the drawing.
- Export menu opens/closes, export buttons are disabled until there is content, and `printFitInfo` still updates after drawing a wall.
- Selecting a wall/opening/stair shows dimension controls in the object sidebar and `Bruk` still applies changes.
- Print preview hides chrome/rail/sidebar/status and shows the printable plan only.

- [ ] **Step 5: Fix any visible UI defects**

If manual QA finds overlap, wrapping, clipped text, or inaccessible controls, patch only the relevant CSS or markup. Re-run:

```powershell
node tests\smoke.test.js
```

Expected: `smoke tests passed`.

- [ ] **Step 6: Commit final docs and QA fixes**

```powershell
git add README.md floorplanify.html tests\smoke.test.js
git commit -m "Document and verify the calmer editor chrome

Constraint: README must match the redesigned command surfaces
Confidence: high
Scope-risk: narrow
Directive: Future toolbar additions should justify why they are primary enough for top chrome
Tested: node tests\smoke.test.js; local html.parser parse; manual desktop and narrow browser QA
Not-tested: Cross-browser matrix beyond the local browser used for QA"
```

---

## Final Verification

Run these before opening the PR:

```powershell
node tests\smoke.test.js
@'
import html.parser
class P(html.parser.HTMLParser):
    def error(self, message):
        raise SystemExit("parse error: " + message)
p = P()
with open("floorplanify.html", "r", encoding="utf-8") as f:
    p.feed(f.read())
print("HTML parses OK")
'@ | python -
git status --short
```

Expected:

- `smoke tests passed`
- `HTML parses OK`
- `git status --short` shows no uncommitted files after the final commit

## Pull Request Checklist

- Branch name: `agent/toolbar-redesign`
- PR title: `Redesign editor chrome to reduce toolbar clutter`
- PR body should include:
  - User-facing summary: top bar is slimmer, drawing tools move to a left rail, view/export controls are compact menus, selected-object dimensions move to the sidebar.
  - Verification: smoke test, HTML parse, desktop/narrow browser QA.
  - Risk: single-file UI refactor; primary risk is CSS/layout regression.

## Self-Review

- Spec coverage: The plan covers the requested bold redesign: top bar cleanup, left tool rail, contextual options, compact view/export menus, and sidebar selection editing.
- Placeholder scan: No unfinished placeholder markers or undefined future work remain. Manual QA defects are handled by a bounded patch step with explicit checks.
- Type and ID consistency: Existing event listeners keep their control IDs. New IDs are `toolRail`, `toolOptionsBar`, `viewMenuButton`, `viewMenu`, `exportMenuButton`, and `exportMenu`; these are introduced in Task 2, styled in Task 3, and wired in Task 4.
