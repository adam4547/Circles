export type Group = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  r: number;
};

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

export type Workspace = {
  version: 1;
  id: string;
  name: string;
  updatedAt: string;
  groups: Group[];
  people: Person[];
  view: ViewTransform;
};

export type RecentWorkspace = {
  filePath: string;
  name: string;
  updatedAt: string;
  groupCount: number;
  personCount: number;
};
