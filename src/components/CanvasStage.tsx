import { drag, pointer, select, zoom, zoomIdentity } from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  dist,
  hullLabelAnchor,
  hullPath,
  jaccard,
  paddedHullOfCircles,
  ringSegmentPath,
  scoreEdge,
  sharedGroupCount,
  sharedGroupIds,
  unionGroupCount,
} from "../geometry";
import type { Bucket } from "../layout";
import type { EdgeWeighting, Group, ViewTransform } from "../types";

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function invertPoint(view: ViewTransform, px: number, py: number): [number, number] {
  return [(px - view.x) / view.k, (py - view.y) / view.k];
}

type PersonNode = {
  id: string;
  name: string;
  groupIds: string[];
  x: number;
  y: number;
};

type Edge = {
  a: string;
  b: string;
  shared: number;
  union: number;
};

type GroupLabel = {
  x: number;
  y: number;
  align: "start" | "middle" | "end";
};

type Props = {
  groups: Group[];
  people: PersonNode[];
  buckets: Bucket[];
  bucketOf: Map<string, string>;
  edges: Edge[];
  selectedId: string | null;
  view: ViewTransform;
  weighting: EdgeWeighting;
  onToggleWeighting: () => void;
  onAutoAdjust: () => void;
  onViewChange: (view: ViewTransform) => void;
  onSelectPerson: (id: string | null) => void;
  onMoveGroup: (id: string, x: number, y: number) => void;
};

const EMPTY_GROUP_R = 30;
/** Padding beyond a bucket's packed rings; leaves the dot ring and name inside the region. */
const HULL_PAD = 30;
const DOT_R = 8;
const RING_R = 13;

