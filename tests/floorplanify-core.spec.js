import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const APP_PATH = '/floorplanify.html';
const AUTOSAVE_KEY = 'floorplanify.autosave.v1';
const EVIDENCE_SCREENSHOT = path.resolve(
  '.omo/evidence/task-1-floorplanify-core-and-carpentry-export.png',
);
const CARPENTRY_FIXTURE_PATH = path.resolve(
  'tests/fixtures/floorplanify-carpentry-v1.json',
);
const CARPENTRY_FIXTURE_TEXT = fs.readFileSync(CARPENTRY_FIXTURE_PATH, 'utf8');
const CARPENTRY_FIXTURE = JSON.parse(CARPENTRY_FIXTURE_TEXT);
const CARPENTRY_EVIDENCE_PATH = path.resolve(
  '.omo/evidence/task-4-floorplanify-core-and-carpentry-export.json',
);
const INVALID_FIXTURE_DIR = path.resolve(
  'tests/fixtures/floorplanify-carpentry-v1-invalid',
);

async function openFloorplan(page) {
  await page.goto(APP_PATH);
  await expect(page.locator('#canvas')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__floorplanify)))
    .toBe(true);
}

async function measureToolbarAgainstIntegrationBaseline(page) {
  return page.evaluate(() => {
    const toolbarElement = document.getElementById('toolbar');
    const integrationButton = document.getElementById('integrationsMenuButton');
    const integrationWrap = integrationButton.closest('.chrome-menu-wrap');
    const existingGroups = [...toolbarElement.children].filter((element) => element !== integrationWrap);
    const isVisible = (element) => getComputedStyle(element).display !== 'none'
      && element.getClientRects().length > 0;
    const snapshotExistingGroups = () => existingGroups.map((group) => ({
      id: group.id,
      style: group.getAttribute('style'),
      hidden: group.hidden,
      ariaHidden: group.getAttribute('aria-hidden'),
      visible: isVisible(group),
    }));
    const measure = () => {
      const rowTops = [...toolbarElement.children]
        .filter(isVisible)
        .map((element) => Math.round(element.getBoundingClientRect().top));
      return {
        height: toolbarElement.getBoundingClientRect().height,
        rowCount: new Set(rowTops).size,
        overflowX: toolbarElement.scrollWidth > toolbarElement.clientWidth,
      };
    };

    const styleBefore = integrationWrap.getAttribute('style');
    const inlineDisplayBefore = integrationWrap.style.display;
    const panelHiddenBefore = document.getElementById('integrationsMenu').hidden;
    const existingGroupsBefore = snapshotExistingGroups();

    integrationWrap.setAttribute('style', `${styleBefore || ''}; display: none !important;`);
    void toolbarElement.offsetHeight;
    const baseline = measure();
    const detailsVisibleAtBaseline = isVisible(integrationWrap);
    const existingGroupsAtBaseline = snapshotExistingGroups();

    if (styleBefore === null) integrationWrap.removeAttribute('style');
    else integrationWrap.setAttribute('style', styleBefore);
    void toolbarElement.offsetHeight;

    return {
      baseline,
      current: measure(),
      styleBefore,
      styleAfter: integrationWrap.getAttribute('style'),
      inlineDisplayBefore,
      inlineDisplayAfter: integrationWrap.style.display,
      panelHiddenBefore,
      panelHiddenAfter: document.getElementById('integrationsMenu').hidden,
      detailsVisibleAtBaseline,
      detailsVisibleAfter: isVisible(integrationWrap),
      existingGroupsBefore,
      existingGroupsAtBaseline,
      existingGroupsAfter: snapshotExistingGroups(),
    };
  });
}

function expectToolbarToMatchIntegrationBaseline(layout) {
  expect(layout.current.height).toBeLessThanOrEqual(layout.baseline.height + 4);
  expect(layout.current.rowCount).toBeLessThanOrEqual(layout.baseline.rowCount);
  expect(layout.baseline.overflowX).toBe(false);
  expect(layout.current.overflowX).toBe(layout.baseline.overflowX);
  expect(layout.styleAfter).toBe(layout.styleBefore);
  expect(layout.inlineDisplayAfter).toBe(layout.inlineDisplayBefore);
  expect(layout.panelHiddenBefore).toBe(true);
  expect(layout.panelHiddenAfter).toBe(true);
  expect(layout.detailsVisibleAtBaseline).toBe(false);
  expect(layout.detailsVisibleAfter).toBe(true);
  expect(layout.existingGroupsAtBaseline).toEqual(layout.existingGroupsBefore);
  expect(layout.existingGroupsAfter).toEqual(layout.existingGroupsBefore);
  expect(layout.existingGroupsAfter.every(({ visible }) => visible)).toBe(true);
}

async function canvasClientPoint(page, x, y) {
  return page.locator('#canvas').evaluate((canvas, modelPoint) => {
    const bounds = canvas.getBoundingClientRect();
    const viewBox = canvas.viewBox.baseVal;
    return {
      x: bounds.left + ((modelPoint.x - viewBox.x) / viewBox.width) * bounds.width,
      y: bounds.top + ((modelPoint.y - viewBox.y) / viewBox.height) * bounds.height,
    };
  }, { x, y });
}

async function clickCanvasAtCm(page, x, y) {
  const point = await canvasClientPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function dragCanvasBetweenCm(page, start, end) {
  const startPoint = await canvasClientPoint(page, start.x, start.y);
  const endPoint = await canvasClientPoint(page, end.x, end.y);
  await page.mouse.move(startPoint.x, startPoint.y);
  await page.mouse.down();
  await page.mouse.move(endPoint.x, endPoint.y, { steps: 4 });
  await page.mouse.up();
}

async function currentPlan(page) {
  return page.evaluate(() => {
    const { state, lengthCm, openingWidth } = window.__floorplanify;
    return {
      projectName: state.projectName,
      walls: state.walls.map((wall) => ({
        id: wall.id,
        a: { ...wall.a },
        b: { ...wall.b },
        type: wall.type,
        length: lengthCm(wall),
      })),
      rooms: state.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        points: room.points.map((point) => ({ ...point })),
      })),
      openings: state.openings.map((opening) => ({
        id: opening.id,
        wallId: opening.wallId,
        type: opening.type,
        width: openingWidth(opening),
        t: opening.t,
      })),
    };
  });
}

