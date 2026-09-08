import { sharedGroupCount } from "../geometry";
import type { Group, Person } from "../types";

type Props = {
  workspaceName: string;
  onWorkspaceName: (name: string) => void;
  onClose: () => void;
  groups: Group[];
  people: Person[];
  selectedId: string | null;
  newGroupName: string;
  newGroupColor: string;
  newPersonName: string;
  onNewGroupName: (value: string) => void;
  onNewGroupColor: (value: string) => void;
  onNewPersonName: (value: string) => void;
  onAddGroup: () => void;
  onAddPerson: () => void;
  onLoadExample: () => void;
  onRenameGroup: (id: string, name: string) => void;
  onRecolorGroup: (id: string, color: string) => void;
  onDeleteGroup: (id: string) => void;
  onRenamePerson: (id: string, name: string) => void;
  onDeletePerson: (id: string) => void;
  onToggleMembership: (personId: string, groupId: string) => void;
  onSelectPerson: (id: string) => void;
};

export default function SidePanel(props: Props) {
  const selected = props.people.find((p) => p.id === props.selectedId);
  const empty = props.groups.length === 0 && props.people.length === 0;
  return (
    <aside className="panel">
      <header className="panel-head">
        <div className="panel-nav">
          <button type="button" onClick={props.onClose}>
            Workspaces
          </button>
          {empty ? (
            <button type="button" onClick={props.onLoadExample}>
              Load example data
            </button>
          ) : null}
        </div>
        <input
          className="workspace-name"
          type="text"
          value={props.workspaceName}
          onChange={(e) => props.onWorkspaceName(e.target.value)}
          aria-label="Workspace name"
        />
        <p>
          Each dot's ring shows its groups; closer dots share more of them. Select someone, then
          hover another person to see what the two share.
        </p>
      </header>
      <div className="panel-scroll">
        <div className="section-title">Groups</div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            props.onAddGroup();
          }}
        >
          <input
            type="text"
            placeholder="New group"
            value={props.newGroupName}
            onChange={(e) => props.onNewGroupName(e.target.value)}
          />
          <input
            type="color"
            value={props.newGroupColor}
            onChange={(e) => props.onNewGroupColor(e.target.value)}
            aria-label="Group color"
          />
          <button type="submit">Add</button>
        </form>
        {props.groups.map((group) => (
          <div key={group.id} className="card">
            <div className="card-top">
              <span className="swatch" style={{ background: group.color }} />
              <input
                type="text"
                value={group.name}
                onChange={(e) => props.onRenameGroup(group.id, e.target.value)}
              />
              <input
                type="color"
                value={group.color}
                onChange={(e) => props.onRecolorGroup(group.id, e.target.value)}
                aria-label={`Color for ${group.name}`}
              />
              <button className="danger" type="button" onClick={() => props.onDeleteGroup(group.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}

        <div className="section-title" style={{ marginTop: 18 }}>
          People
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            props.onAddPerson();
          }}
        >
          <input
            type="text"
            placeholder="New person"
            value={props.newPersonName}
            onChange={(e) => props.onNewPersonName(e.target.value)}
          />
          <button type="submit">Add</button>
        </form>
        {props.people.map((person) => {
          const shared =
            selected && selected.id !== person.id
              ? sharedGroupCount(selected.groupIds, person.groupIds)
              : 0;
          return (
          <div
            key={person.id}
            className={person.id === props.selectedId ? "card selected" : "card"}
            onClick={() => props.onSelectPerson(person.id)}
          >
            <div className="card-top">
              <input
                type="text"
                value={person.name}
                onChange={(e) => props.onRenamePerson(person.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="danger"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onDeletePerson(person.id);
                }}
              >
                Delete
              </button>
            </div>
            {shared > 0 ? (
              <p className="shared-note">
                {shared} shared group{shared === 1 ? "" : "s"} with {selected?.name}
              </p>
            ) : null}
            <div className="chips">
              {props.groups.map((group) => {
                const on = person.groupIds.includes(group.id);
                return (
                  <button
                    key={group.id}
                    type="button"
                    className={on ? "chip on" : "chip"}
                    style={
                      on
                        ? { background: group.color, borderColor: group.color }
                        : undefined
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onToggleMembership(person.id, group.id);
                    }}
                  >
                    {group.name}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </aside>
  );
}
