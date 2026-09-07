import type { Point } from "./types";

export type CircleGeom = {
  x: number;
  y: number;
  r: number;
};

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Iteratively find a point inside `inside` circles and outside `outside` circles. */
export function findRegionAnchor(
  inside: CircleGeom[],
  outside: CircleGeom[],
  padding = 22,
): Point {
  let x = inside.reduce((sum, c) => sum + c.x, 0) / inside.length;
  let y = inside.reduce((sum, c) => sum + c.y, 0) / inside.length;

  for (let step = 0; step < 90; step++) {
    let dx = 0;
    let dy = 0;

    for (const c of inside) {
      const d = Math.hypot(x - c.x, y - c.y) || 0.001;
      const limit = Math.max(c.r - padding, 10);
      if (d > limit) {
        const pull = (d - limit) / d;
        dx += (c.x - x) * pull;
        dy += (c.y - y) * pull;
      }
    }

    for (const c of outside) {
      const d = Math.hypot(x - c.x, y - c.y) || 0.001;
      const limit = c.r + padding;
      if (d < limit) {
        const push = (limit - d) / d;
        dx += (x - c.x) * push;
        dy += (y - c.y) * push;
      }
    }

    x += dx * 0.35;
    y += dy * 0.35;
  }

  return { x, y };
}

export function clusterOffsets(count: number, radius: number): Point[] {
  if (count <= 1) return [{ x: 0, y: 0 }];
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const r = radius * Math.sqrt((i + 0.5) / count);
    const a = i * golden;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
}

export function membershipKey(groupIds: string[]): string {
  return [...groupIds].sort().join("|");
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
