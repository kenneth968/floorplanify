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
  /function zoomFit\(\) \{\s*if \(!currentPlanHasContent\(\)\)/,
  'zoomFit should use the common content check so measurement guides are included'
);

console.log('smoke tests passed');
