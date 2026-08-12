# Double Door Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable, wide two-leaf hinged doors that can be selected before placement or assigned to an existing door.

**Architecture:** Keep openings as one wall-mounted object whose `width` is the total clear opening. Add a backward-compatible `doorStyle: 'single' | 'double'` field, pass it through every state-copy path, and centralize leaf geometry so the canvas and print/export renderers agree.

**Tech Stack:** Single-file HTML/CSS/ES2020 JavaScript app, SVG rendering, Node.js smoke assertions, Playwright Chromium tests.

## Global Constraints

- Keep Floorplanify as one self-contained `floorplanify.html` file with no runtime dependencies or build step.
- The total opening width remains in centimeters and is clamped to 10 cm through wall length minus 2 cm.
- Existing plans and openings without a valid style must load as single doors.
- Double doors use two equal leaves; unequal leaves and non-hinged mechanisms are out of scope.
- Native JSON, autosave, undo/redo, duplicate, and copy/paste must preserve style.
- Carpentry v1 remains byte/schema compatible and exports only the existing total-width door opening.
- Use failing tests before each production change and run the listed focused test before committing.

## File Structure

- Modify `floorplanify.html`: state model, normalization, controls, editing, copy paths, geometry, canvas rendering, and print/export rendering.
- Modify `tests/floorplanify-core.spec.js`: browser-level creation, editing, persistence, legacy compatibility, geometry, and Carpentry assertions.
- Modify `tests/smoke.test.js`: static regression checks for every copy/duplicate restoration path.
- Modify `README.md`: user-facing door capability.
- Modify `CHANGELOG.md`: feature and migration note.

---

### Task 1: Door-style model, placement control, and native persistence

**Files:**
- Modify: `floorplanify.html:142-145, 818-831, 965-971, 1120-1277, 1414-1425, 1485-1497, 1811-1823, 1862-1877, 4316-4326, 4583-4589, 6684-6691`
- Modify: `tests/floorplanify-core.spec.js:132-157, 284-304, 329-370`

**Interfaces:**
- Consumes: existing `state.openingWidths`, `openingDefaultWidth(type)`, `addOpening(wallId, t, type, width)`, and native plan serializer/normalizer.
- Produces: `normalizeDoorStyle(value) -> 'single' | 'double'`, `openingDoorStyle(opening) -> 'single' | 'double'`, and `addOpening(wallId, t, type, width, doorStyle)`.

- [ ] **Step 1: Extend the browser-test plan projection**

Add the selected opening fields to `currentPlan()` so later assertions inspect real app state:

```js
openings: state.openings.map((opening) => ({
  id: opening.id,
  wallId: opening.wallId,
  type: opening.type,
  width: openingWidth(opening),
  t: opening.t,
  swing: opening.swing,
  mirror: opening.mirror,
  doorStyle: opening.doorStyle,
})),
```

- [ ] **Step 2: Write the failing placement and persistence test**

Place this test after `door and window placement remains visible`:

```js
test('wide double door can be chosen before placement and survives native save load', async ({ page }) => {
  await createRectangleRoom(page);
  await page.getByRole('button', { name: 'Dør-verktøy' }).click();
  await page.locator('#doorStyle').selectOption('double');
  await page.locator('#openingWidth').fill('400');
  await clickCanvasAtCm(page, 0, -200);

  let door = (await currentPlan(page)).openings[0];
  expect(door).toMatchObject({ type: 'door', width: 400, doorStyle: 'double' });

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#saveJson').click();
  const savedText = await downloadText(await downloadPromise);
  expect(JSON.parse(savedText)).toMatchObject({
    doorStyle: 'double',
    openings: [{ width: 400, doorStyle: 'double' }],
  });

  await page.locator('#clear').click();
  await page.locator('#confirmOk').click();
  await page.locator('#loadJsonInput').setInputFiles({
    name: 'double-door.json',
    mimeType: 'application/json',
    buffer: Buffer.from(savedText),
  });
  door = (await currentPlan(page)).openings[0];
  expect(door).toMatchObject({ width: 400, doorStyle: 'double' });
  await expect(page.locator('#doorStyle')).toHaveValue('double');
});
```

- [ ] **Step 3: Run the test to verify RED**

Run:

```powershell
npx playwright test tests/floorplanify-core.spec.js --project=chromium --grep "wide double door can be chosen"
```

