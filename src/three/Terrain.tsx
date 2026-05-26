import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useTerrainStore } from "@/state/terrainStore";

const GRID = 30;
const scale = 51000;

type LatLng = { lat: number; lng: number };

export default function Terrain({ area }: { area: LatLng[] | undefined }) {
  const [elev, setElev] = useState<Float32Array | null>(null);
  const setSampler = useTerrainStore((s) => s.setSampler);

  const hasArea = !!(area && area.length >= 2);
  const south = hasArea ? Math.min(area![0].lat, area![1].lat) : 0;
  const north = hasArea ? Math.max(area![0].lat, area![1].lat) : 0;
  const west = hasArea ? Math.min(area![0].lng, area![1].lng) : 0;
  const east = hasArea ? Math.max(area![0].lng, area![1].lng) : 0;
  const refLat = (south + north) / 2;
  const refLng = (west + east) / 2;

  useEffect(() => {
    if (!hasArea) return;
    let cancelled = false;
    setElev(null);
    const locations: { latitude: number; longitude: number }[] = [];
    for (let j = 0; j < GRID; j++) {
      const lat = south + ((north - south) * j) / (GRID - 1);
      for (let i = 0; i < GRID; i++) {
        const lng = west + ((east - west) * i) / (GRID - 1);
        locations.push({ latitude: lat, longitude: lng });
      }
    }

    console.log("[Terrain] fetching elevation", { south, north, west, east, points: locations.length });
    fetch("https://api.open-elevation.com/api/v1/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data?.results) {
          console.warn("[Terrain] empty response", data);
          return;
        }
        const arr = new Float32Array(GRID * GRID);
        let min = Infinity, max = -Infinity;
        for (let k = 0; k < data.results.length; k++) {
          const e = data.results[k].elevation ?? 0;
          arr[k] = e;
          if (e < min) min = e;
          if (e > max) max = e;
        }
        console.log("[Terrain] elevation loaded", { min, max, range: max - min });
        setElev(arr);
      })
      .catch((err) => console.error("[Terrain] fetch failed", err));

    return () => {
      cancelled = true;
    };
  }, [hasArea, south, north, west, east]);

  const base = useMemo(() => {
    if (!elev) return 0;
    let min = Infinity;
    for (let i = 0; i < elev.length; i++) if (elev[i] < min) min = elev[i];
    return min;
  }, [elev]);

  useEffect(() => {
    if (!elev) {
      setSampler(null, 0);
      return;
    }
    const sampler = (lat: number, lng: number) => {
      const u = ((lng - west) / (east - west)) * (GRID - 1);
      const v = ((lat - south) / (north - south)) * (GRID - 1);
      const i0 = Math.max(0, Math.min(GRID - 1, Math.floor(u)));
      const j0 = Math.max(0, Math.min(GRID - 1, Math.floor(v)));
      const i1 = Math.min(GRID - 1, i0 + 1);
      const j1 = Math.min(GRID - 1, j0 + 1);
      const fu = u - i0;
      const fv = v - j0;
      const e00 = elev[j0 * GRID + i0];
      const e10 = elev[j0 * GRID + i1];
      const e01 = elev[j1 * GRID + i0];
      const e11 = elev[j1 * GRID + i1];
      const e0 = e00 * (1 - fu) + e10 * fu;
      const e1 = e01 * (1 - fu) + e11 * fu;
      return e0 * (1 - fv) + e1 * fv - base;
    };
    setSampler(sampler, base);
    return () => setSampler(null, 0);
  }, [elev, base, south, north, west, east, setSampler]);

  const geometry = useMemo(() => {
    if (!elev) return null;
    const widthUnits = (east - west) * scale * Math.cos((refLat * Math.PI) / 180);
    const heightUnits = (north - south) * scale;
    const geo = new THREE.PlaneGeometry(widthUnits, heightUnits, GRID - 1, GRID - 1);
    const pos = geo.attributes.position;
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const idx = j * GRID + i;
        const vertIdx = (GRID - 1 - j) * GRID + i;
        pos.setZ(vertIdx, elev[idx] - base);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [elev, base, east, west, north, south, refLat]);

  if (!hasArea || !geometry) return null;

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      userData={{ exportToGLB: true, exportCategory: "terrain" }}
    >
      <meshStandardMaterial color="#6b8e4e" flatShading side={THREE.DoubleSide} />
    </mesh>
  );
}
