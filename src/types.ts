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