Expected: FAIL because `#doorStyle` does not exist.

- [ ] **Step 4: Implement model normalization and the placement control**

Add a door-only toolbar control:

```html
<label id="doorStyleWrap" title="Type for nye dører">
  <span>Dørtype</span>
  <select id="doorStyle">
    <option value="single" selected>Enkel</option>
    <option value="double">Dobbel</option>
  </select>
</label>
```

Show it only for the door tool:

```css
body:not(.tool-door) #doorStyleWrap { display: none; }
```

Add `doorStyle: 'single'` to initial state. Add helpers next to `openingWidth()`:

```js
function normalizeDoorStyle(value) {
  return value === 'double' ? 'double' : 'single';
}
function openingDoorStyle(opening) {
  return opening && opening.type === 'door'
    ? normalizeDoorStyle(opening.doorStyle)
    : 'single';
}
```

Persist the toolbar default as top-level `doorStyle` and each opening's style:

```js
doorStyle: normalizeDoorStyle(state.doorStyle),
openings: state.openings.map(o => ({
  id: o.id, wallId: o.wallId, t: o.t, type: o.type,
  swing: o.swing || 'left', mirror: o.mirror === true,
  width: openingWidth(o),
  ...(o.type === 'door' ? { doorStyle: openingDoorStyle(o) } : {}),
})),
```

Normalize and apply both locations:

```js
const doorStyle = normalizeDoorStyle(data.doorStyle);
const opening = {
  id: safeId(o.id),
  wallId,
  t: Math.max(0.02, Math.min(0.98, Number(o.t) || 0.5)),
  type,
  swing: o.swing === 'right' ? 'right' : 'left',
  mirror: o.mirror === true,
  width: rawWidth > 0 ? rawWidth : openingLegacyWidth(type),
};
if (type === 'door') opening.doorStyle = normalizeDoorStyle(o.doorStyle);
return opening;

// Include this property in the normalizePlanData return object:
doorStyle,

// Assign and sync it in applyPlanData:
state.doorStyle = plan.doorStyle;
document.getElementById('doorStyle').value = state.doorStyle;
```

Change creation to accept the style without affecting windows:

```js
function addOpening(wallId, t, type, width, doorStyle) {
  const wall = state.walls.find(w => w.id === wallId);
  const o = {
    id: 'o' + (state.nextId++),
    wallId,
    t: clampOpeningTForWall(t, width || openingDefaultWidth(type), wall),
    type,
    swing: 'left',
    mirror: false,
    width: clampOpeningWidthForWall(width || openingDefaultWidth(type), wall),
  };
  if (type === 'door') o.doorStyle = normalizeDoorStyle(doorStyle);
  state.openings.push(o);
  return o;
}
```

Return `doorStyle` from `openingPlacementForPointer()`, copy it into the hover preview, and pass it as the fifth argument in the click path. Add a `change` listener that updates `state.doorStyle`, updates a live door preview, schedules autosave, and renders:

```js
document.getElementById('doorStyle').addEventListener('change', (event) => {
  state.doorStyle = normalizeDoorStyle(event.target.value);
  if (state.openingPreview && state.openingPreview.type === 'door') {
    state.openingPreview.doorStyle = state.doorStyle;
  }
  scheduleAutosave();
  requestRender();
});
```

- [ ] **Step 5: Run the focused test to verify GREEN**

Run:

```powershell
npx playwright test tests/floorplanify-core.spec.js --project=chromium --grep "wide double door can be chosen"
```

Expected: 1 passed.

- [ ] **Step 6: Add and verify legacy normalization coverage**

Add a test that loads native JSON with missing and invalid styles:

```js
test('legacy and invalid door styles normalize to single', async ({ page }) => {
  const legacy = {
    version: 3,
    walls: [{ id: 'w1', a: { x: 0, y: 0 }, b: { x: 500, y: 0 }, type: 'ext' }],
    rooms: [], stairs: [], guides: [],
    openings: [
      { id: 'o1', wallId: 'w1', t: 0.3, type: 'door', width: 90 },
      { id: 'o2', wallId: 'w1', t: 0.7, type: 'door', width: 90, doorStyle: 'folding' },
    ],
  };
  await page.locator('#loadJsonInput').setInputFiles({
    name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)),
  });
  expect((await currentPlan(page)).openings.map(({ doorStyle }) => doorStyle))
    .toEqual(['single', 'single']);
});
```

