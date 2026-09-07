# Circles

Circles is a small desktop web app that shows how friend groups overlap. Each group is a colored circle. Each person is a dot. People who belong to the same mix of groups sit together in the overlap, and lines between people get thicker and brighter the more groups they share.

You run it on your own computer in a browser. There is no login and no server to set up.

## What you need first

1. A computer (Windows, macOS, or Linux).
2. A web browser such as Chrome, Edge, Firefox, or Safari.
3. **Node.js**, which includes `npm` (the tool that installs this project’s libraries).

If you are not sure whether Node.js is installed:

- **Windows:** open Command Prompt or PowerShell.
- **macOS:** open Terminal.
- **Linux:** open a terminal.

Then type:

```bash
node -v
npm -v
```

You should see version numbers, for example `v22.11.0` and `10.9.0`. This project works with **Node.js 20 or newer**.

If those commands fail, install Node.js from [https://nodejs.org](https://nodejs.org). Choose the LTS (recommended) installer, run it, then **close and reopen** your terminal so `node` and `npm` are available.

## Get the code onto your computer

### Option A — Download a ZIP from GitHub (no Git required)

1. Open the GitHub page for this repository.
2. Click the green **Code** button, then **Download ZIP**.
3. Unzip the file somewhere easy to find, such as your Documents folder.
4. Remember the unzipped folder name (it is often `Circles-main` if the branch is `main`).

### Option B — Clone with Git

If Git is installed:

```bash
git clone https://github.com/YOUR_USERNAME/Circles.git
```

Replace `YOUR_USERNAME/Circles.git` with the real repository URL from GitHub’s **Code** button.

## Open a terminal in the project folder

You must run commands **inside** the folder that contains `package.json`.

**Windows (File Explorer):** open the unzipped project folder, click the address bar, type `powershell`, and press Enter.

**Windows (Command Prompt):**

```bat
cd path\to\the\unzipped\folder
```

**macOS / Linux:**

```bash
cd path/to/the/unzipped/folder
```

Example after a typical ZIP download on Windows:

```powershell
cd $env:USERPROFILE\Downloads\Circles-main
```

Check that you are in the right place:

```bash
ls
```

On Windows Command Prompt use `dir` instead of `ls`. You should see `package.json`, `index.html`, and a `src` folder.

## Install dependencies (one-time)

This downloads the libraries the app needs (React, Vite, D3, and so on) into a local `node_modules` folder. It can take a minute.

```bash
npm install
```

Wait until it finishes with no errors. You only need to do this again if dependencies change.

## Run the app

```bash
npm run dev
```

Leave that terminal window open. Vite will print something like:

```
  ➜  Local:   http://localhost:5173/
```

1. Open your browser.
2. Go to **http://localhost:5173/** (or the URL printed in the terminal).
3. You should see the circle canvas on the left and the Groups / People panel on the right.

To stop the app, go back to the terminal and press `Ctrl+C`.

If the browser says the site cannot be reached, make sure `npm run dev` is still running and that you used the URL from the terminal.

## How to use it

- **Move a group:** drag inside a colored circle.
- **Resize a group:** drag the small handle on the lower-right rim of a circle.
- **See how connected someone is:** click a person on the canvas or in the side panel. Their shared-group lines stay bright; others fade.
- **Add a group:** type a name, pick a color, click **Add**.
- **Add a person:** type a name, click **Add**. New people start with no groups and appear in the upper-left until you assign groups.
- **Edit names or colors:** use the fields in the side panel.
- **Change membership:** click a group chip under a person. A filled chip means they belong to that group.
- **Delete:** use **Delete** on a group or person. Deleting a group also removes it from everyone’s memberships.

Nothing is saved to a server. If you refresh the page, you get the built-in starter people and groups again.

## Optional: production build

Use this if you want a static copy of the site instead of the live development server.

```bash
npm run build
npm run preview
```

`npm run build` creates a `dist` folder. `npm run preview` serves that folder locally and prints a URL to open in your browser.

## Common problems

| Problem | What to try |
| --- | --- |
| `'node' is not recognized` or `command not found: npm` | Install Node.js LTS, then close and reopen the terminal. |
| `npm: command not found` after installing Node | Restart the computer, or use the terminal that the Node installer opened. |
| `ENOENT` / cannot find `package.json` | `cd` into the folder that contains `package.json` before `npm install`. |
| Port 5173 already in use | Vite will pick another port and print it. Use that URL instead. |
| Blank page or old page after pulling new code | Stop the server (`Ctrl+C`), run `npm install` again, then `npm run dev`. |
| `npm install` fails on a network error | Check internet access, then run `npm install` again. |

## Requirements (for reference)

- Node.js 20+
- npm (bundled with Node.js)
- A modern desktop browser