export default function CanvasStage({
  groups,
  people,
  buckets,
  bucketOf,
  edges,
  selectedId,
  view,
  weighting,
  onToggleWeighting,
  onAutoAdjust,
  onViewChange,
  onSelectPerson,
  onMoveGroup,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ReturnType<typeof zoom<SVGSVGElement, unknown>> | null>(null);
  const viewRef = useRef(view);
  const onViewChangeRef = useRef(onViewChange);
  const groupsRef = useRef(groups);
  const peopleRef = useRef(people);
  const fitPending = useRef(false);
  viewRef.current = view;
  onViewChangeRef.current = onViewChange;
  groupsRef.current = groups;
  peopleRef.current = people;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

  const pos = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const hulls = useMemo(() => {
    const map = new Map<string, { path: string; label: GroupLabel }>();
    const center = people.length
      ? {
          x: people.reduce((s, p) => s + p.x, 0) / people.length,
          y: people.reduce((s, p) => s + p.y, 0) / people.length,
        }
      : { x: 700, y: 410 };
    const placed: { left: number; right: number; y: number }[] = [];
    const box = (label: GroupLabel, w: number) =>
      label.align === "start"
        ? { left: label.x, right: label.x + w }
        : label.align === "end"
          ? { left: label.x - w, right: label.x }
          : { left: label.x - w / 2, right: label.x + w / 2 };
    for (const group of groups) {
      // Regions wrap whole buckets, so they stay smooth and never cut through a cluster.
      const discs = buckets
        .filter((b) => b.groupIds.includes(group.id))
        .map((b) => ({ x: b.x, y: b.y, r: b.packR }));
      const hull = paddedHullOfCircles(discs, HULL_PAD);
      if (hull.length === 0) continue;
      const anchor = hullLabelAnchor(hull, center, 10);
      const label: GroupLabel = {
        x: anchor.x,
        y: anchor.y + (anchor.dy > 0.35 ? 10 : anchor.dy < -0.35 ? -2 : 4),
        align: anchor.dx > 0.35 ? "start" : anchor.dx < -0.35 ? "end" : "middle",
      };
      // Labels of overlapping groups would stack on the same spot; stagger them outward,
      // away from the crowd, until the text box is clear of every label already placed.
      const w = group.name.length * 7 + 12;
      const mine = box(label, w);
      for (let guard = 0; guard < 16; guard++) {
        const clash = placed.find(
          (l) => l.left < mine.right && l.right > mine.left && Math.abs(l.y - label.y) < 15,
        );
        if (!clash) break;
        label.y = anchor.dy >= 0 ? clash.y + 15 : clash.y - 15;
      }
      placed.push({ ...mine, y: label.y });
      map.set(group.id, { path: hullPath(hull), label });
    }
    return map;
  }, [groups, people, buckets]);

  // Hovering wins over selection for what we spotlight; selection persists as the anchor of a pair.
  const focusId = hoveredId ?? selectedId;
  const focusPerson = focusId ? pos.get(focusId) : undefined;
  const selectedPerson = selectedId ? pos.get(selectedId) : undefined;
  const pairId = selectedId && hoveredId && hoveredId !== selectedId ? hoveredId : null;
  const pairPerson = pairId ? pos.get(pairId) : undefined;
  const pairShared =
    selectedPerson && pairPerson ? sharedGroupIds(selectedPerson.groupIds, pairPerson.groupIds) : [];

  // Quiet by default: only strong ties get a string. Focus a person to see all of theirs.
  // People in the same bucket share every group already; the bucket says that, so their strings
  // are hidden until one of them is focused.
  const visibleEdges = useMemo(() => {
    const isPair = (edge: Edge) =>
      Boolean(pairId) &&
      ((edge.a === selectedId && edge.b === pairId) || (edge.b === selectedId && edge.a === pairId));
    const sameBucket = (edge: Edge) => bucketOf.get(edge.a) === bucketOf.get(edge.b);
    return edges
      .map((edge) => ({ ...edge, score: scoreEdge(edge.shared, edge.union, weighting) }))
      .filter((edge) => {
        if (!pos.has(edge.a) || !pos.has(edge.b)) return false;
        if (focusId) return edge.a === focusId || edge.b === focusId || isPair(edge);
        return edge.score.showAtRest && !sameBucket(edge);
      })
      // Weak ties first, the hovered pair last, so the important string is drawn on top.
      .sort(
        (p, q) => Number(isPair(p)) - Number(isPair(q)) || p.score.strength - q.score.strength,
      );
  }, [edges, pos, bucketOf, focusId, pairId, selectedId, weighting]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .filter((event) => {
        if (event.type === "wheel") return true;
        if (event.type === "mousedown" || event.type === "touchstart") {
          const target = event.target;
          if (!(target instanceof Element)) return false;
          return !target.closest(".group-hit, .person-hit, .zoom-ui, .bond-hit");
        }
        return (!event.ctrlKey || event.type === "wheel") && !event.button;
      })
      .on("zoom", (event) => {
        const t = event.transform;
        onViewChangeRef.current({ x: t.x, y: t.y, k: t.k });
      });

    zoomRef.current = behavior;
    const selection = select(svg);
    selection.call(behavior);
    const initial = viewRef.current;
    selection.call(behavior.transform, zoomIdentity.translate(initial.x, initial.y).scale(initial.k));

    return () => {
      selection.on(".zoom", null);
      zoomRef.current = null;
    };
  }, []);

  function applyTransform(next: ViewTransform) {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (!svg || !behavior) return;
    select(svg).call(behavior.transform, zoomIdentity.translate(next.x, next.y).scale(next.k));
  }

  function zoomBy(factor: number) {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (!svg || !behavior) return;
    select(svg).call(behavior.scaleBy, factor);
  }

  function fitToContent() {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (!svg || !behavior) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const group of groupsRef.current) {
      minX = Math.min(minX, group.x - EMPTY_GROUP_R);
      minY = Math.min(minY, group.y - EMPTY_GROUP_R - 20);
      maxX = Math.max(maxX, group.x + EMPTY_GROUP_R);
      maxY = Math.max(maxY, group.y + EMPTY_GROUP_R);
    }
    for (const person of peopleRef.current) {
      minX = Math.min(minX, person.x - 40);
      minY = Math.min(minY, person.y - 44);
      maxX = Math.max(maxX, person.x + 40);
      maxY = Math.max(maxY, person.y + 40);
    }

    if (!Number.isFinite(minX)) {
      applyTransform({ x: 0, y: 0, k: 1 });
      return;
    }

    const width = svg.viewBox.baseVal.width || 1400;
    const height = svg.viewBox.baseVal.height || 820;
    const pad = 48;
    const bw = Math.max(maxX - minX, 80);
    const bh = Math.max(maxY - minY, 80);
    const k = Math.min(width / (bw + pad * 2), height / (bh + pad * 2), 2.5);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    applyTransform({
      x: width / 2 - k * cx,
      y: height / 2 - k * cy,
      k,
    });
  }

  // Auto-adjust moves everything; once the new positions have rendered, frame them.
  useEffect(() => {
    if (!fitPending.current) return;
    fitPending.current = false;
    fitToContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, people]);

  function runAutoAdjust() {
    fitPending.current = true;
    onAutoAdjust();
  }

  const zoomPercent = Math.round(view.k * 100);

  const drawnEdges = visibleEdges.flatMap((edge) => {
    const a = pos.get(edge.a);
    const b = pos.get(edge.b);
    if (!a || !b) return [];
    const pairHit =
      Boolean(pairId) &&
      ((edge.a === selectedId && edge.b === pairId) || (edge.b === selectedId && edge.a === pairId));
    const strong = edge.score.showAtRest;
    const t = edge.score.strength;
    const color = pairHit ? "#f4d38a" : strong ? "#9eb6ff" : "#7f92b3";
    const width = pairHit ? 3.2 : strong ? 1.8 + t * 1.8 : 1.2;
    const opacity = pairHit ? 0.95 : focusId ? 0.55 + t * 0.35 : 0.42 + t * 0.35;
    const d = dist(a, b) || 0.001;
    // Short strings get their count nudged off to the side so the dots don't cover it.
    const clearance = RING_R + 12;
    const off = d / 2 < clearance ? Math.sqrt(clearance ** 2 - (d / 2) ** 2) : 0;
    // Prefer nudging upward: names hang below the dots, so the space above is quieter.
    let px = -(b.y - a.y) / d;
    let py = (b.x - a.x) / d;
    if (py > 0) {
      px = -px;
      py = -py;
    }
    const mx = (a.x + b.x) / 2 + px * off;
    const my = (a.y + b.y) / 2 + py * off;
    // Counts appear when you focus someone; at rest only the tightest bonds carry a number.
    const showCount = Boolean(focusId) || edge.score.badgeAtRest;
    return [
      {
        key: `${edge.a}-${edge.b}`,
        a,
        b,
        label: edge.score.label,
        pairHit,
        color,
        width,
        opacity,
        mx,
        my,
        showCount,
      },
    ];
  });

  const highlightedGroups = new Set<string>(
    pairShared.length > 0
      ? pairShared
      : hoveredGroupId
        ? [hoveredGroupId]
        : focusPerson
          ? focusPerson.groupIds
          : [],
  );
  const spotlight = highlightedGroups.size > 0;

  // "Closest" follows the active weighting: most shared circles, or highest Jaccard overlap.
  const closest =
    selectedPerson
      ? people
          .filter((p) => p.id !== selectedPerson.id)
          .map((p) => {
            const shared = sharedGroupCount(selectedPerson.groupIds, p.groupIds);
            const union = unionGroupCount(selectedPerson.groupIds, p.groupIds);
            return {
              person: p,
              shared,
              score: weighting === "jaccard" ? jaccard(shared, union) : shared,
              d: dist(selectedPerson, p),
            };
          })
          .filter((item) => item.shared > 0)
          .sort((a, b) => b.score - a.score || a.d - b.d)[0]
      : undefined;

  let footnote: string | null = null;
  if (selectedPerson && pairPerson) {
    const names = pairShared
      .map((id) => groupById.get(id)?.name)
      .filter((name): name is string => Boolean(name));
    footnote =
      names.length > 0
        ? `${shortName(selectedPerson.name)} & ${shortName(pairPerson.name)} share ${names.join(", ")}`
        : `${shortName(selectedPerson.name)} & ${shortName(pairPerson.name)} share no groups`;
  } else if (selectedPerson && closest) {
    const measure =
      weighting === "jaccard"
        ? `${Math.round(closest.score * 100)}% overlap`
        : `${closest.shared} shared group${closest.shared === 1 ? "" : "s"}`;
    footnote = `Closest to ${shortName(selectedPerson.name)}: ${shortName(closest.person.name)} · ${measure}`;
  } else if (selectedPerson) {
    footnote = `${shortName(selectedPerson.name)} shares no groups with anyone yet`;
  }

  return (
    <div className="canvas-wrap">
      <svg
        ref={svgRef}
        viewBox="0 0 1400 820"
        preserveAspectRatio="xMidYMid meet"
        onClick={() => onSelectPerson(null)}
      >
        <rect className="canvas-bg" width="1400" height="820" fill="transparent" />

        <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
          {groups.map((group) => {
            const emphasized = highlightedGroups.has(group.id);
            return (
              <GroupShape
                key={group.id}
                group={group}
                hull={hulls.get(group.id)}
                emphasized={emphasized}
                muted={spotlight && !emphasized}
                viewRef={viewRef}
                onMoveGroup={onMoveGroup}
                onHover={setHoveredGroupId}
              />
            );
          })}

          {drawnEdges.map((edge) => (
            <line
              key={edge.key}
              className="bond-hit"
              x1={edge.a.x}
              y1={edge.a.y}
              x2={edge.b.x}
              y2={edge.b.y}
              stroke={edge.color}
              strokeWidth={edge.width}
              strokeOpacity={edge.opacity}
              strokeLinecap="round"
            />
          ))}

          {people.map((person) => {
            const selected = selectedId === person.id;
            const hovered = hoveredId === person.id;
            const sharedWithFocus = focusPerson
              ? sharedGroupCount(focusPerson.groupIds, person.groupIds)
              : 0;
            const inHoveredGroup = hoveredGroupId ? person.groupIds.includes(hoveredGroupId) : true;
            const dim =
              (Boolean(focusPerson) && focusPerson!.id !== person.id && sharedWithFocus === 0) ||
              !inHoveredGroup;
            const isPair = pairId === person.id;
            const memberships = person.groupIds.filter((id) => groupById.has(id));
            return (
              <g
                key={person.id}
                className="person-hit"
                transform={`translate(${person.x}, ${person.y})`}
                opacity={dim ? 0.3 : 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPerson(selected ? null : person.id);
                }}
                onMouseEnter={() => setHoveredId(person.id)}
                onMouseLeave={() => setHoveredId((id) => (id === person.id ? null : id))}
              >
                {selected || isPair ? (
                  <circle
                    r={RING_R + 8}
                    fill={isPair ? "#f4d38a" : "#5b8def"}
                    fillOpacity={0.2}
                  />
                ) : null}
                <circle r={RING_R + 3} fill="#0e1218" fillOpacity={0.85} />
                {memberships.length === 0 ? (
                  <circle
                    r={RING_R}
                    fill="none"
                    stroke="#4a5568"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                ) : (
                  memberships.map((gid, i) => (
                    <path
                      key={gid}
                      d={ringSegmentPath(0, 0, RING_R, i, memberships.length)}
                      fill="none"
                      stroke={groupById.get(gid)?.color}
                      strokeWidth={3}
                      strokeLinecap="butt"
                      opacity={spotlight && !highlightedGroups.has(gid) ? 0.35 : 1}
                    />
                  ))
                )}
                <circle
                  r={selected || hovered ? DOT_R + 1 : DOT_R}
                  fill="#f4f7fb"
                  stroke={selected ? "#5b8def" : isPair ? "#f4d38a" : "#0e1218"}
                  strokeWidth={selected || isPair ? 2.5 : 1.5}
                />
                <text className="person-label" y={RING_R + 14} textAnchor="middle" fill="#d5deea">
                  {shortName(person.name)}
                </text>
              </g>
            );
          })}

          {drawnEdges
            .filter((edge) => edge.showCount)
            .map((edge) => (
              <g key={`count-${edge.key}`} className="bond-hit">
                <circle
                  cx={edge.mx}
                  cy={edge.my}
                  r={edge.label.length > 2 ? 11 : 8.5}
                  fill="#0e1218"
                  stroke={edge.color}
                  strokeWidth={1}
                  strokeOpacity={edge.opacity}
                />
                <text
                  className="bond-label"
                  x={edge.mx}
                  y={edge.my + 3.5}
                  textAnchor="middle"
                  fill={edge.pairHit ? "#f4d38a" : "#d7e4ff"}
                >
                  {edge.label}
                </text>
              </g>
            ))}
        </g>
      </svg>

      {footnote ? <p className="relativity">{footnote}</p> : null}

      <div className="zoom-ui">
        <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(0.8)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={() => applyTransform({ x: 0, y: 0, k: 1 })}>
          100%
        </button>
        <button type="button" onClick={fitToContent}>
          Fit
        </button>
        <span className="zoom-label">{zoomPercent}%</span>
        <span className="divider" />
        <button
          type="button"
          title="Re-place every group from who belongs to it. Overwrites dragged positions."
          onClick={runAutoAdjust}
          disabled={groups.length === 0}
        >
          Auto-adjust
        </button>
        <button
          type="button"
          className={weighting === "jaccard" ? "on" : undefined}
          aria-pressed={weighting === "jaccard"}
          title="Weight ties by shared ÷ combined circles (Jaccard) instead of raw shared count"
          onClick={onToggleWeighting}
        >
          Normalize
        </button>
      </div>
    </div>
  );
}

