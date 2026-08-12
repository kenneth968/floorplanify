# Floorplanify-to-Carpentry exchange contract v1

Status: frozen sender-owned contract for `floorplanify.carpentry` version `1`.

This document defines the file emitted by Floorplanify for Carpentry import. It is
not Floorplanify's version-3 save format and it is not Carpentry's
`PlanProjectSpec`. A conforming v1 reader validates the entire payload before it
returns any project data.

## Transport and canonical encoding

- The file is exactly one JSON object encoded as UTF-8 without a byte-order mark.
- The maximum accepted size is `10 * 1024 * 1024` UTF-8 bytes (10 MiB), measured
  on the raw file bytes before decoding or JSON parsing. A file larger than that
  is rejected with `file_too_large`.
- Duplicate JSON object keys are rejected; a later key never replaces an earlier
  key.
- JSON numbers must be finite. `NaN`, `Infinity`, and `-Infinity` are not JSON
  values and are rejected.
- Sender output uses two spaces per indentation level, LF (`\n`) line endings,
  and exactly one final LF. It emits Unicode as UTF-8 rather than ASCII escape
  sequences except where JSON escaping is required.
- Object keys are emitted in the order specified in the field tables below.
  Entity arrays are sorted by `id` in Unicode code-point order. Polygon point
  order and directed endpoints are preserved. `diagnostics` is sorted by
  `severity`, then `code`, `path`, and `message`, all in Unicode code-point order.
- Identical accepted input state therefore produces byte-identical output. The
  sender does not include an export timestamp or generate an export UUID.

The canonical fixture is
`tests/fixtures/floorplanify-carpentry-v1.json`. It represents one 590 cm by
390 cm exterior shell with four walls, one room zone, and one 90 cm door.

## Closed-world schema

Every key listed as required is mandatory. No additional key is allowed at any
level in version 1. Unknown keys are rejected with `unknown_field`; missing keys
are rejected with `missing_field`. JSON `null` is not valid for any v1 field.

### Root

Key order: `format`, `version`, `source`, `project`, `diagnostics`.

| Key | Type | Required value or rule |
| --- | --- | --- |
| `format` | string | Exactly `floorplanify.carpentry`. |
| `version` | integer | Exactly `1`. Booleans are not integers. |
| `source` | object | Source coordinate and application metadata below. |
| `project` | object | Sender project below. |
| `diagnostics` | array | Zero or more sender diagnostics below. |

`format` identifies this exchange independently of either application's native
save format. An unknown `format` is `unsupported_format`; any version other than
integer `1` is `unsupported_version`.

### `source`

Key order: `application`, `planVersion`, `units`, `xAxis`, `yAxis`, `origin`.

| Key | Type | Required value or rule |
| --- | --- | --- |
| `application` | string | Exactly `Floorplanify`. |
| `planVersion` | integer | Positive Floorplanify native-plan version; v1 canonical output uses `3`. |
| `units` | string | Exactly `cm`. All coordinates and lengths in this payload are centimeters. |
| `xAxis` | string | Exactly `right`. |
| `yAxis` | string | Exactly `down`. |
| `origin` | string | Exactly `floorplan-canvas`. |

Coordinates retain the Floorplanify canvas origin without translation. A
receiver converts centimeters to meters and, when mapping to a y-up system,
negates y. It must not infer a new origin or normalize the source bounds.

### `project`

Key order: `name`, `walls`, `rooms`, `openings`, `stairs`, `guides`.

| Key | Type | Rule |
| --- | --- | --- |
| `name` | string | Floorplanify project name; may be empty and is preserved verbatim. |
| `walls` | array of wall objects | Must contain at least one exterior shell. |
| `rooms` | array of room objects | Source room-zone metadata; not floor-shell input. |
| `openings` | array of opening objects | Doors and windows attached to walls. |
| `stairs` | array of stair objects | Source stair rectangles and direction. |
| `guides` | array of guide objects | Source measurement-guide segments. |

All entity `id` values across all five arrays share one namespace and must be
unique. An id is a non-empty JSON string. Whitespace and Unicode are preserved;
readers do not trim, case-fold, or synthesize ids.

### Point

Key order: `x`, `y`.

| Key | Type | Rule |
| --- | --- | --- |
| `x` | number | Finite centimeters from the canvas origin; booleans are invalid. |
| `y` | number | Finite centimeters from the canvas origin; booleans are invalid. |

### Wall

Key order: `id`, `kind`, `start`, `end`.

| Key | Type | Rule |
| --- | --- | --- |
| `id` | string | Non-empty and globally unique. |
| `kind` | string | Exactly `exterior` or `interior`. |
| `start` | point | Directed source start point. |
| `end` | point | Directed source end point. |

