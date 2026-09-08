import type { EdgeWeighting, Point } from "./types";

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function sharedGroupCount(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const set = new Set(a);
  let n = 0;
  for (const id of b) {
    if (set.has(id)) n += 1;
  }
  return n;
}

export function sharedGroupIds(a: string[], b: string[]): string[] {
  if (a.length === 0 || b.length === 0) return [];
  const set = new Set(a);
  return b.filter((id) => set.has(id));
}

/** Size of the union of two people's group sets. */
export function unionGroupCount(a: string[], b: string[]): number {
  return new Set([...a, ...b]).size;
}

/** Jaccard similarity: shared / union. 0 when either person has no groups. */
export function jaccard(shared: number, union: number): number {
  return union === 0 ? 0 : shared / union;
}

export type EdgeScore = {
  /** 0..1, drives stroke width and opacity. */
  strength: number;
  /** Strong enough to draw a string when nobody is focused. */
  showAtRest: boolean;
  /** Strong enough to carry a count badge when nobody is focused. */
  badgeAtRest: boolean;
  /** Text for the badge: shared count, or overlap percentage when normalized. */
  label: string;
};

/**
 * One place that decides how heavy a tie looks. Raw mode counts shared circles;
 * normalized mode uses Jaccard so a shared 4-person chat outweighs a shared 200-person school.
 */
export function scoreEdge(shared: number, union: number, weighting: EdgeWeighting): EdgeScore {
  if (weighting === "jaccard") {
    const j = jaccard(shared, union);
    return {
      strength: j,
      showAtRest: j >= 0.5,
      badgeAtRest: j >= 0.75,
      label: `${Math.round(j * 100)}`,
    };
  }
  return {
    strength: Math.min((shared - 1) / 3, 1),
    showAtRest: shared >= 2,
    badgeAtRest: shared >= 3,
    label: `${shared}`,
  };
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export function convexHull(points: Point[]): Point[] {
  if (points.length <= 1) return points.slice();
  const pts = [...points].sort((p, q) => p.x - q.x || p.y - q.y);
  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Convex hull expanded around members so the region hugs people instead of filling a disk. */
export function paddedHull(points: Point[], padding: number): Point[] {
  if (points.length === 0) return [];
  const ring: Point[] = [];
  const steps = 8;
  for (const p of points) {
    for (let i = 0; i < steps; i++) {
      const a = (Math.PI * 2 * i) / steps;
      ring.push({ x: p.x + Math.cos(a) * padding, y: p.y + Math.sin(a) * padding });
    }
  }
  return convexHull(ring);
}

export function hullPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y}`;
  }
  return `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
}

export function hullCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const s = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: s.x / points.length, y: s.y / points.length };
}

/** Rest length for a pair: more shared groups → they sit closer. */
export function restDistance(shared: number): number {
  if (shared <= 0) return 160;
  return 48 + 44 / shared;
}

/** SVG path for a ring split into equal arcs, one per entry in `count`. */
export function ringSegmentPath(
  cx: number,
  cy: number,
  r: number,
  index: number,
  count: number,
  gap = 0.18,
): string {
  if (count <= 1) {
    return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  }
  const span = (Math.PI * 2) / count;
  const start = -Math.PI / 2 + index * span + gap / 2;
  const end = start + span - gap;
  const x0 = cx + Math.cos(start) * r;
  const y0 = cy + Math.sin(start) * r;
  const x1 = cx + Math.cos(end) * r;
  const y1 = cy + Math.sin(end) * r;
  const large = span - gap > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

/**
 * Where to hang a region's label: the hull vertex farthest from `center` (the crowd's middle),
 * nudged outward, so labels land on the quiet edge of the map rather than inside other clusters.
 */
export function hullLabelAnchor(
  points: Point[],
  center: Point,
  offset: number,
): { x: number; y: number; dx: number; dy: number } {
  if (points.length === 0) return { x: center.x, y: center.y, dx: 0, dy: -1 };
  let best = points[0];
  let bestD = -1;
  for (const p of points) {
    const d = dist(p, center);
    if (d > bestD) {
      bestD = d;
      best = p;
    }
  }
  const len = Math.max(bestD, 0.001);
  const dx = (best.x - center.x) / len;
  const dy = (best.y - center.y) / len;
  return { x: best.x + dx * offset, y: best.y + dy * offset, dx, dy };
}
