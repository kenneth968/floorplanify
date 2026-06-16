# Floorplanify

A single-file, browser-based floor plan editor for quick sketches, room layouts
and printable A4 plan drawings. Written in vanilla JavaScript with SVG
rendering — no build step, no framework, no install.

> Tegn plantegninger i nettleseren. Én HTML-fil, ingen byggesteg.

![Status](https://img.shields.io/badge/status-active-success)
![No build](https://img.shields.io/badge/build-none-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features / Funksjoner

- **Walls** — yttarvegg (tjukk, heiltrukken) og innervegg (tynn, stipla).
  Snapping til rutenett, 90°-tvang, valfri 45°-vinkel.
- **Rooms** — dra eit rektangel, eller klikk hjørner for vilkårleg omriss.
  Automatisk arealbruk og sidevisning (m², lengder, eller begge).
- **Doors and windows** — plasser på vegg. Dører har svingretning og
  hengsleside; vinduer har to-glas konvensjon. Begge snappar til
  veggepunkt, midtpunkt, og andre opningar på same vegg.
- **Stairs** — rektangel med trappetrinn og opp/ned-pil.
- **Snap-to-length** — når du teiknar ein vegg, blir eksisterande vegger
  med same lengde markert grøne, og statuslinja viser "match: 5.00 m".
- **Multi-select** — Shift+klikk for å leggje til, eller dra ein
  markeringsboks rundt vegger.
- **Clipboard** — `Ctrl+C` / `Ctrl+V` kopierer og limer inn vegger, rom,
  dører, vinduer og trapper.
- **Undo/Redo** — `Ctrl+Z` / `Ctrl+Y` (200 steg).
- **Autosave** — utkast lagra i `localStorage` kvart 0.5 sekund, blir
  gjenoppretta ved ny økt.
- **JSON save/load** — `Ctrl+S` for å lagre heile prosjektet som JSON.
- **A4 print/export** — PDF (via utskrift), PNG ved 300 DPI, eller rein
  SVG-vektor. Skalertittelblokk med prosjektnavn, dato og målestokk.
- **Norsk UI** — språket er norsk, alle enheter i centimeter.

## Quick start / Snarstart

1. Open `floorplanify.html` in any modern browser.
   - Or serve it locally: `python -m http.server 8000` and visit
     `http://localhost:8000`.
2. The tool starts in **wall** mode. Click to place corners; `Enter` or
   double-click to finish the chain.
3. Switch tool with the toolbar or these shortcuts:

| Key | Action |
| --- | --- |
| `V` | Select / move |
| `W` | Wall |
| `R` | Room (rectangle drag) |
| `K` | Define room from closed loop |
| `S` | Stair |
| `D` | Door |
| `N` | Window |
| `H` | Pan |
| `M` | Measure (place guide lines) |
| `Esc` | Cancel current action / deselect |
| `Enter` | Finish current chain / polygon |
| `Del` / `Backspace` | Delete selection |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+C` / `Ctrl+V` | Copy / paste |
| `Ctrl+A` | Select all walls |
| `Ctrl+S` | Save as JSON |
| `F` | Fit to view |
| `0` | 1:1 actual size |
| `+` / `-` | Zoom in / out |
| `?` | Toggle keyboard help |
| `Shift+drag` | Constrain to 90° / 10x nudge |
| `Alt+drag` | Allow 45° angles |
| `Space+drag` | Pan from any tool |

## Files / Filer

```text
floorplanify.html     Everything: HTML, CSS, JavaScript
docs/                 Design spec and implementation plan
.github/              CI workflow, issue templates
LICENSE               MIT license
CHANGELOG.md          Release notes
```

## Architecture / Arkitektur

Single-file SPA, no dependencies, no build pipeline. All state lives in a
single `state` object with JSON-snapshot undo/redo. The SVG is rebuilt on
each render via `requestAnimationFrame`, with diff-based caching on the
sidebar.

Public API is exposed on `window.__floorplanify` for console testing:

```js
__floorplanify.addWall({x:0,y:0}, {x:500,y:0}, 'ext');
__floorplanify.zoomFit();
__floorplanify.saveJson();
```

## License / Lisens

MIT — see `LICENSE`.

## Contributing / Bidra

Issues and pull requests are welcome. See `.github/ISSUE_TEMPLATE/` for
guidance. Keep the no-build, single-file constraint in mind — the whole
point is that the file is portable.