`exterior` corresponds to Floorplanify `ext`; `interior` corresponds to
Floorplanify `part`. Every wall has positive length and is horizontal or
vertical. Two walls may not describe the same undirected edge, including a
reversed duplicate.

Exterior walls are the only input used to derive Carpentry floor regions. Room
polygons are metadata and are never converted into `PlanFloorRegionSpec` values.
Exterior topology obeys all of these rules:

1. Each endpoint in an exterior connected component has degree exactly two.
2. Each component is one simple, closed, orthogonal polygonal shell with at
   least four non-redundant corners and non-zero area.
3. Non-adjacent edges do not cross, overlap, or touch.
4. Separate shells are allowed only when their closed regions are disjoint with
   positive clearance. They may not touch, overlap, or nest. Holes are not
   represented in v1.
5. Consecutive collinear exterior edges are rejected as a redundant corner;
   the sender must merge them before export.
6. An interior wall, including its endpoints, must be contained by one derived
   closed region. Boundary endpoints are allowed, but no positive-length part
   may lie outside that region.

When an endpoint configuration could be described as both open and branched,
`branched_exterior_shell` takes precedence. An exact or reversed duplicate edge
takes precedence over shell-degree diagnostics. Geometric shell relationships
(`self_intersecting_shell`, `nested_exterior_shell`, and
`touching_exterior_shells`) are evaluated only after component degree and edge
uniqueness pass.

### Room

Key order: `id`, `name`, `points`.

| Key | Type | Rule |
| --- | --- | --- |
| `id` | string | Non-empty and globally unique. |
| `name` | string | Source label, preserved verbatim. |
| `points` | array of points | At least three points in source polygon order. |

The first point is not repeated at the end. Adjacent points must differ and the
polygon must have non-zero signed area. Room zones may share boundaries and do
not participate in exterior-shell validation. A receiver that does not model
rooms preserves them in the strict raw payload and may emit a deterministic
warning.

### Opening

Key order: `id`, `kind`, `wallId`, `centerT`, `widthCm`, `swing`, `mirrored`.

| Key | Type | Rule |
| --- | --- | --- |
| `id` | string | Non-empty and globally unique. |
| `kind` | string | Exactly `door` or `window`. |
| `wallId` | string | Exact id of an existing wall. |
| `centerT` | number | Finite normalized center position in inclusive range `[0, 1]`, measured from wall `start` toward `end`. |
| `widthCm` | number | Finite and strictly greater than zero. |
| `swing` | string | Exactly `left` or `right`. |
| `mirrored` | boolean | Source mirror flag. |

For a wall of length `L`, the opening interval is
`[centerT * L - widthCm / 2, centerT * L + widthCm / 2]`. The entire interval
must lie in `[0, L]`. On one wall, two opening interiors may not overlap;
end-to-end contact is allowed. The receiver conversion uses
`offset_from_start = centerT * L - widthCm / 2`. Swing and mirror metadata remain
in the raw payload even if the receiver cannot model them.

### Stair

Key order: `id`, `rect`, `dir`. Rectangle key order: `x`, `y`, `w`, `h`.

| Key | Type | Rule |
| --- | --- | --- |
| `id` | string | Non-empty and globally unique. |
| `rect` | object | Exact keys `x`, `y`, `w`, `h`; all finite centimeter numbers. |
| `dir` | string | Exactly `up` or `down`. |

`rect.w` and `rect.h` are strictly positive. `rect.x` and `rect.y` are the
Floorplanify rectangle origin. Stair rectangles are source metadata and do not
alter floor-shell derivation.

### Guide

Key order: `id`, `a`, `b`.

| Key | Type | Rule |
| --- | --- | --- |
| `id` | string | Non-empty and globally unique. |
| `a` | point | First source endpoint. |
| `b` | point | Second source endpoint; must differ from `a`. |

Guides are source metadata and do not alter floor-shell derivation.

### Sender diagnostic

Key order: `code`, `severity`, `path`, `message`.

| Key | Type | Rule |
| --- | --- | --- |
| `code` | string | Non-empty stable machine code. |
| `severity` | string | Exactly `info` or `warning`; blocking errors are not exported. |
| `path` | string | RFC 6901 JSON Pointer into this payload, or the empty string for the root. |
| `message` | string | Non-empty deterministic human-readable text. |

`diagnostics` records sender notices about successfully exported data. It never
contains a blocking validation error: a payload with a blocking problem is not
exported. Importers may add their own deterministic diagnostics outside this raw
payload but must preserve these entries byte-for-byte as part of the source.

## Deterministic rejection contract

Validation is fail-closed. A rejection returns no partial project. The stable
machine code is authoritative; message text may add entity ids and paths. The
first error is selected by this order:

