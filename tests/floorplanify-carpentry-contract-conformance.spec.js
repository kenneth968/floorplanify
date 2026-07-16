import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const FIXTURE_PATH = path.resolve('tests/fixtures/floorplanify-carpentry-v1.json');
const FIXTURE_BYTES = fs.readFileSync(FIXTURE_PATH);
const FIXTURE = JSON.parse(FIXTURE_BYTES.toString('utf8'));
const FIXTURE_SHA256 = '28f871813403d63247b47369357030cb14662b454a64950852bdafe65743dcb9';

async function openFloorplan(page) {
  await page.goto('/floorplanify.html');
  await expect(page.locator('#canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(window.__floorplanify))).toBe(true);
}

async function installCanonicalState(page) {
  await page.evaluate((payload) => {
    const api = window.__floorplanify;
    const project = payload.project;
    api.state.projectName = project.name;
    api.state.walls = project.walls.map((wall) => ({
      id: wall.id,
      a: { ...wall.start },
      b: { ...wall.end },
      type: wall.kind === 'interior' ? 'part' : 'ext',
    }));
    api.state.rooms = project.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      points: room.points.map((point) => ({ ...point })),
      color: '#f3c45d',
    }));
    api.state.openings = project.openings.map((opening) => ({
      id: opening.id,
      wallId: opening.wallId,
      t: opening.centerT,
      type: opening.kind,
      width: opening.widthCm,
      swing: opening.swing,
      mirror: opening.mirrored,
    }));
    api.state.stairs = project.stairs.map((stair) => ({
      id: stair.id,
      rect: { ...stair.rect },
      dir: stair.dir,
    }));
    api.state.guides = project.guides.map((guide) => ({
      id: guide.id,
      a: { ...guide.a },
      b: { ...guide.b },
    }));
    api.state.nextId = 1000;
    api.state.selection = null;
    api.state.multiSel.clear();
    api.render();
  }, FIXTURE);
}

async function downloadBytes(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function downloadCarpentryBytes(page) {
  const pending = page.waitForEvent('download');
  await page.evaluate(() => window.__floorplanify.downloadCarpentryExport());
  return downloadBytes(await pending);
}

test.beforeEach(async ({ page }) => {
  await openFloorplan(page);
});

test('keeps canonical v1 bytes across repeat export and page reload plus native-v3 load', async ({ page }) => {
  // Given
  await installCanonicalState(page);

  // When
  const first = await downloadCarpentryBytes(page);
  const repeated = await downloadCarpentryBytes(page);
  const nativePending = page.waitForEvent('download');
  await page.evaluate(() => window.__floorplanify.saveJson());
  const nativeBytes = await downloadBytes(await nativePending);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(window.__floorplanify))).toBe(true);
  await page.locator('#loadJsonInput').setInputFiles({
    name: 'canonical-native-v3.json',
    mimeType: 'application/json',
    buffer: nativeBytes,
  });
  await expect.poll(() => page.evaluate(
    () => window.__floorplanify.state.walls.length,
  )).toBe(4);
  const afterReload = await downloadCarpentryBytes(page);

  // Then
  for (const bytes of [first, repeated, afterReload]) {
    expect(bytes.equals(FIXTURE_BYTES)).toBe(true);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(FIXTURE_SHA256);
    expect(JSON.parse(bytes.toString('utf8')).version).toBe(1);
  }
  expect(JSON.parse(nativeBytes.toString('utf8')).version).toBe(3);
});

test('pins fresh sender output to v1 after a caller mutates a returned document', async ({ page }) => {
  // Given
  await installCanonicalState(page);

  // When
  const versions = await page.evaluate(() => {
    const first = window.__floorplanify.createCarpentryExportData();
    first.version = 2;
    first.futureField = 'must-not-stick';
    const fresh = window.__floorplanify.createCarpentryExportData();
    return {
      mutated: first.version,
      fresh: fresh.version,
      freshHasFutureField: Object.hasOwn(fresh, 'futureField'),
    };
  });
  const freshBytes = await downloadCarpentryBytes(page);

  // Then
  expect(versions).toEqual({ mutated: 2, fresh: 1, freshHasFutureField: false });
  expect(freshBytes.equals(FIXTURE_BYTES)).toBe(true);
});