Run:

```powershell
npx playwright test tests/floorplanify-core.spec.js --project=chromium --grep "door style"
```

Expected: both door-style tests pass.

- [ ] **Step 7: Commit the model and placement slice**

```powershell
git add -- floorplanify.html tests/floorplanify-core.spec.js
git commit -m "feat: add persistent double door style"
```

---

### Task 2: Existing-door editor and copy preservation

**Files:**
- Modify: `floorplanify.html:1935-1961, 2085-2160, 2251-2281, 3358-3377, 5030-5205`
- Modify: `tests/floorplanify-core.spec.js` immediately after the new placement test
- Modify: `tests/smoke.test.js:34-108`

**Interfaces:**
- Consumes: Task 1's `openingDoorStyle(opening)` and five-argument `addOpening(...)`.
- Produces: sidebar field `doorStyle` for doors and style-preserving duplicate/copy/paste payloads.

- [ ] **Step 1: Write the failing existing-door edit test**

```js
test('existing door converts to double without changing width or position', async ({ page }) => {
  await createRectangleRoom(page);
  await placeOpening(page, 'Dør-verktøy', { x: 0, y: -200 });
  const before = (await currentPlan(page)).openings[0];

  await page.getByRole('button', { name: 'Velg-verktøy' }).click();
  await clickCanvasAtCm(page, 0, -200);
  await page.locator('[data-side-field="mirror"]').selectOption('end');
  const styleField = page.locator(
    '[data-side-type="opening"][data-side-field="doorStyle"]',
  );
  await styleField.selectOption('double');

  const after = (await currentPlan(page)).openings[0];
  expect(after).toMatchObject({ doorStyle: 'double', width: before.width, t: before.t });
  await expect(page.locator('[data-side-field="mirror"]')).toHaveCount(0);

  await styleField.selectOption('single');
  await expect(page.locator('[data-side-field="mirror"]')).toHaveValue('end');
});
```

- [ ] **Step 2: Run the edit test to verify RED**

Run:

```powershell
npx playwright test tests/floorplanify-core.spec.js --project=chromium --grep "existing door converts"
```

Expected: FAIL because the `doorStyle` sidebar select is absent.

- [ ] **Step 3: Implement editing and sidebar refresh behavior**

In `appendOpeningFields()`, put the style select before swing and show mirror only for single doors:

```js
fields.appendChild(fieldLabel('Dørtype', sidebarSelect(
  'opening', o.id, 'doorStyle', openingDoorStyle(o), [
    { value: 'single', label: 'Enkel' },
    { value: 'double', label: 'Dobbel' },
  ]
)));
fields.appendChild(fieldLabel('Sving', sidebarSelect(
  'opening', o.id, 'swing', o.swing || 'left', [
    { value: 'left', label: 'Venstre' },
    { value: 'right', label: 'Høyre' },
  ]
)));
if (openingDoorStyle(o) === 'single') {
  fields.appendChild(fieldLabel('Hengslet på', sidebarSelect(
    'opening', o.id, 'mirror', o.mirror ? 'end' : 'start', [
      { value: 'start', label: 'Start' },
      { value: 'end', label: 'Slutt' },
    ]
  )));
}
const flip = document.createElement('button');
flip.type = 'button';
flip.textContent = 'Snu sving';
flip.dataset.sidebarAction = 'flip-door';
flip.dataset.type = 'opening';
flip.dataset.id = o.id;
fields.appendChild(flip).className = 'span-2';
```

Handle the mutation without touching width, position, swing, or mirror:

```js
if (field === 'doorStyle' && obj.type === 'door') {
  const next = normalizeDoorStyle(rawValue);
  if (next !== openingDoorStyle(obj)) {
    obj.doorStyle = next;
    changed = true;
  }
}
```

Include `doorStyle: openingDoorStyle(o)` in `sidebarObjectSignature()` so the sidebar rebuilds when style changes. Label double doors as `Dobbel dør` in `openingTitle()` and selected-editor text without altering window labels.

- [ ] **Step 4: Run the edit test to verify GREEN**

Run:

```powershell
npx playwright test tests/floorplanify-core.spec.js --project=chromium --grep "existing door converts"
```

Expected: 1 passed.

- [ ] **Step 5: Write failing smoke assertions for every copy path**

