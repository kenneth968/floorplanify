#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'floorplanify.html'), 'utf8');
const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');

assert.match(
  gitignore,
  /^\.omo\/$/m,
  'generated browser-test evidence should stay out of git status'
);

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

requireFunctionMatch(
  'duplicateObject',
  /if \(copy\.type === 'door'\) copy\.doorStyle = openingDoorStyle\(src\)/,
  'duplicated doors should preserve door style without adding it to windows'
);

requireFunctionMatch('wallOpeningCopies', /\.\.\.\(o\.type === 'door' \? \{ doorStyle:\s*openingDoorStyle\(o\) \} : \{\}\)/,
  'wall clipboard copies should preserve door style only for doors');
requireFunctionMatch('roomOpeningCopies', /\.\.\.\(o\.type === 'door' \? \{ doorStyle:\s*openingDoorStyle\(o\) \} : \{\}\)/,
  'room clipboard copies should preserve door style only for doors');
requireFunctionMatch('clipboardItemFor', /kind:\s*'opening'[\s\S]*\.\.\.\(obj\.type === 'door' \? \{ doorStyle:\s*openingDoorStyle\(obj\) \} : \{\}\)/,
  'standalone opening clipboard copies should preserve door style only for doors');
requireFunctionMatch('addWallOpeningCopies', /if \(opening\.type === 'door'\) opening\.doorStyle\s*=\s*normalizeDoorStyle\(c\.doorStyle\)/,
  'pasted wall openings should restore door style only for doors');
requireFunctionMatch('addRoomOpeningCopies', /if \(opening\.type === 'door'\) opening\.doorStyle\s*=\s*normalizeDoorStyle\(c\.doorStyle\)/,
  'pasted room openings should restore door style only for doors');
requireFunctionMatch('pasteClipboardItem', /if \(opening\.type === 'door'\) opening\.doorStyle\s*=\s*normalizeDoorStyle\(item\.doorStyle\)/,
  'pasted standalone openings should restore door style only for doors');
requireFunctionMatch('pasteClipboardAt', /if \(opening\.type === 'door'\) opening\.doorStyle\s*=\s*normalizeDoorStyle\(item\.doorStyle\)/,
  'openings pasted onto a chosen wall should restore door style only for doors');

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

console.log('smoke tests passed');
