const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs/promises");
const path = require("path");

const FILE_FILTERS = [{ name: "Circles workspace", extensions: ["circles.json", "json"] }];

function recentsPath() {
  return path.join(app.getPath("userData"), "recent-workspaces.json");
}

function nameFromPath(filePath) {
  return path
    .basename(filePath)
    .replace(/\.circles\.json$/i, "")
    .replace(/\.json$/i, "");
}

function emptyWorkspace(name) {
  return {
    version: 1,
    id: crypto.randomUUID(),
    name,
    updatedAt: new Date().toISOString(),
    groups: [],
    people: [],
    view: { x: 0, y: 0, k: 1 },
  };
}

function isWorkspace(data) {
  return Boolean(
    data &&
      typeof data === "object" &&
      Array.isArray(data.groups) &&
      Array.isArray(data.people) &&
      data.view &&
      typeof data.view.k === "number",
  );
}

async function readRecents() {
  try {
    const raw = await fs.readFile(recentsPath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRecents(entries) {
  await fs.mkdir(path.dirname(recentsPath()), { recursive: true });
  await fs.writeFile(recentsPath(), JSON.stringify(entries, null, 2), "utf8");
}

async function rememberRecent(filePath, workspace) {
  const entries = await readRecents();
  const next = [
    {
      filePath,
      id: workspace.id,
      name: workspace.name || nameFromPath(filePath),
      updatedAt: workspace.updatedAt,
      groupCount: workspace.groups.length,
      personCount: workspace.people.length,
    },
    ...entries.filter((entry) => entry.filePath !== filePath),
  ].slice(0, 20);
  await writeRecents(next);
  return next;
}

async function loadFromDisk(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!isWorkspace(data)) {
    throw new Error("That file is not a Circles workspace.");
  }
  if (!data.name) data.name = nameFromPath(filePath);
  if (!data.id) data.id = crypto.randomUUID();
  if (!data.version) data.version = 1;
  return data;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0e1218",
    autoHideMenuBar: true,
    title: "Circles",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

ipcMain.handle("workspace:create", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, {
    title: "Save workspace",
    defaultPath: path.join(app.getPath("documents"), "Untitled.circles.json"),
    filters: FILE_FILTERS,
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  let filePath = result.filePath;
  if (!/\.json$/i.test(filePath)) filePath = `${filePath}.circles.json`;

  const workspace = emptyWorkspace(nameFromPath(filePath));
  await fs.writeFile(filePath, JSON.stringify(workspace, null, 2), "utf8");
  await rememberRecent(filePath, workspace);
  return { canceled: false, filePath, workspace };
});

ipcMain.handle("workspace:open", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: "Open workspace",
    defaultPath: app.getPath("documents"),
    filters: FILE_FILTERS,
    properties: ["openFile"],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const filePath = result.filePaths[0];
  const workspace = await loadFromDisk(filePath);
  await rememberRecent(filePath, workspace);
  return { canceled: false, filePath, workspace };
});

ipcMain.handle("workspace:load", async (_event, filePath) => {
  const workspace = await loadFromDisk(filePath);
  await rememberRecent(filePath, workspace);
  return { filePath, workspace };
});

ipcMain.handle("workspace:save", async (_event, filePath, data) => {
  const workspace = {
    ...data,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(filePath, JSON.stringify(workspace, null, 2), "utf8");
  await rememberRecent(filePath, workspace);
  return { workspace };
});

ipcMain.handle("workspace:delete", async (_event, filePath) => {
  await fs.unlink(filePath);
  const entries = (await readRecents()).filter((entry) => entry.filePath !== filePath);
  await writeRecents(entries);
  return { recents: entries };
});

ipcMain.handle("recents:list", async () => {
  const entries = await readRecents();
  const existing = [];
  for (const entry of entries) {
    try {
      await fs.access(entry.filePath);
      existing.push(entry);
    } catch {
      // skip missing files
    }
  }
  if (existing.length !== entries.length) await writeRecents(existing);
  return existing;
});

ipcMain.handle("recents:remove", async (_event, filePath) => {
  const entries = (await readRecents()).filter((entry) => entry.filePath !== filePath);
  await writeRecents(entries);
  return entries;
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
