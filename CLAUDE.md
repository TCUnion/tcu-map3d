# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Origin & Intent

Fork of [cartesiancs/map3d](https://github.com/cartesiancs/map3d) (MIT). Direct-fork model — not an npm dependency. Owner plans to extend it for:

1. **Race route / cycling 3D visualization** (climbing profile, course preview)
2. **Building 3D rendering** (course surroundings)
3. **GLB export** to other systems (Three.js / Unity / Blender consumers)
4. **Interactive map** (pan / zoom / click) embedded in React

Upstream demo: https://map.fleet.im/

## Commands

```bash
npm install
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview   # preview built bundle
```

No test framework configured.

## Architecture

### Stack
React 19 + TypeScript · Vite 6 · React-Three-Fiber 9 / @react-three/drei · Three.js 0.173 · Zustand · Leaflet + react-leaflet · Axios.

### Directory map
- `src/ui/App.tsx` — root component
- `src/components/map/` — 2D Leaflet area selector (`SelectMap.tsx`) + load progress (`Processing.tsx`)
- `src/three/Space.tsx` — **core 3D scene**. Renders `<Canvas>` with buildings (extruded shapes), roads (`<Line>`), sky, environment, and `Car`. Calls Overpass API and triggers GLB export here.
- `src/three/Car.tsx` — animated vehicle prop
- `src/state/` — Zustand stores: `areaStore` (selected bbox), `carStore`, `exportStore` (GLB export trigger)
- `src/api/axios.ts` — Axios instance pointed at `api.fleet.cartesiancs.com` (upstream's own backend; **likely to be removed/replaced** when forking — used only for mesh upload in `Space.tsx:394`)
- `src/components/{button,flex,modal,nav,text}` — generic UI primitives
- `src/utils/cookie.ts` — cookie helper (only used for upstream's auth token)

### Data flow
1. User picks bounding box in 2D Leaflet map (`SelectMap.tsx`) → writes bbox to `areaStore`.
2. `Space.tsx` fetches OSM data from public Overpass API: `https://overpass-api.de/api/interpreter` (buildings + roads in bbox).
3. OSM ways converted to `THREE.Shape` + `extrudeGeometry` for buildings, `<Line>` for roads.
4. Coordinates projected with a hard-coded `scale = 51000` constant in `Space.tsx` (lat/lon → world units). Don't change this casually — geometry, camera, and car speed all assume it.
5. Meshes flagged `userData.exportToGLB = true` so `GLTFExporter` (triggered via `exportStore`) only serializes the model.

### Path alias
`@/` → `src/` (defined in `vite.config.ts` + `tsconfig.app.json`). Use `@/state/...` style imports.

## Working on this repo — key gotchas

- **Overpass API is rate-limited.** Don't call it in loops; cache responses locally when iterating on rendering code.
- **`scale = 51000` is global state.** Any geometry / camera / projection change must respect it. If you add elevation (heightmap, climbing profile), use the same projection.
- **Upstream's `api.fleet.cartesiancs.com` calls are not ours.** When implementing GLB-export for our own backend, either rip out `instanceFleet`/`cookie.ts` or repoint axios baseURL — don't leave dead auth code.
- **R3F v9 + React 19.** Some `@types/three`-related drei patterns differ from older R3F; check `extend()` usage in `Space.tsx` before adding custom Three.js classes.
- **GLB export** is opt-in per mesh via `userData.exportToGLB`. New 3D objects added to the scene must set this flag if they should ship in the export.

## When extending for the 4 target use cases

| Use case | Touch points |
|---|---|
| Race route 3D viz | New store for GPX/route polyline; render in `Space.tsx` alongside roads; project with same `scale` constant |
| Building rendering | Already works — tune `extrudeSettings.depth` + material in `Building` component inside `Space.tsx` |
| GLB export | Tag new meshes with `userData.exportToGLB`; export is fired via `exportStore` |
| Interactive map | 2D side lives in `components/map/`; 3D side in `three/`; sync via `areaStore` |
