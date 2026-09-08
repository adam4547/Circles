import type { RecentWorkspace, Workspace } from "./types";

type Canceled = { canceled: true };

type Opened = {
  canceled: false;
  filePath: string;
  workspace: Workspace;
};

export type CirclesApi = {
  createWorkspace: () => Promise<Canceled | Opened>;
  openWorkspace: () => Promise<Canceled | Opened>;
  loadWorkspace: (filePath: string) => Promise<{ filePath: string; workspace: Workspace }>;
  saveWorkspace: (
    filePath: string,
    data: Workspace,
  ) => Promise<{ workspace: Workspace }>;
  deleteWorkspaceFile: (filePath: string) => Promise<{ recents: RecentWorkspace[] }>;
  listRecents: () => Promise<RecentWorkspace[]>;
  removeRecent: (filePath: string) => Promise<RecentWorkspace[]>;
};

declare global {
  interface Window {
    circles?: CirclesApi;
  }
}

export {};
