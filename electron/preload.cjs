const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("circles", {
  createWorkspace: () => ipcRenderer.invoke("workspace:create"),
  openWorkspace: () => ipcRenderer.invoke("workspace:open"),
  loadWorkspace: (filePath) => ipcRenderer.invoke("workspace:load", filePath),
  saveWorkspace: (filePath, data) => ipcRenderer.invoke("workspace:save", filePath, data),
  deleteWorkspaceFile: (filePath) => ipcRenderer.invoke("workspace:delete", filePath),
  listRecents: () => ipcRenderer.invoke("recents:list"),
  removeRecent: (filePath) => ipcRenderer.invoke("recents:remove", filePath),
});
