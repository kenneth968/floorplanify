#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'floorplanify.html'), 'utf8');

function requireMatch(pattern, message) {
  assert.match(html, pattern, message);
}

function requireNoMatch(pattern, message) {
  assert.doesNotMatch(html, pattern, message);
}

function requireFunctionMatch(name, pattern, message) {
  const start = html.indexOf(`function ${name}(`);
  assert.notStrictEqual(start, -1, `${name} should exist`);
  const next = html.indexOf('\n  function ', start + 1);
  const source = html.slice(start, next === -1 ? html.length : next);
  assert.match(source, pattern, message);
}

function htmlBetween(startNeedle, endNeedle) {
  const start = html.indexOf(startNeedle);
  assert.notStrictEqual(start, -1, `${startNeedle} should exist`);
  const end = html.indexOf(endNeedle, start + startNeedle.length);
  assert.notStrictEqual(end, -1, `${endNeedle} should exist after ${startNeedle}`);
  return html.slice(start, end);
}

requireNoMatch(
  /Find existing walls with length within \(snap\) of the given length/,
  'length-match helper should not keep the stale duplicate comment'
);

requireMatch(
  /function clearLengthMatchHints\(\)/,
  'wall-chain completion should use a shared length-match hint cleanup helper'
);

requireMatch(
  /function openingPlacementForPointer\(/,
  'door/window placement should resolve the same snapped t used by the hover preview'
);

requireMatch(
  /openingPlacementForPointer\(cm,\s*tool\)/,
  'door/window click placement should use the snap-aware placement helper'
);

requireMatch(
  /copy\.mirror = src\.mirror === true/,
  'duplicated doors should preserve mirrored hinge side'
);

requireMatch(
  /kind:\s*'opening'/,
  'selected doors and windows should support drag state'
);

requireMatch(
  /dragSelection\.kind === 'opening'/,
  'mousemove should drag selected doors and windows along their wall'
);

requireMatch(
  /o\.t\s*=\s*o\.t\s*\/\s*t/,
  'wall splitting should renormalize openings that remain on the original wall'
);

requireMatch(
  /\(o\.t\s*-\s*t\)\s*\/\s*\(1\s*-\s*t\)/,
  'wall splitting should renormalize openings moved to the new split wall'
);

requireFunctionMatch(
  'wallOpeningCopies',
  /mirror:\s*o\.mirror\s*===\s*true/,
  'wall clipboard copies of openings should preserve mirrored hinge side'
);

requireFunctionMatch(
  'roomOpeningCopies',
  /mirror:\s*o\.mirror\s*===\s*true/,
  'room clipboard copies of openings should preserve mirrored hinge side'
);

requireFunctionMatch(
  'clipboardItemFor',
  /kind:\s*'opening'[\s\S]*mirror:\s*obj\.mirror\s*===\s*true/,
  'standalone opening clipboard copies should preserve mirrored hinge side'
);

requireFunctionMatch(
  'addWallOpeningCopies',
  /opening\.mirror\s*=\s*c\.mirror\s*===\s*true/,
  'pasted copied wall openings should restore mirrored hinge side'
);

requireFunctionMatch(
  'addRoomOpeningCopies',
  /opening\.mirror\s*=\s*c\.mirror\s*===\s*true/,
  'pasted copied room openings should restore mirrored hinge side'
);

requireFunctionMatch(
  'pasteClipboardItem',
  /opening\.mirror\s*=\s*item\.mirror\s*===\s*true/,
  'pasted standalone openings should restore mirrored hinge side'
);

requireFunctionMatch(
  'pasteClipboardAt',
  /opening\.mirror\s*=\s*item\.mirror\s*===\s*true/,
  'openings pasted onto a chosen wall should restore mirrored hinge side'
);

requireMatch(
  /function applySidebarHover\(type,\s*id\)/,
  'sidebar hover sync should use a dataset-filtered helper for arbitrary imported ids'
);

requireFunctionMatch(
  'applySidebarHover',
  /querySelectorAll\('\.object-row\.hover,\s*\.wall-pill\.hover'\)/,
  'sidebar hover sync should clear hover from rows and compact wall pills'
);

requireFunctionMatch(
  'applySidebarHover',
  /querySelectorAll\('\[data-type\]\[data-id\]'\)/,
  'sidebar hover sync should match the always-rendered sidebar item controls'
);

requireNoMatch(
  /querySelectorAll\('\[data-side-type="\s*'\s*\+\s*type\s*\+\s*'"\]\[data-side-id="\s*'\s*\+\s*id\s*\+\s*'"\]'\)/,
  'sidebar hover sync should not interpolate raw ids into a CSS attribute selector'
);

requireNoMatch(
  /newHoverId\.split\(':'\)/,
  'sidebar hover sync should not split colon-containing imported ids'
);

requireMatch(
  /function zoomFit\(\) \{\s*if \(!currentPlanHasContent\(\)\)/,
  'zoomFit should use the common content check so measurement guides are included'
);

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
  /id="viewMenu"[^>]*role="group"[^>]*aria-labelledby="viewMenuButton"/,
  'View flyout should expose grouped controls instead of ARIA menu semantics'
);

requireMatch(
  /id="exportMenuButton"[\s\S]*aria-controls="exportMenu"[\s\S]*id="exportMenu"[\s\S]*id="scale"[\s\S]*id="units"[\s\S]*id="exportPdf"[\s\S]*id="exportPng"[\s\S]*id="exportSvg"[\s\S]*id="printFitInfo"/,
  'print scale, units, export commands, and fit status should be grouped in the Export menu'
);

requireMatch(
  /id="exportMenu"[^>]*role="group"[^>]*aria-labelledby="exportMenuButton"/,
  'Export flyout should expose grouped controls instead of ARIA menu semantics'
);

requireNoMatch(
  /id="(?:viewMenu|exportMenu)"[^>]*role="menu"/,
  'chrome flyouts should not use ARIA menu roles for mixed form controls'
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

const chromeMenuSource = htmlBetween('  function setupChromeMenus() {', '  function syncOpeningWidthInput() {');
assert.doesNotMatch(
  chromeMenuSource,
  /document\.addEventListener\('keydown'/,
  'chrome menu Escape handling should stay in the main keyboard path'
);

const keyboardSource = htmlBetween('  // === KEYBOARD ===', '    const k = evt.key.toLowerCase();');
const menuEscapeIndex = keyboardSource.indexOf("evt.key === 'Escape' && closeOpenChromeMenus()");
const inputGuardIndex = keyboardSource.indexOf("evt.target.tagName === 'INPUT'");
const drawingEscapeIndex = keyboardSource.indexOf("if (evt.key === 'Escape') {", menuEscapeIndex + 1);
assert.notStrictEqual(menuEscapeIndex, -1, 'main keyboard handler should close open chrome menus on Escape');
assert(menuEscapeIndex < inputGuardIndex, 'chrome menu Escape should run before form-field keyboard guard');
assert(menuEscapeIndex < drawingEscapeIndex, 'chrome menu Escape should run before drawing/selection Escape behavior');

console.log('smoke tests passed');
