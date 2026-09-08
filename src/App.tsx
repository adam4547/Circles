import { useEffect, useMemo, useRef, useState } from "react";
import CanvasStage from "./components/CanvasStage";
import HomeScreen from "./components/HomeScreen";
import SidePanel from "./components/SidePanel";
import { exampleData, GROUP_COLORS } from "./example";
import { sharedGroupCount, unionGroupCount } from "./geometry";
import { autoAdjustGroups } from "./groupLayout";
import { layoutPeople } from "./layout";
import type {
  EdgeWeighting,
  Group,
  Person,
  RecentWorkspace,
  ViewTransform,
  Workspace,
} from "./types";
import {
  createWorkspace as createWorkspaceFile,
  deleteWorkspace,
  isDesktopApp,
  listWorkspaces,
  loadWorkspace,
  openWorkspace as openWorkspaceFile,
  removeRecent,
  saveWorkspace,
} from "./workspaceStore";
import "./App.css";

function buildWorkspace(
  id: string,
  name: string,
  groups: Group[],
  people: Person[],
  view: ViewTransform,
): Workspace {
  return {
    version: 1,
    id,
    name,
    updatedAt: new Date().toISOString(),
    groups,
    people,
    view,
  };
}

export default function App() {
  const [recents, setRecents] = useState<RecentWorkspace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, k: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // View-only preference; not written to the workspace file, so it resets to raw on open.
  const [weighting, setWeighting] = useState<EdgeWeighting>("raw");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [newPersonName, setNewPersonName] = useState("");
  const skipSave = useRef(true);

  const open = Boolean(filePath && workspaceId);

  useEffect(() => {
    if (!isDesktopApp()) {
      setError("Open Circles.exe to create and save workspaces.");
      return;
    }
    listWorkspaces()
      .then(setRecents)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load recent workspaces.");
      });
  }, []);

  function applyOpened(file: string, workspace: Workspace) {
    skipSave.current = true;
    setError(null);
    setFilePath(file);
    setWorkspaceId(workspace.id);
    setWorkspaceName(workspace.name);
    // Older files carried a dead `r` radius; keep only the fields the app uses.
    setGroups(workspace.groups.map(({ id, name, color, x, y }) => ({ id, name, color, x, y })));
    setPeople(workspace.people);
    setView(workspace.view ?? { x: 0, y: 0, k: 1 });
    setSelectedId(null);
  }

  useEffect(() => {
    if (!open || !isDesktopApp() || !filePath || !workspaceId) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      const payload = buildWorkspace(workspaceId, workspaceName.trim() || "Untitled", groups, people, view);
      saveWorkspace(filePath, payload)
        .then(({ workspace }) => {
          setRecents((prev) => {
            const entry = {
              filePath,
              id: workspace.id,
              name: workspace.name,
              updatedAt: workspace.updatedAt,
              groupCount: workspace.groups.length,
              personCount: workspace.people.length,
            };
            return [entry, ...prev.filter((item) => item.filePath !== filePath)];
          });
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Could not save workspace.");
        });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [open, filePath, workspaceId, workspaceName, groups, people, view]);

  const layout = useMemo(() => layoutPeople(people, groups), [people, groups]);

  const placedPeople = useMemo(
    () =>
      people.map((person) => ({
        ...person,
        ...(layout.positions.get(person.id) ?? { x: 70, y: 70 }),
      })),
    [people, layout],
  );

  const edges = useMemo(() => {
    const list: { a: string; b: string; shared: number; union: number }[] = [];
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        const shared = sharedGroupCount(people[i].groupIds, people[j].groupIds);
        if (shared > 0) {
          list.push({
            a: people[i].id,
            b: people[j].id,
            shared,
            union: unionGroupCount(people[i].groupIds, people[j].groupIds),
          });
        }
      }
    }
    return list;
  }, [people]);

  async function createWorkspace() {
    if (!isDesktopApp()) return;
    try {
      const result = await createWorkspaceFile();
      if (result.canceled) return;
      applyOpened(result.filePath, result.workspace);
      setRecents(await listWorkspaces());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create workspace.");
    }
  }

  async function openWorkspace() {
    if (!isDesktopApp()) return;
    try {
      const result = await openWorkspaceFile();
      if (result.canceled) return;
      applyOpened(result.filePath, result.workspace);
      setRecents(await listWorkspaces());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open workspace.");
    }
  }

  async function openRecent(path: string) {
    if (!isDesktopApp()) return;
    try {
      const result = await loadWorkspace(path);
      applyOpened(result.filePath, result.workspace);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open that file.");
      setRecents(await listWorkspaces());
    }
  }

  async function closeWorkspace() {
    if (isDesktopApp() && filePath && workspaceId) {
      try {
        await saveWorkspace(
          filePath,
          buildWorkspace(workspaceId, workspaceName.trim() || "Untitled", groups, people, view),
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not save workspace.");
        return;
      }
    }
    setFilePath(null);
    setWorkspaceId(null);
    setError(null);
    if (isDesktopApp()) setRecents(await listWorkspaces());
  }

  function addGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    setGroups((prev) => {
      // Fan new groups out around the middle so they don't pile onto one spot.
      const angle = prev.length * 2.39996 - Math.PI / 2;
      const radius = prev.length === 0 ? 0 : 200 + 18 * Math.floor(prev.length / 5);
      return [
        ...prev,
        {
          id,
          name,
          color: newGroupColor,
          x: Math.round(700 + Math.cos(angle) * radius),
          y: Math.round(410 + Math.sin(angle) * radius),
        },
      ];
    });
    setNewGroupName("");
    setNewGroupColor(GROUP_COLORS[groups.length % GROUP_COLORS.length]);
  }

  function addPerson() {
    const name = newPersonName.trim();
    if (!name) return;
    setPeople((prev) => [...prev, { id: crypto.randomUUID(), name, groupIds: [] }]);
    setNewPersonName("");
  }

  function loadExample() {
    if (groups.length > 0 || people.length > 0) return;
    const example = exampleData();
    setGroups(autoAdjustGroups(example.groups, example.people));
    setPeople(example.people);
    setSelectedId(null);
  }

  /** Overwrites every anchor, including hand-dragged ones. Dragging is a nudge, not a pin. */
  function autoAdjust() {
    setGroups((prev) => autoAdjustGroups(prev, people));
  }

  if (!open) {
    return (
      <HomeScreen
        recents={recents}
        error={error}
        onCreate={createWorkspace}
        onOpen={openWorkspace}
        onOpenRecent={openRecent}
        onRemoveRecent={async (path) => {
          if (!isDesktopApp()) return;
          setRecents(await removeRecent(path));
        }}
        onDeleteFile={async (path) => {
          if (!isDesktopApp()) return;
          const ok = window.confirm("Delete this workspace file from disk?");
          if (!ok) return;
          try {
            const { recents: next } = await deleteWorkspace(path);
            setRecents(next);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not delete that file.");
          }
        }}
      />
    );
  }

  return (
    <div className="app">
      <main className="stage">
        <CanvasStage
          key={filePath}
          groups={groups}
          people={placedPeople}
          buckets={layout.buckets}
          bucketOf={layout.bucketOf}
          edges={edges}
          selectedId={selectedId}
          view={view}
          weighting={weighting}
          onToggleWeighting={() => setWeighting((w) => (w === "raw" ? "jaccard" : "raw"))}
          onAutoAdjust={autoAdjust}
          onViewChange={setView}
          onSelectPerson={setSelectedId}
          onMoveGroup={(id, x, y) =>
            setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, x, y } : g)))
          }
        />
        <p className="hint">
          People with the exact same groups share a cluster; the ring around each dot shows their
          groups. Hover or click a person to see their ties, then hover another to compare the
          pair. Drag a group to nudge it, or Auto-adjust to re-place every group from membership.
        </p>
        {error ? <p className="save-error">{error}</p> : null}
      </main>
      <SidePanel
        workspaceName={workspaceName}
        onWorkspaceName={setWorkspaceName}
        onClose={closeWorkspace}
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
        onLoadExample={loadExample}
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
