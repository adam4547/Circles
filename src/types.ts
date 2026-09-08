/** A circle. `x`/`y` is its anchor point: where members are pulled toward and what you drag. */
export type Group = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

/** How ties between two people are scored. Raw = shared circles; Jaccard = shared / union of both people's circles. */
export type EdgeWeighting = "raw" | "jaccard";

export type Person = {
  id: string;
  name: string;
  groupIds: string[];
};

export type Point = {
  x: number;
  y: number;
};

export type ViewTransform = {
  x: number;
  y: number;
  k: number;
};

export type WorkspaceMeta = {
  id: string;
  name: string;
  updatedAt: string;
  groupCount?: number;
  personCount?: number;
};

export type Workspace = WorkspaceMeta & {
  version: 1;
  groups: Group[];
  people: Person[];
  view: ViewTransform;
};

export type RecentWorkspace = WorkspaceMeta & {
  filePath: string;
  groupCount: number;
  personCount: number;
};
