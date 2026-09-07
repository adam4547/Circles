import { drag, pointer, select } from "d3";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "../types";

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
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
  onSelectPerson: (id: string | null) => void;
  onMoveGroup: (id: string, x: number, y: number) => void;
  onResizeGroup: (id: string, r: number) => void;
};

export default function CanvasStage({
  groups,
  people,
  edges,
  selectedId,
  onSelectPerson,
  onMoveGroup,
  onResizeGroup,
}: Props) {
  const maxShared = useMemo(
    () => edges.reduce((m, e) => Math.max(m, e.shared), 1),
    [edges],
  );

  const pos = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  return (
    <svg
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

      {groups.map((group) => (
        <GroupShape
          key={group.id}
          group={group}
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
    </svg>
  );
}

type GroupShapeProps = {
  group: Group;
  onMoveGroup: (id: string, x: number, y: number) => void;
  onResizeGroup: (id: string, r: number) => void;
};

function GroupShape({ group, onMoveGroup, onResizeGroup }: GroupShapeProps) {
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
        last = pointer(event.sourceEvent, svg);
      })
      .on("drag", (event) => {
        const now = pointer(event.sourceEvent, svg);
        if (!last) return;
        const g = groupRef.current;
        moveRef.current(g.id, g.x + now[0] - last[0], g.y + now[1] - last[1]);
        last = now;
      });

    select(el).call(behavior);
    return () => {
      select(el).on(".drag", null);
    };
  }, []);

  useEffect(() => {
    const el = handleRef.current;
    const svg = el?.ownerSVGElement;
    if (!el || !svg) return;

    const behavior = drag<SVGCircleElement, unknown>()
      .on("start", (event) => event.sourceEvent.stopPropagation())
      .on("drag", (event) => {
        const now = pointer(event.sourceEvent, svg);
        const g = groupRef.current;
        resizeRef.current(g.id, Math.max(60, Math.hypot(now[0] - g.x, now[1] - g.y)));
      });

    select(el).call(behavior);
    return () => {
      select(el).on(".drag", null);
    };
  }, []);

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
