import { useMemo, useState } from "react";
import CanvasStage from "./components/CanvasStage";
import SidePanel from "./components/SidePanel";
import { sharedGroupCount } from "./geometry";
import { layoutPeople } from "./layout";
import { GROUP_COLORS, seedGroups, seedPeople } from "./seed";
import type { Group, Person } from "./types";
import "./App.css";

export default function App() {
  const [groups, setGroups] = useState<Group[]>(seedGroups);
  const [people, setPeople] = useState<Person[]>(seedPeople);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [newPersonName, setNewPersonName] = useState("");

  const positions = useMemo(() => layoutPeople(people, groups), [people, groups]);

  const placedPeople = useMemo(
    () =>
      people.map((person) => ({
        ...person,
        ...(positions.get(person.id) ?? { x: 70, y: 70 }),
      })),
    [people, positions],
  );

  const edges = useMemo(() => {
    const list: { a: string; b: string; shared: number }[] = [];
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        const shared = sharedGroupCount(people[i].groupIds, people[j].groupIds);
        if (shared > 0) {
          list.push({ a: people[i].id, b: people[j].id, shared });
        }
      }
    }
    return list;
  }, [people]);

  function addGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    setGroups((prev) => [
      ...prev,
      { id, name, color: newGroupColor, x: 700, y: 400, r: 130 },
    ]);
    setNewGroupName("");
    setNewGroupColor(GROUP_COLORS[groups.length % GROUP_COLORS.length]);
  }

  function addPerson() {
    const name = newPersonName.trim();
    if (!name) return;
    setPeople((prev) => [...prev, { id: crypto.randomUUID(), name, groupIds: [] }]);
    setNewPersonName("");
  }

  return (
    <div className="app">
      <main className="stage">
        <CanvasStage
          groups={groups}
          people={placedPeople}
          edges={edges}
          selectedId={selectedId}
          onSelectPerson={setSelectedId}
          onMoveGroup={(id, x, y) =>
            setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, x, y } : g)))
          }
          onResizeGroup={(id, r) =>
            setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, r } : g)))
          }
        />
        <p className="hint">
          Drag a circle to move it. Drag the rim handle to resize. Click a person to
          highlight shared-group links.
        </p>
      </main>
      <SidePanel
        groups={groups}
        people={people}
        selectedId={selectedId}
        newGroupName={newGroupName}
        newGroupColor={newGroupColor}
        newPersonName={newPersonName}
        onNewGroupName={setNewGroupName}
        onNewGroupColor={setNewGroupColor}
        onNewPersonName={setNewPersonName}
        onAddGroup={addGroup}
        onAddPerson={addPerson}
        onRenameGroup={(id, name) =>
          setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)))
        }
        onRecolorGroup={(id, color) =>
          setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, color } : g)))
        }
        onDeleteGroup={(id) => {
          setGroups((prev) => prev.filter((g) => g.id !== id));
          setPeople((prev) =>
            prev.map((p) => ({ ...p, groupIds: p.groupIds.filter((gid) => gid !== id) })),
          );
        }}
        onRenamePerson={(id, name) =>
          setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
        }
        onDeletePerson={(id) => {
          setPeople((prev) => prev.filter((p) => p.id !== id));
          if (selectedId === id) setSelectedId(null);
        }}
        onToggleMembership={(personId, groupId) => {
          setPeople((prev) =>
            prev.map((p) => {
              if (p.id !== personId) return p;
              const has = p.groupIds.includes(groupId);
              return {
                ...p,
                groupIds: has
                  ? p.groupIds.filter((gid) => gid !== groupId)
                  : [...p.groupIds, groupId],
              };
            }),
          );
        }}
        onSelectPerson={setSelectedId}
      />
    </div>
  );
}
