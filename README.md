# Circles

Circles shows how friend groups overlap. Each group is a colored region. Each person is a dot. People who belong to the same mix of groups sit together in one cluster, and lines between people get thicker and brighter the more groups they share.

It is a **desktop app**. There is no website, no login, and no server.

## Run it (no setup)

1. Get `Circles.exe` from a [GitHub Release](../../releases) for this project, or from whoever built the app for you.
2. Double-click **Circles.exe**.
3. You start on a blank home screen. Choose **New workspace** or **Open file**.

You do not need Node.js, a browser, or an internet connection. The file is portable: it does not install anything on your computer.

Windows may show a SmartScreen prompt the first time because the file is not a signed store app. Choose **More info**, then **Run anyway**.

## How to use it

- **New workspace:** pick a folder and file name in the save dialog. That file is your workspace. The canvas starts empty.
- **Open file:** choose an existing `.circles.json` (or `.json`) workspace.
- **Recent:** reopen a workspace you used before. Hide removes it from the list; Delete file removes it from disk.
- **Clusters:** people with exactly the same set of groups share one cluster and are packed on fixed-spacing rings so names never overlap. Each group's shaded region wraps the clusters that belong to it.
- **Move a group:** drag inside a group's shaded region to nudge it and see how the clusters follow. Nudges are saved, but the next Auto-adjust replaces them.
- **Auto-adjust:** re-places every group from who belongs to it. Groups that share members pull together (a group entirely inside another nests against it); unrelated groups spread apart. This overwrites any dragged positions.
- **Look around:** scroll to zoom, drag empty space to pan, or use **+ / − / 100% / Fit**.
- **Normalize:** toggles how ties are weighted. Off, a line's weight is the raw number of shared groups. On, it is shared ÷ combined groups (Jaccard), so sharing a small group chat counts for more than sharing a large school. Affects line thickness, count badges (shown as a percentage), and "Closest to".
- **See how connected someone is:** click a person on the canvas or in the side panel. Their shared-group lines stay bright; others fade.
- **Load example data:** on an empty workspace, the side panel offers a sample set of groups and people to explore.
- **Add a group:** type a name, pick a color, click **Add**.
- **Add a person:** type a name, click **Add**. New people start with no groups and appear in the upper-left until you assign groups.
- **Edit names or colors:** use the fields in the side panel.
- **Change membership:** click a group chip under a person. A filled chip means they belong to that group.
- **Delete:** use **Delete** on a group or person. Deleting a group also removes it from everyone’s memberships.

Edits save automatically to the file you chose. Closing the app does not lose that file.

## Build the executable (developers)

Only needed if you are producing `Circles.exe` from the source code.

1. Install [Node.js LTS](https://nodejs.org) (20 or newer).
2. In this folder:

```bash
npm install
npm run dist
```

The portable app is written to `release/Circles.exe`. Give that file to anyone who wants to run Circles.

To try the desktop window without packaging:

```bash
npm run dev
```
