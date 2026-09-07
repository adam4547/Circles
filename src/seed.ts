import type { Group, Person } from "./types";

const palette = [
  "#5b8def",
  "#e06c75",
  "#98c379",
  "#e5c07b",
  "#c678dd",
  "#56b6c2",
  "#d19a66",
  "#61afef",
  "#e86671",
  "#7ee787",
  "#ffa657",
];

export const seedGroups: Group[] = [
  { id: "g-wef", name: "World Economic Forum", color: palette[0], x: 980, y: 170, r: 130 },
  { id: "g-elsmosh", name: "ElSmosh", color: palette[1], x: 380, y: 250, r: 155 },
  { id: "g-cantina", name: "Cantina", color: palette[2], x: 720, y: 290, r: 145 },
  { id: "g-dbrx", name: "DBRX", color: palette[3], x: 1040, y: 390, r: 140 },
  { id: "g-boys", name: "The Boys", color: palette[4], x: 560, y: 420, r: 210 },
  { id: "g-crooms", name: "Crooms High School", color: palette[5], x: 250, y: 500, r: 165 },
  { id: "g-greenwood", name: "Greenwood Middle School", color: palette[6], x: 160, y: 260, r: 125 },
  { id: "g-sanford", name: "Sanford Middle School", color: palette[7], x: 860, y: 560, r: 120 },
  { id: "g-markham", name: "Markham Middle School", color: palette[8], x: 430, y: 640, r: 120 },
  { id: "g-uf", name: "University of Florida", color: palette[9], x: 1160, y: 560, r: 155 },
  { id: "g-ucf", name: "University of Central Florida", color: palette[10], x: 780, y: 150, r: 145 },
];

function p(id: string, name: string, groupIds: string[]): Person {
  return { id, name, groupIds };
}

export const seedPeople: Person[] = [
  p("p-adam", "Adam Posey", ["g-boys", "g-elsmosh", "g-crooms", "g-greenwood", "g-uf", "g-wef", "g-dbrx"]),
  p("p-alex", "Alex Barrass", ["g-boys", "g-elsmosh", "g-crooms", "g-greenwood", "g-ucf"]),
  p("p-ryan", "Ryan Parker", ["g-boys", "g-cantina", "g-crooms", "g-greenwood", "g-ucf"]),
  p("p-connor", "Connor Munjed", ["g-boys", "g-cantina", "g-crooms", "g-uf"]),
  p("p-jonathan", "Jonathan Porter", ["g-boys", "g-crooms", "g-wef"]),
  p("p-jordan", "Jordan Morillo", ["g-boys", "g-markham", "g-uf"]),
  p("p-thomas", "Thomas Guiterrez", ["g-boys", "g-markham"]),
  p("p-jason", "Jason DeJesus", ["g-boys"]),
  p("p-sofia", "Sofia Brett", ["g-cantina", "g-sanford"]),
  p("p-kyle-f", "Kyle Forburger", ["g-elsmosh", "g-ucf"]),
  p("p-anthony", "Anthony Richards", ["g-cantina", "g-sanford"]),
  p("p-blaze", "Blaze Luna", ["g-elsmosh", "g-ucf"]),
  p("p-david", "David Chara", ["g-elsmosh"]),
  p("p-alec", "Alec Becks", ["g-dbrx", "g-uf"]),
  p("p-ari", "Ari Becks", ["g-dbrx", "g-uf"]),
  p("p-kyle-g", "Kyle Gransee", ["g-dbrx"]),
  p("p-braedan", "Braedan Stewart", ["g-wef"]),
];

export const GROUP_COLORS = palette;
