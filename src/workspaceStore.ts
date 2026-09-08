import type { CirclesApi } from "./electron";
import type { RecentWorkspace, Workspace } from "./types";

function api(): CirclesApi {
  const circles = window.circles;
  if (!circles) {
    throw new Error("Open Circles.exe to create and save workspaces.");
  }
  return circles;
}

export function isDesktopApp(): boolean {
  return Boolean(window.circles);
}

export async function listWorkspaces(): Promise<RecentWorkspace[]> {
  return api().listRecents();
}

export async function createWorkspace() {
  return api().createWorkspace();
}

export async function openWorkspace() {
  return api().openWorkspace();
}

export async function loadWorkspace(filePath: string) {
  return api().loadWorkspace(filePath);
}

export async function saveWorkspace(filePath: string, data: Workspace) {
  return api().saveWorkspace(filePath, data);
}

export async function renameWorkspace(filePath: string, data: Workspace, name: string) {
  return api().saveWorkspace(filePath, { ...data, name });
}

export async function deleteWorkspace(filePath: string) {
  return api().deleteWorkspaceFile(filePath);
}

export async function removeRecent(filePath: string) {
  return api().removeRecent(filePath);
}
