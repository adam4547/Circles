import { drag, pointer, select, zoom, zoomIdentity } from "d3";
import { useEffect, useMemo, useRef } from "react";
import type { Group, ViewTransform } from "../types";

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
};

type Props = {
  groups: Group[];
  people: PersonNode[];
  edges: Edge[];
  selectedId: string | null;
  view: ViewTransform;
  onViewChange: (view: ViewTransform) => void;
  onSelectPerson: (id: string | null) => void;
  onMoveGroup: (id: string, x: number, y: number) => void;
  onResizeGroup: (id: string, r: number) => void;
};

export default function CanvasStage({
  groups,
  people,
  edges,
  selectedId,
  view,
  onViewChange,
  onSelectPerson,
  onMoveGroup,
  onResizeGroup,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ReturnType<typeof zoom<SVGSVGElement, unknown>> | null>(null);
  const viewRef = useRef(view);
  const onViewChangeRef = useRef(onViewChange);
  const groupsRef = useRef(groups);
  const peopleRef = useRef(people);
  viewRef.current = view;
  onViewChangeRef.current = onViewChange;
  groupsRef.current = groups;
  peopleRef.current = people;

  const maxShared = useMemo(
    () => edges.reduce((m, e) => Math.max(m, e.shared), 1),
    [edges],
  );

  const pos = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

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
          return !target.closest(".group-hit, .handle, .person-hit, .zoom-ui");
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
      minX = Math.min(minX, group.x - group.r);
      minY = Math.min(minY, group.y - group.r);
      maxX = Math.max(maxX, group.x + group.r);
      maxY = Math.max(maxY, group.y + group.r);
    }
    for (const person of peopleRef.current) {
      minX = Math.min(minX, person.x - 24);
      minY = Math.min(minY, person.y - 24);
      maxX = Math.max(maxX, person.x + 24);
      maxY = Math.max(maxY, person.y + 28);
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

  const zoomPercent = Math.round(view.k * 100);

  return (
    <div className="canvas-wrap">
      <svg
        ref={svgRef}
        viewBox="0 0 1400 820"
        preserveAspectRatio="xMidYMid meet"
        onClick={() => onSelectPerson(null)}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect className="canvas-bg" width="1400" height="820" fill="transparent" />

        <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
          {groups.map((group) => (
            <GroupShape
              key={group.id}
              group={group}
              viewRef={viewRef}
              onMoveGroup={onMoveGroup}
              onResizeGroup={onResizeGroup}
            />
          ))}

          <g filter="url(#glow)">
            {edges.map((edge) => {
              const a = pos.get(edge.a);
              const b = pos.get(edge.b);
              if (!a || !b) return null;
              const t = edge.shared / maxShared;
              const related =
                !selectedId || edge.a === selectedId || edge.b === selectedId;
              const opacity = related ? 0.18 + t * 0.72 : 0.04;
              return (
                <line
                  key={`${edge.a}-${edge.b}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#d7e4ff"
                  strokeWidth={0.6 + t * 2.4}
                  strokeOpacity={opacity}
                />
              );
            })}
          </g>

          {people.map((person) => {
            const dim = Boolean(selectedId && selectedId !== person.id);
            return (
              <g
                key={person.id}
                className="person-hit"
                transform={`translate(${person.x}, ${person.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPerson(person.id);
                }}
              >
                <circle
                  r={selectedId === person.id ? 11 : 9}
                  fill="#f4f7fb"
                  stroke={selectedId === person.id ? "#5b8def" : "#0e1218"}
                  strokeWidth={selectedId === person.id ? 3 : 2}
                  opacity={dim ? 0.45 : 1}
                />
                <text
                  className="person-label"
                  y={22}
                  textAnchor="middle"
                  fill="#d5deea"
                  opacity={dim ? 0.45 : 1}
                >
                  {shortName(person.name)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

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
      </div>
    </div>
  );
}

type GroupShapeProps = {
  group: Group;
  viewRef: { current: ViewTransform };
  onMoveGroup: (id: string, x: number, y: number) => void;
  onResizeGroup: (id: string, r: number) => void;
};

function GroupShape({ group, viewRef, onMoveGroup, onResizeGroup }: GroupShapeProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const handleRef = useRef<SVGCircleElement>(null);
  const groupRef = useRef(group);
  const moveRef = useRef(onMoveGroup);
  const resizeRef = useRef(onResizeGroup);
  groupRef.current = group;
  moveRef.current = onMoveGroup;
  resizeRef.current = onResizeGroup;

  useEffect(() => {
    const el = circleRef.current;
    const svg = el?.ownerSVGElement;
    if (!el || !svg) return;

    let last: [number, number] | null = null;
    const behavior = drag<SVGCircleElement, unknown>()
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

  useEffect(() => {
    const el = handleRef.current;
    const svg = el?.ownerSVGElement;
    if (!el || !svg) return;

    const behavior = drag<SVGCircleElement, unknown>()
      .on("start", (event) => event.sourceEvent.stopPropagation())
      .on("drag", (event) => {
        const now = invertPoint(viewRef.current, ...pointer(event.sourceEvent, svg));
        const g = groupRef.current;
        resizeRef.current(g.id, Math.max(60, Math.hypot(now[0] - g.x, now[1] - g.y)));
      });

    select(el).call(behavior);
    return () => {
      select(el).on(".drag", null);
    };
  }, [viewRef]);

  const handleX = group.x + group.r * Math.SQRT1_2;
  const handleY = group.y + group.r * Math.SQRT1_2;

  return (
    <g>
      <circle
        ref={circleRef}
        className="group-hit"
        cx={group.x}
        cy={group.y}
        r={group.r}
        fill={group.color}
        fillOpacity={0.16}
        stroke={group.color}
        strokeOpacity={0.85}
        strokeWidth={2}
      />
      <text
        className="group-label"
        x={group.x}
        y={group.y - group.r + 18}
        textAnchor="middle"
        fill={group.color}
      >
        {group.name}
      </text>
      <circle
        ref={handleRef}
        className="handle"
        cx={handleX}
        cy={handleY}
        r={7}
        fill={group.color}
        stroke="#0e1218"
        strokeWidth={2}
      />
    </g>
  );
}