Add these exact assertions after the existing mirror assertions:

```js
requireMatch(
  /copy\.doorStyle = openingDoorStyle\(src\)/,
  'duplicated doors should preserve door style'
);
requireFunctionMatch('wallOpeningCopies', /doorStyle:\s*openingDoorStyle\(o\)/,
  'wall clipboard copies should preserve door style');
requireFunctionMatch('roomOpeningCopies', /doorStyle:\s*openingDoorStyle\(o\)/,
  'room clipboard copies should preserve door style');
requireFunctionMatch('clipboardItemFor', /kind:\s*'opening'[\s\S]*doorStyle:\s*openingDoorStyle\(obj\)/,
  'standalone opening clipboard copies should preserve door style');
requireFunctionMatch('addWallOpeningCopies', /opening\.doorStyle\s*=\s*normalizeDoorStyle\(c\.doorStyle\)/,
  'pasted wall openings should restore door style');
requireFunctionMatch('addRoomOpeningCopies', /opening\.doorStyle\s*=\s*normalizeDoorStyle\(c\.doorStyle\)/,
  'pasted room openings should restore door style');
requireFunctionMatch('pasteClipboardItem', /opening\.doorStyle\s*=\s*normalizeDoorStyle\(item\.doorStyle\)/,
  'pasted standalone openings should restore door style');
requireFunctionMatch('pasteClipboardAt', /opening\.doorStyle\s*=\s*normalizeDoorStyle\(item\.doorStyle\)/,
  'openings pasted onto a chosen wall should restore door style');
```

- [ ] **Step 6: Run smoke tests to verify RED**

Run:

```powershell
node tests/smoke.test.js
```

Expected: FAIL at the first missing style-preservation assertion.

- [ ] **Step 7: Preserve style through duplicate and clipboard paths**

Add `doorStyle: openingDoorStyle(o)` to wall and room copy payloads and `doorStyle: openingDoorStyle(obj)` to standalone opening payloads. In wall and room restore paths, assign:

```js
opening.doorStyle = normalizeDoorStyle(c.doorStyle);
```

In both standalone restore paths, assign `opening.doorStyle = normalizeDoorStyle(item.doorStyle);`. In `duplicateObject()`, add:

```js
copy.doorStyle = openingDoorStyle(src);
```

- [ ] **Step 8: Run focused editing and smoke tests**

Run:

```powershell
node tests/smoke.test.js
npx playwright test tests/floorplanify-core.spec.js --project=chromium --grep "existing door converts"
```

Expected: smoke tests pass and 1 browser test passes.

- [ ] **Step 9: Commit the editing/copy slice**

```powershell
git add -- floorplanify.html tests/floorplanify-core.spec.js tests/smoke.test.js
git commit -m "feat: edit and copy double doors"
```

---

### Task 3: Shared two-leaf geometry and canvas/export parity

**Files:**
- Modify: `floorplanify.html:2658-2717, 5697-5726, 6788-6796`
- Modify: `tests/floorplanify-core.spec.js` immediately after the double-door placement test

**Interfaces:**
- Consumes: `openingDoorStyle(opening)`, opening center, wall unit/perpendicular vectors, total opening width, and existing `swing` direction.
- Produces: `doorLeafGeometry(wall, opening) -> Array<{ side, hinge, closedEnd, swingEnd, radius, sweep }>` shared by screen and print renderers.

- [ ] **Step 1: Write the failing two-leaf rendering test**

```js
test('double door renders two leaves and matching print geometry', async ({ page }) => {
  await createRectangleRoom(page);
  await page.getByRole('button', { name: 'Dør-verktøy' }).click();
  await page.locator('#doorStyle').selectOption('double');
  await page.locator('#openingWidth').fill('400');
  await clickCanvasAtCm(page, 0, -200);

  await expect(page.locator('#layer-openings [data-door-leaf]')).toHaveCount(2);
  await expect(page.locator('#layer-openings [data-door-swing]')).toHaveCount(2);
  await expect(page.locator('#layer-openings [data-door-hinge]')).toHaveCount(2);

  const printCounts = await page.evaluate(() => {
    const api = window.__floorplanify;
    const spec = api.printPageSpec();
    const svg = api.buildPrintSvg(spec.bb, spec.scale, false, spec);
    return {
      leaves: svg.querySelectorAll('[data-door-leaf]').length,
      swings: svg.querySelectorAll('[data-door-swing]').length,
      hinges: svg.querySelectorAll('[data-door-hinge]').length,
    };
  });
  expect(printCounts).toEqual({ leaves: 2, swings: 2, hinges: 2 });
});
```

