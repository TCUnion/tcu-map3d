import type { RoutePoint } from "@/state/routeStore";

export type ParsedGpx = {
  points: RoutePoint[];
  name: string;
  bbox: { south: number; north: number; west: number; east: number };
};

export function parseGpx(xml: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) throw new Error("Invalid GPX: " + parserError.textContent);

  const name =
    doc.querySelector("trk > name")?.textContent ||
    doc.querySelector("rte > name")?.textContent ||
    doc.querySelector("metadata > name")?.textContent ||
    "";

  const nodes = Array.from(
    doc.querySelectorAll("trkpt, rtept")
  ) as Element[];
  if (nodes.length === 0) throw new Error("GPX contains no trkpt/rtept");

  const points: RoutePoint[] = [];
  let south = Infinity, north = -Infinity, west = Infinity, east = -Infinity;

  for (const n of nodes) {
    const lat = parseFloat(n.getAttribute("lat") || "");
    const lng = parseFloat(n.getAttribute("lon") || "");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const eleText = n.querySelector("ele")?.textContent;
    const ele = eleText ? parseFloat(eleText) : undefined;
    points.push({ lat, lng, ele: Number.isFinite(ele!) ? ele : undefined });
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
  }

  if (points.length === 0) throw new Error("GPX has no valid coordinates");
  return { points, name, bbox: { south, north, west, east } };
}
