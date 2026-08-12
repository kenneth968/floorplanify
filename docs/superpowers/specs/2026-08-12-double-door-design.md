# Double Door — Design

**Date:** 2026-08-12  
**Status:** Approved design, pending written-spec review  
**Scope:** `floorplanify.html` and its automated tests

## Purpose

Allow a user drawing a sea house to represent a wide, two-leaf hinged boat
door. The door must have a configurable total opening width and remain
editable as either a single or double door before and after placement.

## User experience

- When the door tool is active, the toolbar shows a door-type selector with
  `Enkel` and `Dobbel` choices beside the existing width input.
- The existing width input continues to use centimeters and represents the
  total clear wall opening. For example, a 400 cm double door has two 200 cm
  leaves.
- The placement preview uses the selected door type and total width.
- An existing door can be converted between single and double in the object
  sidebar. Its position and total width do not change during conversion.
- A double door is drawn as two equal leaves that meet at the opening center
  and are hinged at the two outside jambs.
- The existing swing setting controls which side of the wall both leaves open
  toward.
- The single-door hinge-side control is hidden for double doors because both
  outside jambs are hinges. Its stored value is retained so converting the
  door back to single restores the prior hinge side.
- Width remains constrained to at least 10 cm and at most the available wall
  length minus the existing endpoint clearance.

## Data model and compatibility

Each door opening gains:

```js
doorStyle: 'single' | 'double'
```

`single` is the default for new doors unless the user selects `double`.
Windows do not use this property. Missing, invalid, or legacy values normalize
to `single`, so existing native JSON files and autosaved plans keep their
current appearance and behavior.

The property must be preserved through every native state path:

- save and load;
- autosave restoration;
- undo and redo snapshots;
- direct duplication;
- wall, room, and standalone opening copy/paste flows.

No native save-format version bump is needed because the current normalizer is
already responsible for applying defaults to optional properties.

## Rendering

The wall gap, hit target, selection highlight, and width clamping continue to
use the total opening width for both styles.

Single doors keep the existing rendering unchanged. Double doors render:

- one closed leaf from the first jamb to the center;
- one closed leaf from the second jamb to the center;
- one hinge marker at each jamb;
- one half-width swing arc per leaf, with both arcs opening toward the side
  selected by the existing swing setting.

The same geometry must be used by the interactive canvas and the generated
print/export SVG so PDF, PNG, and SVG output match the editor. The hover
preview must also show both leaves.

## Carpentry export

The optional Carpentry v1 contract remains unchanged. It is a closed-world
format whose opening schema has no door-style field. A double door therefore
exports as one `kind: 'door'` opening with its correct total `widthCm`, wall,
position, swing, and mirrored values, but without double-leaf metadata.

This limitation affects only the optional Carpentry handoff. Native JSON and
visual PDF, PNG, and SVG exports preserve the double-door representation.
Adding style metadata to Carpentry requires a separately designed v2 contract
and is outside this feature's scope.

## Validation and failure behavior

- Invalid door-style values loaded from data become `single`.
- Changing style never changes width or position.
- Width inputs continue to use the existing wall-length clamp.
- A double door on a wall too short for its requested width uses the same
  clamped total width as a single door.
- Windows cannot be assigned a door style through the UI or mutation path.

## Testing

Automated browser tests will prove that:

- a double door can be selected before placement with a wide total width;
- placement stores `doorStyle: 'double'` and the requested width;
- the canvas renders two leaves and two swing arcs;
- an existing single door can be converted to double without changing width
  or position;
- native save/load preserves the style;
- duplication and copy/paste preserve the style;
- generated export SVG contains the double-leaf geometry;
- an existing plan without `doorStyle` loads as a single door;
- Carpentry v1 still exports the correct total width without changing its
  schema.

Focused tests will be added beside the current door placement and persistence
coverage in `tests/floorplanify-core.spec.js`. Static smoke assertions will
cover preservation through the copy paths where browser-level setup would add
noise without improving behavioral confidence.

## Out of scope

- Sliding, overhead, folding, or roll-up boat-door mechanisms.
- Unequal leaf widths or independently controlled leaves.
- Door height or elevation views.
- A Carpentry v2 schema.
- A separate double-door drawing tool or toolbar button.