function roomDimensions(room) {
  const xs = room.points.map(({ x }) => x);
  const ys = room.points.map(({ y }) => y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

async function createRectangleRoom(page) {
  await page.getByRole('button', { name: 'Romboks-verktøy' }).click();
  await dragCanvasBetweenCm(page, { x: -300, y: -200 }, { x: 290, y: 190 });

  await expect
    .poll(async () => {
      const plan = await currentPlan(page);
      return { walls: plan.walls.length, rooms: plan.rooms.length };
    })
    .toEqual({ walls: 4, rooms: 1 });
}

async function placeOpening(page, toolName, point) {
  await page.getByRole('button', { name: toolName }).click();
  await clickCanvasAtCm(page, point.x, point.y);
}

async function downloadText(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function installExchangeDocument(page, document) {
  await page.evaluate((payload) => {
    const api = window.__floorplanify;
    const { state } = api;
    const project = payload.project;
    state.projectName = project.name;
    state.walls = project.walls.map((wall) => ({
      id: wall.id,
      a: { ...wall.start },
      b: { ...wall.end },
      type: wall.kind === 'interior' ? 'part' : 'ext',
    }));
    state.rooms = project.rooms.map((room, index) => ({
      id: room.id,
      name: room.name,
      points: room.points.map((point) => ({ ...point })),
      color: ['#f3c45d', '#7fc8a9'][index % 2],
    }));
    state.openings = project.openings.map((opening) => ({
      id: opening.id,
      wallId: opening.wallId,
      t: opening.centerT,
      type: opening.kind,
      width: opening.widthCm,
      swing: opening.swing,
      mirror: opening.mirrored,
    }));
    state.stairs = project.stairs.map((stair) => ({
      id: stair.id,
      rect: { ...stair.rect },
      dir: stair.dir,
    }));
    state.guides = project.guides.map((guide) => ({
      id: guide.id,
      a: { ...guide.a },
      b: { ...guide.b },
    }));
    state.nextId = 1000;
    state.selection = null;
    state.multiSel.clear();
    api.render();
  }, document);
}

async function callCarpentryDownload(page) {
  const downloadPromise = page.waitForEvent('download');
  const result = await page.evaluate(() => window.__floorplanify.downloadCarpentryExport());
  const download = await downloadPromise;
  return { download, result, text: await downloadText(download) };
}

test.beforeEach(async ({ page }) => {
  await openFloorplan(page);
});

test('blank floorplan remains ready', async ({ page }) => {
  await expect(page).toHaveTitle(/Floorplanify/);
  await expect(page.locator('#st-stats')).toHaveText('Tom plantegning');
  await expect(page.locator('#objectSummary')).toHaveText('Ingen objekter');

  const plan = await currentPlan(page);
  expect(plan.walls).toHaveLength(0);
  expect(plan.rooms).toHaveLength(0);
  expect(plan.openings).toHaveLength(0);

  await expect(page.locator('#undo')).toBeDisabled();
  await expect(page.locator('#redo')).toBeDisabled();
  await expect(page.locator('#exportPdf')).toBeDisabled();
  await expect(page.locator('#exportPng')).toBeDisabled();
  await expect(page.locator('#exportSvg')).toBeDisabled();
});

test('rectangle room remains editable', async ({ page }) => {
  await createRectangleRoom(page);

  const initialPlan = await currentPlan(page);
  expect(initialPlan.walls.map(({ length }) => length).sort((a, b) => a - b))
    .toEqual([390, 390, 590, 590]);
  expect(roomDimensions(initialPlan.rooms[0])).toEqual({ width: 590, height: 390 });

  await expect(page.locator('#selectionEditor')).toBeVisible();
  await expect(page.locator('#editWidth')).toHaveValue('590');
  await expect(page.locator('#editHeight')).toHaveValue('390');
  await page.locator('#editWidth').fill('600');
  await page.locator('#applyDimensions').click();

  await expect
    .poll(async () => roomDimensions((await currentPlan(page)).rooms[0]))
    .toEqual({ width: 600, height: 390 });
});

test('door and window placement remains visible', async ({ page }) => {
  await createRectangleRoom(page);
  await placeOpening(page, 'Dør-verktøy', { x: 0, y: -200 });
  await placeOpening(page, 'Vindu-verktøy', { x: 0, y: 190 });

  const plan = await currentPlan(page);
  expect(plan.openings.map(({ type }) => type).sort()).toEqual(['door', 'window']);
  expect(plan.openings.map(({ width }) => width).sort((a, b) => a - b)).toEqual([90, 120]);

  const renderedOpenings = page.locator('#layer-openings [data-opening-id]');
  await expect(renderedOpenings).toHaveCount(2);
  expect(await renderedOpenings.evaluateAll((elements) => elements.every((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 || bounds.height > 0;
  }))).toBe(true);

  await expect(page.locator('#exportPdf')).toBeEnabled();
  await expect(page.locator('#exportPng')).toBeEnabled();
  await expect(page.locator('#exportSvg')).toBeEnabled();
  await page.screenshot({ path: EVIDENCE_SCREENSHOT, fullPage: true });
});

test('undo redo remains reversible', async ({ page }) => {
  await createRectangleRoom(page);
  await page.locator('#undo').click();

  await expect
    .poll(async () => {
      const plan = await currentPlan(page);
      return { walls: plan.walls.length, rooms: plan.rooms.length };
    })
    .toEqual({ walls: 0, rooms: 0 });
  await expect(page.locator('#redo')).toBeEnabled();

  await page.locator('#redo').click();
  await expect
    .poll(async () => {
      const plan = await currentPlan(page);
      return { walls: plan.walls.length, rooms: plan.rooms.length };
    })
    .toEqual({ walls: 4, rooms: 1 });
  expect(roomDimensions((await currentPlan(page)).rooms[0]))
    .toEqual({ width: 590, height: 390 });
});

test('project save load remains compatible', async ({ page }) => {
  await createRectangleRoom(page);
  await placeOpening(page, 'Dør-verktøy', { x: 0, y: -200 });
  await page.locator('#projectName').fill('Regression Room');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#saveJson').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Regression_Room.json');
  const savedText = await downloadText(download);
  const savedPlan = JSON.parse(savedText);
  expect(savedPlan).toMatchObject({
    version: 3,
    projectName: 'Regression Room',
    openingWidths: { door: 90, window: 120 },
  });
  expect(savedPlan.walls).toHaveLength(4);
  expect(savedPlan.rooms).toHaveLength(1);
  expect(savedPlan.openings).toHaveLength(1);

  await page.locator('#clear').click();
  await expect(page.locator('#confirmBackdrop')).toBeVisible();
  await page.locator('#confirmOk').click();
  await expect.poll(async () => (await currentPlan(page)).walls.length).toBe(0);

  await page.locator('#loadJsonInput').setInputFiles({
    name: 'regression-room.json',
    mimeType: 'application/json',
    buffer: Buffer.from(savedText),
  });
  await expect
    .poll(async () => {
      const plan = await currentPlan(page);
      return {
        projectName: plan.projectName,
        walls: plan.walls.length,
        rooms: plan.rooms.length,
        openings: plan.openings.length,
      };
    })
    .toEqual({ projectName: 'Regression Room', walls: 4, rooms: 1, openings: 1 });
});

test('autosave restore remains compatible', async ({ page }) => {
  await createRectangleRoom(page);
  await expect
    .poll(() => page.evaluate((key) => {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      return saved?.plan?.walls?.length ?? 0;
    }, AUTOSAVE_KEY))
    .toBe(4);

  await page.reload();
  await expect.poll(async () => (await currentPlan(page)).walls.length).toBe(0);
  await expect(page.locator('#restoreDraft')).toBeVisible();
  await page.locator('#restoreDraft').click();

  await expect
    .poll(async () => {
      const plan = await currentPlan(page);
      return { walls: plan.walls.length, rooms: plan.rooms.length };
    })
    .toEqual({ walls: 4, rooms: 1 });
});

test('PDF PNG SVG enablement remains content-gated', async ({ page }) => {
  await expect(page.locator('#exportPdf')).toBeDisabled();
  await expect(page.locator('#exportPng')).toBeDisabled();
  await expect(page.locator('#exportSvg')).toBeDisabled();

  await createRectangleRoom(page);

  await expect(page.locator('#exportPdf')).toBeEnabled();
  await expect(page.locator('#exportPng')).toBeEnabled();
  await expect(page.locator('#exportSvg')).toBeEnabled();
  await expect(page.locator('#printFitInfo')).not.toContainText('tegn først');
});

test.describe('Carpentry exchange', () => {
  test('publishes the focused exporter API', async ({ page }) => {
    const apiTypes = await page.evaluate(() => {
      const api = window.__floorplanify;
      return {
        createCarpentryExportData: typeof api.createCarpentryExportData,
        validateCarpentryExportability: typeof api.validateCarpentryExportability,
        carpentryExportFileName: typeof api.carpentryExportFileName,
        downloadCarpentryExport: typeof api.downloadCarpentryExport,
      };
    });

    expect(apiTypes).toEqual({
      createCarpentryExportData: 'function',
      validateCarpentryExportability: 'function',
      carpentryExportFileName: 'function',
      downloadCarpentryExport: 'function',
    });
  });

  test('exports the canonical fixture byte-identically on repeat and after native save/load', async ({ page }) => {
    await installExchangeDocument(page, CARPENTRY_FIXTURE);
    await page.evaluate(() => {
      const { state } = window.__floorplanify;
      state.walls.reverse();
      state.rooms.reverse();
      state.openings.reverse();
      state.stairs.reverse();
      state.guides.reverse();
    });

    const created = await page.evaluate(() => window.__floorplanify.createCarpentryExportData());
    expect(created).toEqual(CARPENTRY_FIXTURE);
    const validation = await page.evaluate((data) => (
      window.__floorplanify.validateCarpentryExportability(data)
    ), created);
    expect(validation.filter(({ severity }) => severity === 'blocker')).toEqual([]);
    expect(validation).toContainEqual(expect.objectContaining({
      severity: 'warning',
      code: 'preserved_room_metadata',
      sourceIds: ['room-1'],
    }));
    expect(await page.evaluate(() => window.__floorplanify.carpentryExportFileName()))
      .toBe('Canonical_5_90_m_x_3_90_m_room.carpentry.json');

    const first = await callCarpentryDownload(page);
    const second = await callCarpentryDownload(page);
    expect(first.result).toMatchObject({ downloaded: true, blockerCount: 0 });
    expect(second.result).toMatchObject({ downloaded: true, blockerCount: 0 });
    expect(first.text).toBe(CARPENTRY_FIXTURE_TEXT);
    expect(second.text).toBe(CARPENTRY_FIXTURE_TEXT);

    const nativeDownloadPromise = page.waitForEvent('download');
    await page.evaluate(() => window.__floorplanify.saveJson());
    const nativeText = await downloadText(await nativeDownloadPromise);
    expect(JSON.parse(nativeText).version).toBe(3);

    await page.locator('#loadJsonInput').setInputFiles({
      name: 'canonical-native-v3.json',
      mimeType: 'application/json',
      buffer: Buffer.from(nativeText),
    });
    await expect.poll(async () => (await currentPlan(page)).walls.length).toBe(4);

    const afterLoad = await callCarpentryDownload(page);
    expect(afterLoad.text).toBe(CARPENTRY_FIXTURE_TEXT);

    const sha256 = createHash('sha256').update(first.text, 'utf8').digest('hex');
    fs.mkdirSync(path.dirname(CARPENTRY_EVIDENCE_PATH), { recursive: true });
    fs.writeFileSync(CARPENTRY_EVIDENCE_PATH, `${JSON.stringify({
      task: 4,
      fixture: path.relative(process.cwd(), CARPENTRY_FIXTURE_PATH).replaceAll('\\', '/'),
      filename: first.download.suggestedFilename(),
      byteLength: Buffer.byteLength(first.text, 'utf8'),
      sha256,
      repeatByteIdentical: first.text === second.text,
      saveLoadByteIdentical: first.text === afterLoad.text,
      json: JSON.parse(first.text),
    }, null, 2)}\n`, 'utf8');
  });

  test('is state-pure across native serialization, one-step history, selection, and autosave', async ({ page }) => {
    await installExchangeDocument(page, CARPENTRY_FIXTURE);
    await page.evaluate(() => {
      const api = window.__floorplanify;
      api.snapshot();
      api.state.projectName = 'Mutation sentinel';
      api.state.selection = { type: 'wall', id: 'wall-1' };
      api.render();
    });
    await expect.poll(() => page.evaluate((key) => Boolean(localStorage.getItem(key)), AUTOSAVE_KEY))
      .toBe(true);
    await page.waitForTimeout(550);

    const nativeBeforePromise = page.waitForEvent('download');
    await page.evaluate(() => window.__floorplanify.saveJson());
    const nativeBefore = await downloadText(await nativeBeforePromise);
    const before = await page.evaluate((key) => ({
      autosave: localStorage.getItem(key),
      selection: window.__floorplanify.state.selection,
      undoDisabled: document.getElementById('undo').disabled,
      redoDisabled: document.getElementById('redo').disabled,
    }), AUTOSAVE_KEY);

    const first = await page.evaluate(() => window.__floorplanify.createCarpentryExportData());
    const second = await page.evaluate(() => window.__floorplanify.createCarpentryExportData());
    const diagnostics = await page.evaluate((data) => (
      window.__floorplanify.validateCarpentryExportability(data)
    ), first);
    expect(second).toEqual(first);
    expect(diagnostics.some(({ severity }) => severity === 'blocker')).toBe(false);

    const nativeAfterPromise = page.waitForEvent('download');
    await page.evaluate(() => window.__floorplanify.saveJson());
    const nativeAfter = await downloadText(await nativeAfterPromise);
    const after = await page.evaluate((key) => ({
      autosave: localStorage.getItem(key),
      selection: window.__floorplanify.state.selection,
      undoDisabled: document.getElementById('undo').disabled,
      redoDisabled: document.getElementById('redo').disabled,
    }), AUTOSAVE_KEY);

    expect(nativeAfter).toBe(nativeBefore);
    expect(JSON.parse(nativeAfter).version).toBe(3);
    expect(after).toEqual(before);
    expect(before).toMatchObject({
      selection: { type: 'wall', id: 'wall-1' },
      undoDisabled: false,
      redoDisabled: true,
    });

    await page.locator('#undo').click();
    await expect.poll(() => page.evaluate(() => window.__floorplanify.state.projectName))
      .toBe(CARPENTRY_FIXTURE.project.name);
    await expect(page.locator('#undo')).toBeDisabled();
    await expect(page.locator('#redo')).toBeEnabled();
    await page.locator('#redo').click();
    await expect.poll(() => page.evaluate(() => window.__floorplanify.state.projectName))
      .toBe('Mutation sentinel');
    await expect(page.locator('#redo')).toBeDisabled();
  });

  test('pins every contract geometry blocker and deterministic diagnostic ordering', async ({ page }) => {
    const fixtureCodes = {
      'branched-shell.json': 'branched_exterior_shell',
      'diagonal-wall.json': 'non_orthogonal_wall',
      'duplicate-edge.json': 'duplicate_edge',
      'interior-wall-outside-shell.json': 'interior_wall_outside_shell',
      'missing-wall-reference.json': 'missing_wall_reference',
      'nested-shell.json': 'nested_exterior_shell',
      'overlapping-openings.json': 'overlapping_openings',
      'redundant-corner.json': 'redundant_corner',
      'reversed-edge.json': 'duplicate_edge',
      'self-intersection.json': 'self_intersecting_shell',
      'touching-shells.json': 'touching_exterior_shells',
      'unclosed-shell.json': 'unclosed_exterior_shell',
    };
    const fixtureCases = Object.entries(fixtureCodes).map(([fileName, code]) => ({
      name: fileName,
      code,
      document: JSON.parse(fs.readFileSync(path.join(INVALID_FIXTURE_DIR, fileName), 'utf8')),
    }));

    const fixtureResults = await page.evaluate((cases) => cases.map(({ name, code, document }) => ({
      name,
      code,
      diagnostics: window.__floorplanify.validateCarpentryExportability(document),
    })), fixtureCases);
    for (const result of fixtureResults) {
      expect(result.diagnostics, result.name).toContainEqual(expect.objectContaining({
        severity: 'blocker',
        code: result.code,
      }));
      expect(result.diagnostics, `${result.name} must be deterministic`)
        .toEqual([...result.diagnostics].sort((left, right) => {
          const leftKey = [left.severity, left.code, ...(left.sourceIds || []), left.message].join('\0');
          const rightKey = [right.severity, right.code, ...(right.sourceIds || []), right.message].join('\0');
          return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
        }));
    }

    const syntheticResults = await page.evaluate((canonical) => {
      function clone() { return JSON.parse(JSON.stringify(canonical)); }
      const cases = [];
      cases.push({ name: 'malformed input', code: 'malformed_input', document: null });
      const empty = clone(); empty.project.walls = []; cases.push({ name: 'empty', code: 'missing_exterior_shell', document: empty });
      const interiors = clone(); interiors.project.walls.forEach((wall) => { wall.kind = 'interior'; });
      cases.push({ name: 'missing exterior', code: 'missing_exterior_shell', document: interiors });
      const nonFinite = clone(); nonFinite.project.walls[0].start.x = Number.POSITIVE_INFINITY;
      cases.push({ name: 'non-finite', code: 'non_finite_number', document: nonFinite });
      const zeroWall = clone(); zeroWall.project.walls[0].end = { ...zeroWall.project.walls[0].start };
      cases.push({ name: 'zero wall', code: 'zero_length_wall', document: zeroWall });
      const duplicateId = clone(); duplicateId.project.openings[0].id = 'wall-1';
      cases.push({ name: 'duplicate id', code: 'duplicate_id', document: duplicateId });
      const invalidRoom = clone(); invalidRoom.project.rooms[0].points = invalidRoom.project.rooms[0].points.slice(0, 2);
      cases.push({ name: 'room shape', code: 'invalid_room_shape', document: invalidRoom });
      const invalidStair = clone(); invalidStair.project.stairs = [{ id: 'stair-1', rect: { x: 1, y: 1, w: 0, h: 10 }, dir: 'up' }];
      cases.push({ name: 'stair rect', code: 'invalid_stair_rect', document: invalidStair });
      const invalidGuide = clone(); invalidGuide.project.guides = [{ id: 'guide-1', a: { x: 1, y: 1 }, b: { x: 1, y: 1 } }];
      cases.push({ name: 'guide length', code: 'zero_length_guide', document: invalidGuide });
      const invalidWidth = clone(); invalidWidth.project.openings[0].widthCm = 0;
      cases.push({ name: 'opening width', code: 'invalid_opening_width', document: invalidWidth });
      const outsideOpening = clone(); outsideOpening.project.openings[0].centerT = 0;
      cases.push({ name: 'opening outside', code: 'opening_outside_wall', document: outsideOpening });
      return cases.map(({ name, code, document }) => ({
        name,
        code,
        diagnostics: window.__floorplanify.validateCarpentryExportability(document),
      }));
    }, CARPENTRY_FIXTURE);

    for (const result of syntheticResults) {
      expect(result.diagnostics, result.name).toContainEqual(expect.objectContaining({
        severity: 'blocker',
        code: result.code,
      }));
    }
  });

  test('classifies two closed shells sharing one vertex as touching, not branched', async ({ page }) => {
    const trueBranch = JSON.parse(fs.readFileSync(
      path.join(INVALID_FIXTURE_DIR, 'branched-shell.json'),
      'utf8',
    ));
    const result = await page.evaluate(({ canonical, branch }) => {
      const sharedVertex = JSON.parse(JSON.stringify(canonical));
      sharedVertex.project.name = 'Shared vertex exterior shells';
      sharedVertex.project.walls = [
        { id: 'wall-a1', kind: 'exterior', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
        { id: 'wall-a2', kind: 'exterior', start: { x: 100, y: 0 }, end: { x: 100, y: 100 } },
        { id: 'wall-a3', kind: 'exterior', start: { x: 100, y: 100 }, end: { x: 0, y: 100 } },
        { id: 'wall-a4', kind: 'exterior', start: { x: 0, y: 100 }, end: { x: 0, y: 0 } },
        { id: 'wall-b1', kind: 'exterior', start: { x: 100, y: 100 }, end: { x: 200, y: 100 } },
        { id: 'wall-b2', kind: 'exterior', start: { x: 200, y: 100 }, end: { x: 200, y: 200 } },
        { id: 'wall-b3', kind: 'exterior', start: { x: 200, y: 200 }, end: { x: 100, y: 200 } },
        { id: 'wall-b4', kind: 'exterior', start: { x: 100, y: 200 }, end: { x: 100, y: 100 } },
      ];
      sharedVertex.project.rooms = [];
      sharedVertex.project.openings = [];
      const blockerCodes = (document) => window.__floorplanify
        .validateCarpentryExportability(document)
        .filter(({ severity }) => severity === 'blocker')
        .map(({ code }) => code);
      return {
        sharedVertex: blockerCodes(sharedVertex),
        trueBranch: blockerCodes(branch),
      };
    }, { canonical: CARPENTRY_FIXTURE, branch: trueBranch });

    expect(result.sharedVertex).toEqual(['touching_exterior_shells']);
    expect(result.trueBranch).toContain('branched_exterior_shell');
    expect(result.trueBranch).not.toContain('touching_exterior_shells');
  });

  test('classifies disconnected shared-vertex pairs independently', async ({ page }) => {
    const blockers = await page.evaluate((canonical) => {
      const document = JSON.parse(JSON.stringify(canonical));
      function touchingPair(prefix, offsetX) {
        return [
          { id: `${prefix}-1`, kind: 'exterior', start: { x: offsetX, y: 0 }, end: { x: offsetX + 100, y: 0 } },
          { id: `${prefix}-2`, kind: 'exterior', start: { x: offsetX + 100, y: 0 }, end: { x: offsetX + 100, y: 100 } },
          { id: `${prefix}-3`, kind: 'exterior', start: { x: offsetX + 100, y: 100 }, end: { x: offsetX, y: 100 } },
          { id: `${prefix}-4`, kind: 'exterior', start: { x: offsetX, y: 100 }, end: { x: offsetX, y: 0 } },
          { id: `${prefix}-5`, kind: 'exterior', start: { x: offsetX + 100, y: 100 }, end: { x: offsetX + 200, y: 100 } },
          { id: `${prefix}-6`, kind: 'exterior', start: { x: offsetX + 200, y: 100 }, end: { x: offsetX + 200, y: 200 } },
          { id: `${prefix}-7`, kind: 'exterior', start: { x: offsetX + 200, y: 200 }, end: { x: offsetX + 100, y: 200 } },
          { id: `${prefix}-8`, kind: 'exterior', start: { x: offsetX + 100, y: 200 }, end: { x: offsetX + 100, y: 100 } },
        ];
      }
      document.project.name = 'Two disconnected shared-vertex pairs';
      document.project.walls = [
        ...touchingPair('pair-a', 0),
        ...touchingPair('pair-b', 1000),
      ];
      document.project.rooms = [];
      document.project.openings = [];
      return window.__floorplanify.validateCarpentryExportability(document)
        .filter(({ severity }) => severity === 'blocker');
    }, CARPENTRY_FIXTURE);

    expect(blockers.map(({ code }) => code)).toEqual([
      'touching_exterior_shells',
      'touching_exterior_shells',
    ]);
    expect(blockers.map(({ sourceIds }) => sourceIds)).toEqual([
      Array.from({ length: 8 }, (_, index) => `pair-a-${index + 1}`),
      Array.from({ length: 8 }, (_, index) => `pair-b-${index + 1}`),
    ]);
  });

  test('keeps three-shell chains, cycle spurs, and degree-greater-than-four vertices branched', async ({ page }) => {
    const results = await page.evaluate((canonical) => {
      function base(walls) {
        const document = JSON.parse(JSON.stringify(canonical));
        document.project.walls = walls;
        document.project.rooms = [];
        document.project.openings = [];
        return document;
      }
      function square(prefix, x, y, size) {
        return [
          { id: `${prefix}-1`, kind: 'exterior', start: { x, y }, end: { x: x + size, y } },
          { id: `${prefix}-2`, kind: 'exterior', start: { x: x + size, y }, end: { x: x + size, y: y + size } },
          { id: `${prefix}-3`, kind: 'exterior', start: { x: x + size, y: y + size }, end: { x, y: y + size } },
          { id: `${prefix}-4`, kind: 'exterior', start: { x, y: y + size }, end: { x, y } },
        ];
      }
      const threeShellChain = base([
        ...square('chain-a', 0, 0, 100),
        ...square('chain-b', 100, 100, 100),
        ...square('chain-c', 200, 200, 100),
      ]);
      const cycleSpur = base([
        ...square('cycle', 0, 0, 100),
        { id: 'spur-1', kind: 'exterior', start: { x: 100, y: 0 }, end: { x: 200, y: 0 } },
      ]);
      const degreeSix = base([
        ...square('degree-a', 0, 0, 100),
        ...square('degree-b', 100, 100, 100),
        ...square('degree-c', 100, 100, -50),
      ]);
      const blockerCodes = (document) => window.__floorplanify
        .validateCarpentryExportability(document)
        .filter(({ severity }) => severity === 'blocker')
        .map(({ code }) => code);
      return {
        threeShellChain: blockerCodes(threeShellChain),
        cycleSpur: blockerCodes(cycleSpur),
        degreeSix: blockerCodes(degreeSix),
      };
    }, CARPENTRY_FIXTURE);

    for (const codes of Object.values(results)) {
      expect(codes).toContain('branched_exterior_shell');
      expect(codes).not.toContain('touching_exterior_shells');
    }
  });

  test('allows disjoint islands and reports preserved metadata as stable warnings', async ({ page }) => {
    const result = await page.evaluate((canonical) => {
      const document = JSON.parse(JSON.stringify(canonical));
      document.project.walls.push(
        { id: 'wall-5', kind: 'exterior', start: { x: 700, y: 0 }, end: { x: 800, y: 0 } },
        { id: 'wall-6', kind: 'exterior', start: { x: 800, y: 0 }, end: { x: 800, y: 100 } },
        { id: 'wall-7', kind: 'exterior', start: { x: 800, y: 100 }, end: { x: 700, y: 100 } },
        { id: 'wall-8', kind: 'exterior', start: { x: 700, y: 100 }, end: { x: 700, y: 0 } },
      );
      document.project.stairs.push({ id: 'stair-1', rect: { x: 10, y: 10, w: 80, h: 160 }, dir: 'up' });
      document.project.guides.push({ id: 'guide-1', a: { x: 0, y: 450 }, b: { x: 590, y: 450 } });
      document.project.openings[0].swing = 'right';
      document.project.openings[0].mirrored = true;
      const first = window.__floorplanify.validateCarpentryExportability(document);
      const second = window.__floorplanify.validateCarpentryExportability(document);
      return { first, second };
    }, CARPENTRY_FIXTURE);

    expect(result.first).toEqual(result.second);
    expect(result.first.filter(({ severity }) => severity === 'blocker')).toEqual([]);
    expect(result.first.map(({ code }) => code).filter((code) => code.startsWith('preserved_')))
      .toEqual([
        'preserved_guide_metadata',
        'preserved_mirror_metadata',
        'preserved_room_metadata',
        'preserved_stair_metadata',
        'preserved_swing_metadata',
      ]);
  });

  test('merges exterior segments split by an interior partition without moving openings', async ({ page }) => {
    await installExchangeDocument(page, CARPENTRY_FIXTURE);

    const result = await page.evaluate(() => {
      const api = window.__floorplanify;
      api.addWall({ x: 200, y: 0 }, { x: 200, y: 390 }, 'part');
      const document = api.createCarpentryExportData();
      const opening = document.project.openings.find(({ id }) => id === 'door-1');
      const wall = document.project.walls.find(({ id }) => id === opening.wallId);
      return {
        nativeWallCount: api.state.walls.length,
        document,
        blockerCodes: api.validateCarpentryExportability(document)
          .filter(({ severity }) => severity === 'blocker')
          .map(({ code }) => code),
        openingCenter: {
          x: wall.start.x + (wall.end.x - wall.start.x) * opening.centerT,
          y: wall.start.y + (wall.end.y - wall.start.y) * opening.centerT,
        },
      };
    });

    expect(result.nativeWallCount).toBe(7);
    expect(result.document.project.walls.filter(({ kind }) => kind === 'exterior')).toHaveLength(4);
    expect(result.document.project.walls.filter(({ kind }) => kind === 'interior')).toHaveLength(1);
    expect(result.document.project.openings[0]).toMatchObject({
      id: 'door-1',
      centerT: 0.5,
    });
    expect(result.openingCenter).toEqual({ x: 295, y: 0 });
    expect(result.blockerCodes).toEqual([]);
  });

  test('blocks Carpentry downloads whose canonical UTF-8 output exceeds 10 MiB', async ({ page }) => {
    await installExchangeDocument(page, CARPENTRY_FIXTURE);
    const noDownload = page.waitForEvent('download', { timeout: 1000 })
      .then(() => false, () => true);
    const result = await page.evaluate(() => {
      const api = window.__floorplanify;
      const previousName = api.state.projectName;
      const previousEnd = { ...api.state.walls[0].b };
      api.state.projectName = 'ø'.repeat(5 * 1024 * 1024);
      api.state.walls[0].b.y = 1;
      try {
        return api.downloadCarpentryExport();
      } finally {
        api.state.projectName = previousName;
        api.state.walls[0].b = previousEnd;
      }
    });

    expect(await noDownload).toBe(true);
    expect(result).toMatchObject({ downloaded: false, blockerCount: 1 });
    expect(result.diagnostics).toEqual([{
      severity: 'blocker',
      code: 'file_too_large',
      message: 'Carpentry exchange file exceeds 10 MiB.',
      sourceIds: [],
    }]);
  });

  test('allows a Carpentry download whose canonical UTF-8 output is exactly 10 MiB', async ({ page }) => {
    await installExchangeDocument(page, CARPENTRY_FIXTURE);
    const preparedSize = await page.evaluate(() => {
      const api = window.__floorplanify;
      api.state.projectName = '';
      const emptyNameText = JSON.stringify(api.createCarpentryExportData(), null, 2) + '\n';
      const emptyNameBytes = new Blob([emptyNameText]).size;
      api.state.projectName = 'a'.repeat(10 * 1024 * 1024 - emptyNameBytes);
      const exactText = JSON.stringify(api.createCarpentryExportData(), null, 2) + '\n';
      return new Blob([exactText]).size;
    });
    expect(preparedSize).toBe(10 * 1024 * 1024);

    const result = await page.evaluate(() => window.__floorplanify.downloadCarpentryExport());
    expect(result).toMatchObject({ downloaded: true, blockerCount: 0 });
  });

  test('coerces numeric native entity IDs and wall references at the exchange boundary', async ({ page }) => {
    const native = {
      version: 3,
      projectName: 'Numeric native IDs',
      roomInfo: 'both',
      scale: 0,
      units: 'auto',
      snap: 10,
      openingWidths: { door: 90, window: 120 },
      walls: CARPENTRY_FIXTURE.project.walls.map((wall, index) => ({
        id: index + 1,
        a: wall.start,
        b: wall.end,
        type: 'ext',
      })),
      rooms: [{
        id: 5,
        name: 'Numeric room',
        points: CARPENTRY_FIXTURE.project.rooms[0].points,
        color: '#f3c45d',
      }],
      openings: [{
        id: 6,
        wallId: 1,
        t: 0.5,
        type: 'door',
        width: 90,
        swing: 'left',
        mirror: false,
      }],
      stairs: [{ id: 7, rect: { x: 50, y: 50, w: 80, h: 160 }, dir: 'up' }],
      guides: [{ id: 8, a: { x: 0, y: 450 }, b: { x: 590, y: 450 } }],
      nextId: 9,
    };
    await page.locator('#loadJsonInput').setInputFiles({
      name: 'numeric-native-v3.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(native)),
    });
    await expect.poll(() => page.evaluate(() => window.__floorplanify.state.walls.length)).toBe(4);

    const result = await page.evaluate(() => {
      const api = window.__floorplanify;
      const document = api.createCarpentryExportData();
      const entities = [
        ...document.project.walls,
        ...document.project.rooms,
        ...document.project.openings,
        ...document.project.stairs,
        ...document.project.guides,
      ];
      return {
        ids: entities.map(({ id }) => id),
        wallIds: document.project.openings.map(({ wallId }) => wallId),
        exportedWallIds: document.project.walls.map(({ id }) => id),
        blockers: api.validateCarpentryExportability(document)
          .filter(({ severity }) => severity === 'blocker'),
      };
    });

    expect(result.ids.every((id) => typeof id === 'string')).toBe(true);
    expect(result.wallIds.every((id) => typeof id === 'string')).toBe(true);
    expect(result.exportedWallIds).toContain(result.wallIds[0]);
    expect(result.blockers).toEqual([]);

    const download = await callCarpentryDownload(page);
    expect(download.result).toMatchObject({ downloaded: true, blockerCount: 0 });
  });

  test('keeps string-colliding native wall IDs visible to duplicate validation', async ({ page }) => {
    await installExchangeDocument(page, CARPENTRY_FIXTURE);
    const result = await page.evaluate(() => {
      const api = window.__floorplanify;
      api.state.walls = [
        { id: 1, a: { x: 0, y: 0 }, b: { x: 295, y: 0 }, type: 'ext' },
        { id: '1', a: { x: 295, y: 0 }, b: { x: 590, y: 0 }, type: 'ext' },
        ...api.state.walls.slice(1),
      ];
      api.state.openings = [];
      const document = api.createCarpentryExportData();
      return {
        topWallIds: document.project.walls
          .filter(({ start, end }) => start.y === 0 && end.y === 0)
          .map(({ id }) => id),
        blockers: api.validateCarpentryExportability(document)
          .filter(({ severity }) => severity === 'blocker'),
      };
    });

    expect(result.topWallIds).toEqual(['1', '1']);
    expect(result.blockers).toContainEqual(expect.objectContaining({
      code: 'duplicate_id',
      sourceIds: ['1'],
    }));
  });

  test('does not merge away an exterior ID that collides with another entity kind', async ({ page }) => {
    await installExchangeDocument(page, CARPENTRY_FIXTURE);
    const result = await page.evaluate(() => {
      const api = window.__floorplanify;
      api.addWall({ x: 200, y: 0 }, { x: 200, y: 390 }, 'part');
      const interior = api.state.walls.find(({ type }) => type === 'part');
      interior.id = 'wall-1';
      const document = api.createCarpentryExportData();
      const allIds = [
        ...document.project.walls,
        ...document.project.rooms,
        ...document.project.openings,
        ...document.project.stairs,
        ...document.project.guides,
      ].map(({ id }) => id);
      return {
        collisionCount: allIds.filter((id) => id === 'wall-1').length,
        blockers: api.validateCarpentryExportability(document)
          .filter(({ severity }) => severity === 'blocker'),
      };
    });

    expect(result.collisionCount).toBe(2);
    expect(result.blockers).toContainEqual(expect.objectContaining({
      code: 'duplicate_id',
      sourceIds: ['wall-1'],
    }));
  });

  test('blocks only Carpentry download for a diagonal plan while JSON and SVG remain available', async ({ page }) => {
    const diagonal = JSON.parse(fs.readFileSync(
      path.join(INVALID_FIXTURE_DIR, 'diagonal-wall.json'),
      'utf8',
    ));
    await installExchangeDocument(page, diagonal);

    const noCarpentryDownload = page.waitForEvent('download', { timeout: 600 })
      .then(() => false, () => true);
    const result = await page.evaluate(() => window.__floorplanify.downloadCarpentryExport());
    expect(await noCarpentryDownload).toBe(true);
    expect(result).toMatchObject({ downloaded: false, blockerCount: 1 });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      severity: 'blocker',
      code: 'non_orthogonal_wall',
      sourceIds: ['wall-1'],
    }));

    await expect(page.locator('#exportSvg')).toBeEnabled();
    const nativeDownloadPromise = page.waitForEvent('download');
    await page.evaluate(() => window.__floorplanify.saveJson());
    const nativeText = await downloadText(await nativeDownloadPromise);
    expect(JSON.parse(nativeText).version).toBe(3);

    const svgDownloadPromise = page.waitForEvent('download');
    await page.locator('#exportMenuButton').click();
    await page.locator('#exportSvg').click();
    const svgDownload = await svgDownloadPromise;
    expect(svgDownload.suggestedFilename()).toMatch(/\.svg$/);
  });
});

test.describe('Carpentry integration control', () => {
  test('is a single collapsed chrome menu with keyboard and focus access', async ({ page }) => {
    const menu = page.locator('#integrationsMenu');
    const trigger = page.locator('#integrationsMenuButton');
    const button = menu.locator(':scope > #exportCarpentry');

    await expect(menu).toHaveCount(1);
    await expect(trigger).toHaveText('Integrasjoner');
    await expect(trigger).toHaveAttribute('aria-controls', 'integrationsMenu');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(menu.locator('button')).toHaveCount(1);
    await expect(button).toHaveText('Eksporter til Carpentry');
    await expect(menu).toBeHidden();
    await expect(button).toBeHidden();

    await trigger.focus();
    await expect(trigger).toBeFocused();
    const focusOutline = await trigger.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(focusOutline.style).not.toBe('none');
    expect(focusOutline.width).toBeGreaterThan(0);

    await trigger.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();

    await trigger.press('Space');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
    await expect(button).toBeHidden();
    await trigger.press('Space');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(button).toBeVisible();
  });

  test('enables with content and reports the download and warning counts', async ({ page }) => {
    const trigger = page.locator('#integrationsMenuButton');
    const button = page.locator('#exportCarpentry');

    await expect(button).toBeDisabled();
    await installExchangeDocument(page, CARPENTRY_FIXTURE);
    await expect(button).toBeEnabled();
    await expect(page.locator('#exportPdf')).toBeEnabled();
    await expect(page.locator('#exportPng')).toBeEnabled();
    await expect(page.locator('#exportSvg')).toBeEnabled();

    const warningCount = await page.evaluate(() => window.__floorplanify
      .validateCarpentryExportability(window.__floorplanify.createCarpentryExportData())
      .filter(({ severity }) => severity === 'warning').length);
    await trigger.click();
    const downloadPromise = page.waitForEvent('download');
    await button.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.carpentry\.json$/);
    await expect(page.locator('#st-hint')).toHaveText(
      `Carpentry-eksport lastet ned · 1 eksport · ${warningCount} varsler.`,
    );
  });

  test('reports the first blocker without a Carpentry download or native export regression', async ({ page }) => {
    const diagonal = JSON.parse(fs.readFileSync(
      path.join(INVALID_FIXTURE_DIR, 'diagonal-wall.json'),
      'utf8',
    ));
    await installExchangeDocument(page, diagonal);

    const trigger = page.locator('#integrationsMenuButton');
    const button = page.locator('#exportCarpentry');
    await trigger.click();
    await expect(button).toBeEnabled();
    const firstBlocker = await page.evaluate(() => window.__floorplanify
      .validateCarpentryExportability(window.__floorplanify.createCarpentryExportData())
      .find(({ severity }) => severity === 'blocker').code);
    const noDownload = page.waitForEvent('download', { timeout: 600 })
      .then(() => false, () => true);
    await button.click();

    expect(await noDownload).toBe(true);
    await expect(page.locator('#st-hint')).toHaveText(
      `Carpentry-eksport blokkert · ${firstBlocker}`,
    );
    await expect(page.locator('#exportPdf')).toBeEnabled();
    await expect(page.locator('#exportPng')).toBeEnabled();
    await expect(page.locator('#exportSvg')).toBeEnabled();
  });

  test('preserves existing control order and stays compact without clipping', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const toolbar = page.locator('#toolbar');
    const menu = page.locator('#integrationsMenu');
    const trigger = page.locator('#integrationsMenuButton');
    const menuLabels = await toolbar.locator(':scope > .chrome-menu-wrap > .menu-button').allTextContents();
    expect(menuLabels).toEqual(['Vis', 'Eksporter', 'Integrasjoner']);
    const integrationNeighbors = await trigger.evaluate((element) => ({
      previous: element.parentElement.previousElementSibling?.querySelector('.menu-button')?.textContent?.trim(),
      next: element.parentElement.nextElementSibling?.textContent?.trim(),
    }));
    expect(integrationNeighbors).toEqual({ previous: 'Eksporter', next: 'Tøm' });

    const desktopLayout = await page.evaluate(() => {
      const toolbarElement = document.getElementById('toolbar');
      return {
        overflowX: toolbarElement.scrollWidth > toolbarElement.clientWidth,
        height: toolbarElement.getBoundingClientRect().height,
      };
    });
    expect(desktopLayout.overflowX).toBe(false);
    expect(desktopLayout.height).toBeLessThanOrEqual(60);

    const blankToolbarLayout = await measureToolbarAgainstIntegrationBaseline(page);
    expectToolbarToMatchIntegrationBaseline(blankToolbarLayout);

    await installExchangeDocument(page, CARPENTRY_FIXTURE);
    const populatedToolbarLayout = await measureToolbarAgainstIntegrationBaseline(page);
    expectToolbarToMatchIntegrationBaseline(populatedToolbarLayout);

    for (const width of [375, 768, 840, 900, 960, 1024, 1100, 1180, 1280]) {
      await page.setViewportSize({ width, height: 720 });
      await page.evaluate(() => window.dispatchEvent(new MouseEvent('click')));
      await trigger.scrollIntoViewIfNeeded();
      await trigger.focus();
      await trigger.press('Enter');
      const bounds = await menu.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      });
      const overflow = await page.evaluate(() => ({
        bodyX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }));
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(width);
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom).toBeLessThanOrEqual(720);
      expect(overflow.bodyX).toBe(false);
    }
  });
});
