import type { Group, Person } from "./types";

/**
 * Auto-adjust: recompute every group anchor from membership alone.
 * Groups that share members pull together (more overlap → closer); unrelated groups push apart.
 * Overlap is measured as shared / smaller group (the overlap coefficient), so a group that sits
 * entirely inside another scores 1 and nests against it instead of being held at arm's length.
 * Starts from a fixed spiral rather than the current positions, so hand-dragged anchors never
 * influence the result and the same data always lands the same way.
 */

export const CANVAS_CENTER = { x: 700, y: 410 };
const STEPS = 320;
/** Closest two groups can rest when they share every member. */
const REST_MIN = 150;
/** How much farther they rest as overlap drops toward zero. */
const REST_SPAN = 330;
/** Unrelated groups repel until this far apart. */
const REPEL_RANGE = 400;
const SPRING_GAIN = 0.045;
const REPEL_GAIN = 0.035;
const GRAVITY = 0.012;

export function autoAdjustGroups(groups: Group[], people: Person[]): Group[] {
  const n = groups.length;
  if (n === 0) return groups;

  const members = groups.map(() => new Set<string>());
  const index = new Map(groups.map((g, i) => [g.id, i]));
  for (const person of people) {
    for (const gid of person.groupIds) {
      const i = index.get(gid);
      if (i !== undefined) members[i].add(person.id);
    }
  }

  const affinity: number[][] = groups.map(() => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let shared = 0;
      for (const id of members[i]) if (members[j].has(id)) shared += 1;
      const smaller = Math.min(members[i].size, members[j].size);
      const a = smaller === 0 ? 0 : shared / smaller;
      affinity[i][j] = a;
      affinity[j][i] = a;
    }
  }

  // Deterministic start: golden-angle spiral.
  const xs = new Array<number>(n);
  const ys = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const angle = i * 2.39996 - Math.PI / 2;
    const radius = 90 * Math.sqrt(i + 1);
    xs[i] = CANVAS_CENTER.x + Math.cos(angle) * radius;
    ys[i] = CANVAS_CENTER.y + Math.sin(angle) * radius;
  }

  for (let step = 0; step < STEPS; step++) {
    const alpha = 1 - (step / STEPS) * 0.8;
    const fx = new Array<number>(n).fill(0);
    const fy = new Array<number>(n).fill(0);

    for (let i = 0; i < n; i++) {
      fx[i] += (CANVAS_CENTER.x - xs[i]) * GRAVITY;
      fy[i] += (CANVAS_CENTER.y - ys[i]) * GRAVITY;

      for (let j = i + 1; j < n; j++) {
        let dx = xs[j] - xs[i];
        let dy = ys[j] - ys[i];
        let d = Math.hypot(dx, dy);
        if (d < 0.01) {
          // Coincident: nudge apart on a direction fixed by index so the result is reproducible.
          dx = Math.cos(i + j * 7);
          dy = Math.sin(i + j * 7);
          d = 1;
        }
        const ux = dx / d;
        const uy = dy / d;

        const a = affinity[i][j];
        let f = 0;
        if (a > 0) {
          const rest = REST_MIN + REST_SPAN * (1 - a);
          // Two-way spring: pulls when too far, pushes when too close.
          f = (d - rest) * SPRING_GAIN;
        } else if (d < REPEL_RANGE) {
          f = -(REPEL_RANGE - d) * REPEL_GAIN;
        }
        fx[i] += ux * f;
        fy[i] += uy * f;
        fx[j] -= ux * f;
        fy[j] -= uy * f;
      }
    }

    for (let i = 0; i < n; i++) {
      xs[i] += fx[i] * alpha;
      ys[i] += fy[i] * alpha;
    }
  }

  return groups.map((g, i) => ({ ...g, x: Math.round(xs[i]), y: Math.round(ys[i]) }));
}
