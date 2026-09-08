import type { Group, Person, Point } from "./types";

/**
 * Staged layout:
 *   0. bucket people by their exact set of groups (their "signature");
 *   1. give each bucket a target: the weighted centroid of its groups' anchors;
 *   2. pack members inside the bucket on fixed-pitch rings (no forces, so spacing is guaranteed);
 *   3. relax buckets as rigid discs so no two overlap;
 *   4. hand the discs back so group regions can wrap buckets instead of loose dots.
 *
 * Pure function of (people, groups): the same data always produces the same picture.
 */

const UNAFFILIATED_X = 72;
const UNAFFILIATED_TOP = 120;
const UNAFFILIATED_GAP = 68;

/** Distance between neighbouring dots inside a bucket. Below this, name labels overlap. */
export const DOT_PITCH = 60;
/** Room a dot needs beyond its centre: ring + the name hanging under it. */
const DOT_HALO = 34;
/** Empty space kept between neighbouring buckets. */
const BUCKET_GAP = 14;
const RELAX_STEPS = 140;
const SPRING = 0.12;

export type Bucket = {
  key: string;
  groupIds: string[];
  memberIds: string[];
  /** Centre of the bucket after relaxation. */
  x: number;
  y: number;
  /** Radius of the outermost packed ring (0 for a single member). */
  packR: number;
  /** Radius the bucket occupies on the canvas, including dot halos. */
  r: number;
};

export type Layout = {
  positions: Map<string, Point>;
  buckets: Bucket[];
  /** person id → bucket key, so the canvas can tell which pairs share a bucket. */
  bucketOf: Map<string, string>;
};

function hashUnit(key: string): Point {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const a = (Math.abs(h) % 3600) * (Math.PI / 1800);
  return { x: Math.cos(a), y: Math.sin(a) };
}

/**
 * Slot offsets for `n` dots, every neighbour at least `pitch` apart.
 * 1: centre. 2–6: one tight ring sized so the chord equals the pitch. 7+: centre plus hex rings
 * of 6k dots at radius k·pitch.
 */
export function packSlots(n: number, pitch = DOT_PITCH): { offsets: Point[]; packR: number } {
  const offsets: Point[] = [];
  if (n <= 0) return { offsets, packR: 0 };
  if (n === 1) return { offsets: [{ x: 0, y: 0 }], packR: 0 };
  if (n <= 6) {
    const radius = pitch / (2 * Math.sin(Math.PI / n));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      offsets.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
    }
    return { offsets, packR: radius };
  }
  offsets.push({ x: 0, y: 0 });
  let ring = 1;
  while (offsets.length < n) {
    const slots = 6 * ring;
    const radius = ring * pitch;
    // Stagger alternate rings so dots don't line up radially.
    const start = -Math.PI / 2 + (ring % 2 === 0 ? Math.PI / slots : 0);
    for (let i = 0; i < slots && offsets.length < n; i++) {
      const a = start + (i / slots) * Math.PI * 2;
      offsets.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
    }
    ring += 1;
  }
  return { offsets, packR: (ring - 1) * pitch };
}

export function layoutPeople(people: Person[], groups: Group[]): Layout {
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const groupSize = new Map<string, number>();
  for (const person of people) {
    for (const gid of person.groupIds) {
      if (groupById.has(gid)) groupSize.set(gid, (groupSize.get(gid) ?? 0) + 1);
    }
  }

  // Stage 0: signatures. Unaffiliated people each get a private bucket in the left column.
  const byKey = new Map<string, { groupIds: string[]; members: Person[] }>();
  const unaffiliated: Person[] = [];
  for (const person of people) {
    const ids = [...new Set(person.groupIds.filter((gid) => groupById.has(gid)))].sort();
    if (ids.length === 0) {
      unaffiliated.push(person);
      continue;
    }
    const key = ids.join("|");
    const entry = byKey.get(key) ?? { groupIds: ids, members: [] };
    entry.members.push(person);
    byKey.set(key, entry);
  }

  type Working = Bucket & { tx: number; ty: number; offsets: Point[] };
  const working: Working[] = [];

  for (const [key, entry] of byKey) {
    const members = [...entry.members].sort((a, b) => a.name.localeCompare(b.name));
    // Stage 1: weighted centroid. A group counts more when this bucket is a bigger share of it,
    // so a bucket that *is* a small group sits on that group and only leans toward large ones.
    let sx = 0;
    let sy = 0;
    let sw = 0;
    for (const gid of entry.groupIds) {
      const g = groupById.get(gid)!;
      const w = members.length / Math.max(groupSize.get(gid) ?? members.length, 1);
      sx += g.x * w;
      sy += g.y * w;
      sw += w;
    }
    const tx = sx / sw;
    const ty = sy / sw;
    // Stage 2: rigid packing.
    const { offsets, packR } = packSlots(members.length);
    const jitter = hashUnit(key);
    working.push({
      key,
      groupIds: entry.groupIds,
      memberIds: members.map((m) => m.id),
      tx,
      ty,
      x: tx + jitter.x * 4,
      y: ty + jitter.y * 4,
      packR,
      r: packR + DOT_HALO,
      offsets,
    });
  }

  unaffiliated
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((person, i) => {
      const tx = UNAFFILIATED_X;
      const ty = UNAFFILIATED_TOP + i * UNAFFILIATED_GAP;
      working.push({
        key: `~${person.id}`,
        groupIds: [],
        memberIds: [person.id],
        tx,
        ty,
        x: tx,
        y: ty,
        packR: 0,
        r: DOT_HALO,
        offsets: [{ x: 0, y: 0 }],
      });
    });

  // Stage 3: relax. Spring toward target, then resolve overlaps as a hard constraint so the
  // final frame has no two buckets touching regardless of how the springs pull.
  const n = working.length;
  for (let step = 0; step < RELAX_STEPS; step++) {
    for (const b of working) {
      b.x += (b.tx - b.x) * SPRING;
      b.y += (b.ty - b.y) * SPRING;
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        const a = working[i];
        for (let j = i + 1; j < n; j++) {
          const b = working[j];
          const minD = a.r + b.r + BUCKET_GAP;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let d = Math.hypot(dx, dy);
          if (d >= minD) continue;
          if (d < 0.01) {
            const u = hashUnit(a.key + b.key);
            dx = u.x;
            dy = u.y;
            d = 1;
          }
          const push = (minD - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }
  }

  const positions = new Map<string, Point>();
  const bucketOf = new Map<string, string>();
  const buckets: Bucket[] = working.map((b) => {
    b.memberIds.forEach((id, i) => {
      positions.set(id, { x: b.x + b.offsets[i].x, y: b.y + b.offsets[i].y });
      bucketOf.set(id, b.key);
    });
    return { key: b.key, groupIds: b.groupIds, memberIds: b.memberIds, x: b.x, y: b.y, packR: b.packR, r: b.r };
  });

  return { positions, buckets, bucketOf };
}