1. raw byte size, UTF-8, JSON syntax, duplicate JSON key, root object;
2. root `format`, then root `version`;
3. missing/unknown keys, types, enum/fixed values, finite numbers, and ids in
   depth-first document order using the key order above;
4. wall zero length/orthogonality, duplicate edges, exterior topology, and
   interior containment;
5. room, stair, and guide geometry;
6. opening references, dimensions/fit, then overlap.

| Code | Rejection rule |
| --- | --- |
| `file_too_large` | Raw source exceeds 10 MiB. |
| `invalid_utf8` | Bytes are not UTF-8 or contain a UTF-8 BOM. |
| `malformed_json` | JSON syntax is invalid or a non-JSON numeric constant is present. |
| `duplicate_key` | Any JSON object repeats a key. |
| `root_not_object` | The root JSON value is not an object. |
| `unsupported_format` | `format` is missing from the supported exchange family after structural parsing or is not exactly `floorplanify.carpentry`. |
| `unsupported_version` | `version` is not integer `1`, including a future version. |
| `missing_field` | A required key is absent. |
| `unknown_field` | Any object contains a key not defined above. |
| `invalid_type` | A value has the wrong JSON type, including bool where number/integer is required. |
| `invalid_value` | A fixed value, enum, range, minimum count, or non-empty-string rule fails and no more specific code applies. |
| `non_finite_number` | A numeric value cannot be represented as a finite real number. |
| `duplicate_id` | Any two project entities have the same id. |
| `missing_exterior_shell` | No exterior wall component exists. |
| `zero_length_wall` | Wall start and end are equal. |
| `non_orthogonal_wall` | A wall changes both x and y. |
| `duplicate_edge` | Two walls have identical undirected endpoint pairs, including reversed endpoints. |
| `branched_exterior_shell` | An exterior component has an endpoint degree greater than two and is not solely two otherwise-valid shells touching. |
| `unclosed_exterior_shell` | An exterior component has an endpoint degree less than two. |
| `self_intersecting_shell` | Non-adjacent edges in one degree-two exterior component cross, overlap, or touch. |
| `redundant_corner` | Two consecutive exterior edges are collinear. |
| `nested_exterior_shell` | One otherwise-valid exterior shell lies inside another. |
| `touching_exterior_shells` | Two otherwise-valid exterior shells touch or overlap at their boundaries or interiors. |
| `interior_wall_outside_shell` | An interior wall is not wholly contained by one exterior region. |
| `invalid_room_shape` | A room has fewer than three points, repeats the closing point, has adjacent duplicate points, or has zero area. |
| `invalid_stair_rect` | Stair rectangle width or height is not strictly positive. |
| `zero_length_guide` | Guide endpoints are equal. |
| `missing_wall_reference` | An opening `wallId` does not identify a wall. |
| `invalid_opening_width` | `widthCm` is not strictly positive. |
| `opening_outside_wall` | `centerT` is outside `[0,1]` or its derived interval does not fit on the wall. |
| `overlapping_openings` | Two openings on the same wall have overlapping interiors. |

The canonical invalid fixtures under
`tests/fixtures/floorplanify-carpentry-v1-invalid/` pin the geometry and schema
codes required for v1. They are data-contract QA inputs; their existence does
not claim that a Floorplanify exporter or Carpentry parser is already
implemented.

## Explicit exclusions

Version 1 contains no timestamp, sender-generated UUID, Blender import or build
settings, Carpentry `PlanProjectSpec`, framing recipe, material choice, wall
height, roof settings, generation command, or bake instruction. Those values
belong to receiver-side settings or later explicitly versioned contracts.

## Cross-repository fixture verification

During combined Floorplanify and Carpentry development, run this Python stdlib
command from the Floorplanify repository root. It prints both absolute paths and
SHA-256 values, then exits nonzero if either copy differs from the frozen v1
digest or from the other checkout:

```console
python -c "from hashlib import sha256; from pathlib import Path; expected='28f871813403d63247b47369357030cb14662b454a64950852bdafe65743dcb9'; paths=(Path('tests/fixtures/floorplanify-carpentry-v1.json'), Path('../Blender_addons/Carpentry/tests/fixtures/floorplanify/floorplanify-carpentry-v1.json')); rows=[(str(path.resolve()), sha256(path.read_bytes()).hexdigest()) for path in paths]; print('\n'.join(f'{digest}  {path}' for path, digest in rows)); raise SystemExit(0 if len({digest for _, digest in rows}) == 1 and rows[0][1] == expected else 1)"
```

Standalone repository tests use only their local fixture. Any semantic or schema
change to this frozen contract requires a new version and fixture (v2 or later);
the v1 field values, order, and schema are not changed in place.
