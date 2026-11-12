# Project Creator

A desktop app that helps you start a project and build it yourself. It helps you decide what to build, gives you
boilerplate to start from, lets you write the code, and answers questions without handing you the full solution.

## Why this exists

Asking an AI for project help usually ends with being handed every step. That skips the part that's actually hard:
knowing how and where to start.

Framing a project like a classroom assignment makes it much easier to begin. The app should do that framing for the
user, so they get a clear starting point and then do the work themselves.

## What it should do

1. Help the user decide on a project
2. Give boilerplate to start from
3. Let the user write the code themselves
4. Let them ask questions without being given the full solution

These four are the settled core. Everything else below is marked as either built, undecided, or later.

## Open question (not decided)

One direction being considered: the AI writes the code while the user makes the engineering decisions. On its own that
doesn't feel new (Claude Code and Cursor already work that way), so **this is not committed**. Don't build toward it
until it's decided.

## Ideas discussed, not settled

These came up while planning. They are suggestions, not requirements. Check before building any of them.

- **Hint ladder.** Questions get the smallest useful answer first (nudge, concept, pseudocode, code) and the user asks
  for more only if needed.
- **Milestone plan.** The project is split into 5 to 10 milestones with a clear "done when" for each, showing one at a
  time.
- **Decision points and a decision log.** The user picks between options (SQL or document store, REST or websockets)
  and writes why. Choices are saved and reviewed at the end. This belongs to the open question above.
- **Coding dial.** Per task, choose who writes it: the user, the AI, or the AI with the user reviewing. Also part of
  the open question.
- **Review mode.** The user writes the code and the AI reviews it instead of rewriting it.
- **Milestone checks.** Small tests or a checklist that confirm a milestone is really done.
- **Job posting input.** Paste a posting and get a project that covers those skills.
- **Build log.** Turn the finished project's history into a README and resume bullets.

Note: the Guide panel in the current build has placeholder text that mentions milestones, decisions and the hint
ladder. That text is a mock-up only and should be rewritten once the real design is agreed.

## Later ideas (not now)

- Showing the user what they need to study more
- Interview prep and mock interviews
- Practice modules that scale from small LeetCode-style problems (with solutions available) up to hard tasks where the
  user has to find their way around a real codebase

## Current state

The base shell is built: Electron + React.js + TypeScript with a file tree, Monaco editor and terminal. Nothing
AI-related exists yet. There is no project picker, no boilerplate generation and no chat.

What works:

- **Start screen** with "Open a folder" (Ctrl+O) and a list of recent folders. "Start a new project" is a disabled
  button.
- **File tree** that loads folders as you expand them. `.git`, `node_modules`, `__pycache__` and `.venv` are hidden.
- **Monaco editor** with tabs, unsaved-change dots, Ctrl+S to save, and syntax highlighting for most languages. Files
  over 5 MB and binary files are refused with a clear message.
- **Terminal** in the project folder via node-pty (PowerShell on Windows). Ctrl+` shows or hides it, and hiding keeps
  the shell alive. If node-pty fails to load, it falls back to a basic line-by-line mode.
- **Resizable panels**: drag the dividers, or focus one and use the arrow keys.
- **Guide panel** with placeholder Milestones and Tutor tabs (no real functionality).

Known gaps:

- Closing the window doesn't warn about unsaved files.
- No create, rename or delete in the file tree (use the terminal for now).
- Monaco shows syntax errors only, not type errors, because it can't see the project's `node_modules`.
- The app has been tested on Linux only. It is developed for Windows, where node-pty and PowerShell still need a first
  real run.

## Run it

Needs Node.js 20.19+ or 22.12+.

```powershell
cd C:\Users\Acer\Desktop\Projects\project-creator
npm install
npm run dev
```

`npm run dev` opens the app with hot reload. Edits under `src/renderer` update the window; edits under `src/main`
restart the app.

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs the app in development with hot reload |
| `npm run build` | Production build into `out/` |
| `npm start` | Runs the production build |
| `npm run typecheck` | Type-checks the main process and the UI |

## Tech stack

| Piece | Choice | Why |
| --- | --- | --- |
| Shell | Electron 44 + electron-vite 5 | Solid terminal support through node-pty |
| UI | React.js 19 + TypeScript 5.9 (strict) | Familiar stack, fast to iterate |
| Editor | monaco-editor 0.55 | The VS Code editor, so there's no editor to build |
| Terminal | @xterm/xterm 5.5 + node-pty 1.1 | node-pty 1.1 ships prebuilt Windows binaries |

Not chosen yet: where projects and progress are stored (SQLite was suggested) and which AI provider to use (the Claude
API was suggested, with the key kept in the main process).

## How it's put together

```
src/
  main/        Electron main process (Node). Owns the file system and terminals.
    index.ts     Window setup and security settings
    project.ts   Open folder, recent list, file read/write (locked to the open folder)
    terminal.ts  node-pty sessions, with a child_process fallback
  preload/     The bridge. Exposes a small typed window.api and nothing else.
  shared/      Types used on both sides of the bridge (types.ts)
  renderer/    The React.js UI
    src/App.tsx            Layout, open files, keyboard shortcuts
    src/components/        FileTree, TabBar, EditorPane, TerminalPane, SidePanel, Welcome, StatusBar, Splitter, Icons
    src/lib/monaco.ts      Monaco setup, workers bundled locally, editor theme
    src/lib/models.ts      One Monaco model per open file, tracks saved vs. unsaved
    src/lib/paths.ts       Path helpers that handle Windows and POSIX separators
    src/styles.css         Design tokens and all styles
```

### Security model

The UI runs sandboxed with context isolation and no Node access. It can only call the functions on `window.api`, and the
main process rejects any file path outside the folder the user opened. Terminals also only start inside that folder.

A feature that needs the system (files, network, API keys, storage) is added in this order:

1. Implement it in `src/main/`
2. Add the type to `ProjectCreatorApi` in `src/shared/types.ts`
3. Expose it in `src/preload/index.ts`
4. Call it from the UI through `window.api`

## Design

Dark theme with slate-blue surfaces. One yellow accent (`--pencil`) is reserved for "current" things: the active tab,
the active file and the primary button. Blue (`--blueprint`) is for focus and selection. All colors and type sizes are
tokens at the top of `src/renderer/src/styles.css`.