- [ ] **Step 2: Run the rendering test to verify RED**

Run:

```powershell
npx playwright test tests/floorplanify-core.spec.js --project=chromium --grep "double door renders"
```

Expected: FAIL because the current renderer emits one untagged leaf, arc, and hinge.

- [ ] **Step 3: Add shared leaf geometry**

Add a helper immediately before `drawOpening()`:

```js
function doorLeafGeometry(wall, opening) {
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const len = Math.hypot(dx, dy);
  if (!len) return [];
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const center = {
    x: wall.a.x + dx * opening.t,
    y: wall.a.y + dy * opening.t,
  };
  const half = openingRenderWidth(opening, wall) / 2;
  if (openingDoorStyle(opening) !== 'double') return [];
  const swingSide = opening.swing === 'right' ? -1 : 1;
  const radius = half;
  const startHinge = { x: center.x - ux * half, y: center.y - uy * half };
  const endHinge = { x: center.x + ux * half, y: center.y + uy * half };
  return [
    {
      side: 'start', hinge: startHinge, closedEnd: center, radius,
      swingEnd: { x: startHinge.x + nx * radius * swingSide, y: startHinge.y + ny * radius * swingSide },
      sweep: swingSide > 0 ? 1 : 0,
    },
    {
      side: 'end', hinge: endHinge, closedEnd: center, radius,
      swingEnd: { x: endHinge.x + nx * radius * swingSide, y: endHinge.y + ny * radius * swingSide },
      sweep: swingSide > 0 ? 0 : 1,
    },
  ];
}
```

Keep the current single-door coordinates and styling unchanged. In the double canvas branch, append these elements for every returned leaf:

```js
g.appendChild(svgEl('path', {
  d: 'M ' + leaf.closedEnd.x + ' ' + leaf.closedEnd.y
    + ' A ' + leaf.radius + ' ' + leaf.radius + ' 0 0 ' + leaf.sweep
    + ' ' + leaf.swingEnd.x + ' ' + leaf.swingEnd.y,
  fill: 'none', stroke: col, 'stroke-width': sw2,
  'stroke-dasharray': preview ? '5 3' : '3 2',
  opacity: preview ? '0.78' : '1', 'pointer-events': 'none',
  'data-door-swing': leaf.side,
}));
g.appendChild(svgEl('line', {
  x1: leaf.hinge.x, y1: leaf.hinge.y,
  x2: leaf.closedEnd.x, y2: leaf.closedEnd.y,
  stroke: col, 'stroke-width': sw,
  opacity: preview ? '0.78' : '1', 'pointer-events': 'none',
  'data-door-leaf': leaf.side,
}));
g.appendChild(svgEl('circle', {
  cx: leaf.hinge.x, cy: leaf.hinge.y, r: state._fs(1.6),
  fill: col, 'pointer-events': 'none',
  'data-door-hinge': leaf.side,
}));
```

In the double branch inside `buildPrintSvg()`, append these print-scaled elements for every returned leaf:

```js
svgOut.appendChild(svgEl('path', {
  d: 'M ' + leaf.closedEnd.x + ' ' + leaf.closedEnd.y
    + ' A ' + leaf.radius + ' ' + leaf.radius + ' 0 0 ' + leaf.sweep
    + ' ' + leaf.swingEnd.x + ' ' + leaf.swingEnd.y,
  fill: 'none', stroke: col, 'stroke-width': mm(0.25),
  'stroke-dasharray': '0.8 0.6', 'data-door-swing': leaf.side,
}));
svgOut.appendChild(svgEl('line', {
  x1: leaf.hinge.x, y1: leaf.hinge.y,
  x2: leaf.closedEnd.x, y2: leaf.closedEnd.y,
  stroke: col, 'stroke-width': mm(0.4), 'data-door-leaf': leaf.side,
}));
svgOut.appendChild(svgEl('circle', {
  cx: leaf.hinge.x, cy: leaf.hinge.y, r: mm(0.45),
  fill: col, 'data-door-hinge': leaf.side,
}));
```

