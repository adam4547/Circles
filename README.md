# Circles

Circles shows how friend groups overlap. Each group is a colored circle. Each person is a dot. People who belong to the same mix of groups sit together in the overlap, and lines between people get thicker and brighter the more groups they share.

It is a **desktop app**. There is no website, no login, and no server.

## Run it (no setup)

1. Get `Circles.exe` from a [GitHub Release](../../releases) for this project, or from whoever built the app for you.
2. Double-click **Circles.exe**.
3. A window opens with the circle canvas on the left and the Groups / People panel on the right.

You do not need Node.js, a browser, or an internet connection. The file is portable: it does not install anything on your computer.

Windows may show a SmartScreen prompt the first time because the file is not a signed store app. Choose **More info**, then **Run anyway**.

## How to use it

- **Move a group:** drag inside a colored circle.
- **Resize a group:** drag the small handle on the lower-right rim of a circle.
- **See how connected someone is:** click a person on the canvas or in the side panel. Their shared-group lines stay bright; others fade.
- **Add a group:** type a name, pick a color, click **Add**.
- **Add a person:** type a name, click **Add**. New people start with no groups and appear in the upper-left until you assign groups.
- **Edit names or colors:** use the fields in the side panel.
- **Change membership:** click a group chip under a person. A filled chip means they belong to that group.
- **Delete:** use **Delete** on a group or person. Deleting a group also removes it from everyone’s memberships.

Nothing is saved to a server. If you close the app, you get the built-in starter people and groups again next time.

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
