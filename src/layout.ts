import { restDistance, sharedGroupCount } from "./geometry";
import type { Group, Person, Point } from "./types";

const UNAFFILIATED_X = 72;
const UNAFFILIATED_TOP = 120;
const UNAFFILIATED_GAP = 34;

/** Two dots closer than this overlap each other's label. */
export const MIN_SPACING = 58;
/** Soft "personal space" so clusters don't pack into an unreadable knot. */
const SOFT_SPACING = 92;

function hashJitter(id: string): Point {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const a = (h % 360) * (Math.PI / 180);
  const r = 10 + (Math.abs(h) % 14);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

export function layoutPeople(
  people: Person[],
  groups: Group[],
): Map<string, Point> {
  const groupById = new Map(groups.map((g) => [g.id, g]));

  let unaffiliatedIndex = 0;
  const nodes = people.map((person) => {
    const jitter = hashJitter(person.id);
    const memberGroups = person.groupIds
      .map((id) => groupById.get(id))
      .filter((g): g is Group => Boolean(g));

    let x: number;
    let y: number;
    let home: Point | null = null;
    if (memberGroups.length === 0) {
      home = { x: UNAFFILIATED_X, y: UNAFFILIATED_TOP + unaffiliatedIndex * UNAFFILIATED_GAP };
      unaffiliatedIndex += 1;
      x = home.x;
      y = home.y;
    } else {
      x = memberGroups.reduce((s, g) => s + g.x, 0) / memberGroups.length + jitter.x;
      y = memberGroups.reduce((s, g) => s + g.y, 0) / memberGroups.length + jitter.y;
    }
    return { person, memberGroups, home, x, y };
  });

  const n = nodes.length;
  if (n === 0) return new Map();

  const shared: number[][] = nodes.map(() => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = sharedGroupCount(nodes[i].person.groupIds, nodes[j].person.groupIds);
      shared[i][j] = s;
      shared[j][i] = s;
    }
  }

  const STEPS = 160;
  for (let step = 0; step < STEPS; step++) {
    // Cool down so the first steps settle clusters and the last steps only untangle overlaps.
    const alpha = 1 - (step / STEPS) * 0.75;
    const fx = new Array(n).fill(0);
    const fy = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const a = nodes[i];

      if (a.home) {
        fx[i] += (a.home.x - a.x) * 0.12;
        fy[i] += (a.home.y - a.y) * 0.12;
      } else {
        // People are anchored to the groups they belong to; multi-group people settle between them.
        for (const g of a.memberGroups) {
          fx[i] += ((g.x - a.x) * 0.09) / a.memberGroups.length;
          fy[i] += ((g.y - a.y) * 0.09) / a.memberGroups.length;
        }
      }

      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const ux = dx / d;
        const uy = dy / d;

        let push = 0;
        if (d < MIN_SPACING) push += (MIN_SPACING - d) * 1.4;
        if (d < SOFT_SPACING) push += ((SOFT_SPACING - d) / SOFT_SPACING) * 3.2;
        if (push > 0) {
          fx[i] -= ux * push;
          fy[i] -= uy * push;
          fx[j] += ux * push;
          fy[j] += uy * push;
        }

        const s = shared[i][j];
        if (s > 0) {
          const rest = restDistance(s);
          if (d > rest) {
            // Spring that only pulls: more shared groups → shorter rest length → closer dots.
            const pull = (d - rest) * 0.02 * s;
            fx[i] += ux * pull;
            fy[i] += uy * pull;
            fx[j] -= ux * pull;
            fy[j] -= uy * pull;
          }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      nodes[i].x += fx[i] * 0.7 * alpha;
      nodes[i].y += fy[i] * 0.7 * alpha;
    }
  }

  return new Map(nodes.map((node) => [node.person.id, { x: node.x, y: node.y }]));
}
