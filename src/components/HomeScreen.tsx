import type { RecentWorkspace } from "../types";

type Props = {
  recents: RecentWorkspace[];
  error: string | null;
  onCreate: () => void;
  onOpen: () => void;
  onOpenRecent: (filePath: string) => void;
  onRemoveRecent: (filePath: string) => void;
  onDeleteFile: (filePath: string) => void;
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HomeScreen({
  recents,
  error,
  onCreate,
  onOpen,
  onOpenRecent,
  onRemoveRecent,
  onDeleteFile,
}: Props) {
  return (
    <div className="home">
      <div className="home-card">
        <h1>Circles</h1>
        <p>
          Start on a blank canvas. Create a workspace, choose where to save it, then add
          groups and people.
        </p>
        <div className="home-actions">
          <button type="button" className="primary" onClick={onCreate}>
            New workspace
          </button>
          <button type="button" onClick={onOpen}>
            Open file
          </button>
        </div>
        {error ? <p className="home-error">{error}</p> : null}
        {recents.length > 0 ? (
          <div className="recent-list">
            <div className="section-title">Recent</div>
            {recents.map((entry) => (
              <div key={entry.filePath} className="recent-row">
                <button
                  type="button"
                  className="recent-open"
                  onClick={() => onOpenRecent(entry.filePath)}
                >
                  <strong>{entry.name}</strong>
                  <span>
                    {entry.groupCount} groups · {entry.personCount} people
                    {entry.updatedAt ? ` · ${formatDate(entry.updatedAt)}` : ""}
                  </span>
                  <em>{entry.filePath}</em>
                </button>
                <button type="button" onClick={() => onRemoveRecent(entry.filePath)}>
                  Hide
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => onDeleteFile(entry.filePath)}
                >
                  Delete file
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="home-empty">No saved workspaces yet.</p>
        )}
      </div>
    </div>
  );
}
