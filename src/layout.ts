import { clusterOffsets, findRegionAnchor, membershipKey } from "./geometry";
import type { Group, Person, Point } from "./types";

const UNAFFILIATED = { x: 70, y: 70 };

export function layoutPeople(
  people: Person[],
  groups: Group[],
): Map<string, Point> {
  const byKey = new Map<string, Person[]>();
  for (const person of people) {
    const key = membershipKey(person.groupIds);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(person);
    else byKey.set(key, [person]);
  }

  const positions = new Map<string, Point>();

  for (const cluster of byKey.values()) {
    const ids = cluster[0].groupIds;
    const inside = groups.filter((g) => ids.includes(g.id));
    const outside = groups.filter((g) => !ids.includes(g.id));

    const anchor =
      inside.length === 0
        ? UNAFFILIATED
        : findRegionAnchor(inside, outside);

    const spread = 16 + Math.min(cluster.length, 8) * 7;
    const offsets = clusterOffsets(cluster.length, spread);

    cluster.forEach((person, i) => {
      positions.set(person.id, {
        x: anchor.x + offsets[i].x,
        y: anchor.y + offsets[i].y,
      });
    });
  }

  return positions;
}