On the three existing single-door SVG elements, add `data-door-swing="single"`, `data-door-leaf="single"`, and `data-door-hinge="single"` respectively; leave every existing coordinate and style attribute unchanged. Export `doorLeafGeometry` through `window.__floorplanify` for console diagnostics.

- [ ] **Step 4: Run rendering and ordinary-door regression tests**

Run:

```powershell
npx playwright test tests/floorplanify-core.spec.js --project=chromium --grep "double door renders|door and window placement remains visible"
```

Expected: 2 passed; the ordinary single door and window remain visible.

- [ ] **Step 5: Add Carpentry v1 compatibility assertion**

In the wide-double-door test, create the handoff document and assert exact keys:

```js
const carpentryOpening = await page.evaluate(() => (
  window.__floorplanify.createCarpentryExportData().project.openings[0]
));
expect(carpentryOpening).toMatchObject({ kind: 'door', widthCm: 400 });
expect(Object.keys(carpentryOpening).sort()).toEqual(
  ['centerT', 'id', 'kind', 'mirrored', 'swing', 'wallId', 'widthCm'].sort(),
);
```

Run:

```powershell
npx playwright test tests/floorplanify-core.spec.js --project=chromium --grep "wide double door can be chosen"
```

Expected: 1 passed and no `doorStyle` key appears in Carpentry v1.

- [ ] **Step 6: Commit the rendering slice**

```powershell
git add -- floorplanify.html tests/floorplanify-core.spec.js
git commit -m "feat: render double door leaves"
```

---

### Task 4: User documentation and full verification

**Files:**
- Modify: `README.md:19-21`
- Modify: `CHANGELOG.md:8-40, 68-73`

**Interfaces:**
- Consumes: completed user-facing double-door behavior.
- Produces: concise usage and migration documentation.

- [ ] **Step 1: Update the README feature description**

Replace the door/window bullet with:

```markdown
- **Doors and windows** — place on walls with configurable width. Doors can be
  single or double-leaf, with swing direction and hinge side; windows use the
  two-pane convention. Both snap to wall endpoints, midpoints, and nearby
  openings on the same wall.
```

- [ ] **Step 2: Update changelog and migration notes**

Add under `Unreleased > Added`:

```markdown
- **Configurable double doors.** Choose `Enkel` or `Dobbel` before placing a
  door or while editing it. Width is the total clear opening, and double doors
  render as two equal leaves in the editor and PDF/PNG/SVG output.
```

Add under `Migration notes`:

```markdown
- Saved openings without `doorStyle` load as `single`. Carpentry v1 keeps the
  total door width but does not carry double-leaf metadata.
```

- [ ] **Step 3: Run syntax and static verification**

Run:

```powershell
node --check tests/smoke.test.js
node tests/smoke.test.js
node -e "const fs=require('fs');const html=fs.readFileSync('floorplanify.html','utf8');const script=html.match(/<script>([\s\S]*)<\/script>/)[1];new Function(script);console.log('embedded script parses')"
git diff --check
```

Expected: both Node checks print success, embedded script prints `embedded script parses`, and `git diff --check` exits 0 without output.

- [ ] **Step 4: Run focused feature tests**

Run:

```powershell
npx playwright test tests/floorplanify-core.spec.js --project=chromium --grep "double door|door styles"
```

Expected: all double-door and legacy-style tests pass.

- [ ] **Step 5: Run the full browser suite**

Run:

```powershell
npm run test:browser -- --project=chromium
```

Expected: all Playwright tests pass with 0 failures.

- [ ] **Step 6: Review the final diff against the design spec**

Run:

```powershell
git diff --stat HEAD~3
git diff HEAD~3 -- floorplanify.html tests/floorplanify-core.spec.js tests/smoke.test.js README.md CHANGELOG.md
git status --short
```

Confirm every in-scope item from `docs/superpowers/specs/2026-08-12-double-door-design.md` is represented and only known unrelated `.omo/` artifacts remain untracked.

- [ ] **Step 7: Commit documentation**

```powershell
git add -- README.md CHANGELOG.md
git commit -m "docs: document double doors"
```

- [ ] **Step 8: Run final post-commit verification**

Run:

```powershell
node tests/smoke.test.js
npm run test:browser -- --project=chromium
git status --short
```

Expected: smoke passes, the complete Chromium suite passes with 0 failures, and status contains no tracked changes.