type GroupShapeProps = {
  group: Group;
  hull?: { path: string; label: GroupLabel };
  emphasized: boolean;
  muted: boolean;
  viewRef: { current: ViewTransform };
  onMoveGroup: (id: string, x: number, y: number) => void;
  onHover: (id: string | null) => void;
};

function GroupShape({
  group,
  hull,
  emphasized,
  muted,
  viewRef,
  onMoveGroup,
  onHover,
}: GroupShapeProps) {
  const rootRef = useRef<SVGGElement>(null);
  const groupRef = useRef(group);
  const moveRef = useRef(onMoveGroup);
  groupRef.current = group;
  moveRef.current = onMoveGroup;

  useEffect(() => {
    const el = rootRef.current;
    const svg = el?.ownerSVGElement;
    if (!el || !svg) return;

    let last: [number, number] | null = null;
    const behavior = drag<SVGGElement, unknown>()
      .on("start", (event) => {
        event.sourceEvent.stopPropagation();
        last = invertPoint(viewRef.current, ...pointer(event.sourceEvent, svg));
      })
      .on("drag", (event) => {
        const now = invertPoint(viewRef.current, ...pointer(event.sourceEvent, svg));
        if (!last) return;
        const g = groupRef.current;
        moveRef.current(g.id, g.x + now[0] - last[0], g.y + now[1] - last[1]);
        last = now;
      });

    select(el).call(behavior);
    return () => {
      select(el).on(".drag", null);
    };
  }, [viewRef]);

  const label: GroupLabel = hull
    ? hull.label
    : { x: group.x, y: group.y - EMPTY_GROUP_R - 8, align: "middle" };
  const fillOpacity = emphasized ? 0.22 : muted ? 0.03 : 0.08;
  const strokeOpacity = emphasized ? 0.9 : muted ? 0.08 : 0.28;

  return (
    <g
      ref={rootRef}
      className="group-hit"
      onMouseEnter={() => onHover(group.id)}
      onMouseLeave={() => onHover(null)}
    >
      {hull ? (
        <path
          d={hull.path}
          fill={group.color}
          fillOpacity={fillOpacity}
          stroke={group.color}
          strokeOpacity={strokeOpacity}
          strokeWidth={emphasized ? 2 : 1.2}
          strokeLinejoin="round"
        />
      ) : (
        <circle
          cx={group.x}
          cy={group.y}
          r={EMPTY_GROUP_R}
          fill={group.color}
          fillOpacity={fillOpacity}
          stroke={group.color}
          strokeOpacity={strokeOpacity}
          strokeWidth={1.4}
          strokeDasharray="5 4"
        />
      )}
      <text
        className="group-label"
        x={label.x}
        y={label.y}
        textAnchor={label.align}
        fill={group.color}
        opacity={muted ? 0.35 : 1}
      >
        {group.name}
      </text>
    </g>
  );
}
