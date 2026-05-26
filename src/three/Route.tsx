import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useRouteStore } from "@/state/routeStore";
import { useAreaStore } from "@/state/areaStore";
import { useTerrainStore } from "@/state/terrainStore";

const scale = 51000;

export default function Route() {
  const points = useRouteStore((s) => s.points);
  const center = useAreaStore((s) => s.center);
  const sampler = useTerrainStore((s) => s.sampler);
  const baseElevation = useTerrainStore((s) => s.baseElevation);

  const refLat = (center[1].lat + center[0].lat) / 2;
  const refLng = (center[1].lng + center[0].lng) / 2;

  const linePoints = useMemo(() => {
    if (points.length < 2) return [];
    let eleMin = Infinity;
    for (const p of points) if (p.ele !== undefined && p.ele < eleMin) eleMin = p.ele;
    const haveEle = Number.isFinite(eleMin);

    return points.map((p) => {
      const x = (p.lng - refLng) * scale * Math.cos((refLat * Math.PI) / 180);
      const z = -((p.lat - refLat) * scale);
      let y: number;
      if (haveEle && p.ele !== undefined) {
        y = p.ele - eleMin;
      } else if (sampler) {
        y = sampler(p.lat, p.lng);
      } else {
        y = 0;
      }
      return new THREE.Vector3(x, y + 1.5, z);
    });
  }, [points, refLat, refLng, sampler, baseElevation]);

  if (linePoints.length < 2) return null;

  return (
    <Line
      points={linePoints}
      color="#ff2a2a"
      lineWidth={4}
      userData={{ exportToGLB: true, exportCategory: "route" }}
    />
  );
}
