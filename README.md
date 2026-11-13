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

These four are the settled core. Everything else below is marked as decided, undecided, or later.

## Decided

Settled in the planning interview on 2026-11-11. "Built" means it works today.

| Topic | Decision | Built |
| --- | --- | --- |
| Brief contents | Goal and requirements, a concrete example of "finished", ordered stages with "done when" items, starter files with TODOs, a way to check. Each part can be turned on or off. | Goal, requirements, example and stages. Not yet: starter files, checks, toggles. |
| Picking a project | The AI proposes three from a few questions. Also: bring your own idea, or link a GitHub repo (as an idea list, a tutorial to turn into a brief, or starting code). | AI proposes three. |
| Boilerplate | An AI-written skeleton by default, hand-made templates as a choice. | No |
| Stage check | A checklist you tick, plus runnable tests. | Checklist text only. No ticking, no tests. |
| Help level | A 1 to 5 dial: 1 questions only, 2 concept, 3 pseudocode, 4 small snippet, 5 full code for the stuck part. The ceiling is set per project and every question starts at 1. | No |
| AI provider | The user's own Claude API key. Model `claude-opus-5-5`. | Yes |
| Key storage | Electron `safeStorage`, in the app's settings folder. | Yes |
| Where briefs live | In the project folder: `ASSIGNMENT.md` for the user, `.project-creator/brief.json` for the app. No database. | Yes |
| Languages | Any. The AI picks unless the user names one. | Yes |
| Project size | The user says how many hours they have each time. | Yes |
| Tutor context | The app is the editor, so the tutor reads the open file, recent changes and terminal output. No screen capture. | No |

Why the help dial starts low: in two randomized studies, unrestricted AI raised task scores but not learning, and in
one it lowered unaided exam scores. Hint-only tutors matched having no AI and never beat it. Links are in
`docs/milestone-1.md`.

## Open question (not decided)

One direction being considered: the AI writes the code while the user makes the engineering decisions. On its own that
doesn't feel new (Claude Code and Cursor already work that way), so **this is not committed**. Don't build toward it
until it's decided.

## Ideas discussed, not settled

These are suggestions, not requirements. Check before building any of them.

- **Decision points and a decision log.** The user picks between options (SQL or document store, REST or websockets)
  and writes why. Choices are saved and reviewed at the end. This belongs to the open question above.
- **Coding dial.** Per task, choose who writes it: the user, the AI, or the AI with the user reviewing. Also part of
  the open question.
- **Review mode.** The user writes the code and the AI reviews it instead of rewriting it.
- **Job posting input.** Paste a posting and get a project that covers those skills.
- **Build log.** Turn the finished project's history into a README and resume bullets.
- **Watching another editor.** Helping while the user works in a different editor. Parked, because the app is an
  editor itself.

## Later ideas (not now)

- Showing the user what they need to study more
- Interview prep and mock interviews
- Practice modules that scale from small LeetCode-style problems (with solutions available) up to hard tasks where the
  user has to find their way around a real codebase

## Current state

Milestone 1 is built: you can start a new project and get an AI-written assignment brief. There is no skeleton
generation, no tutor and no chat yet. `docs/milestone-1.md` has the plan that was followed. `docs/plan.md` has the
plan for Milestone 2.

What works:

- **Start a new project.** Enter your Claude API key once, answer four questions, pick one of three proposed
  projects, and choose a folder. The app writes the brief there and opens it.
- **Guide panel** with the open project's brief: summary, requirements, an example, and the stages, each with its
  reasoning and "done when" items. Folders without a brief say so. The Tutor tab is a stub.
- **Start screen** with "Open a folder" (Ctrl+O), "Start a new project", and a list of recent folders.
- **File tree** that loads folders as you expand them. `.git`, `node_modules`, `__pycache__`, `.venv`,
  `.project-creator`, `.DS_Store` and `Thumbs.db` are hidden.
- **Monaco editor** with tabs, unsaved-change dots, Ctrl+S to save, and syntax highlighting for most languages. Long
  lines wrap to the editor's width. Files over 5 MB and binary files are refused with a clear message.
- **Terminal** in the project folder via node-pty (PowerShell on Windows). Ctrl+` shows or hides it, and hiding keeps
  the shell alive. If node-pty fails to load, it falls back to a basic line-by-line mode.
- **Resizable panels**: drag the dividers, or focus one and use the arrow keys.

Known gaps:

- The two Claude calls are only tested against a canned-reply server. The prompts have not been judged against real
  replies yet.
- A request to Claude cannot be cancelled. Each attempt times out after two minutes and is retried once. Leaving the
  screen while one is running is safe: its reply is ignored.
- The brief's "5 to 10 stages" is asked for in the prompt, not enforced. A brief with any stages at all is accepted.
- Quitting within a second or two of opening a project can hang the app and leave `electron.exe` and
  `powershell.exe` running. It happens while the project's shell is still starting, in terminal code that predates
  Milestone 1. Reproduced in 2 of 15 test runs, cause not pinned down. The end-to-end tests wait for the shell
  before closing (`closeApp` in `e2e/launch.ts`).
- Closing the window doesn't warn about unsaved files.
- No create, rename or delete in the file tree (use the terminal for now).
- Monaco shows syntax errors only, not type errors, because it can't see the project's `node_modules`.
- `npm run dev` logs two errors on every start: an xterm `TypeError` reading `dimensions`, and
  `Error: AttachConsole failed` from node-pty. The app keeps working. The likely cause is React StrictMode mounting
  the terminal twice in development. Not confirmed, not fixed.
- `npm audit` reports dompurify (high) through monaco-editor 0.55.1. The fix is monaco-editor 0.57, a breaking
  upgrade.

## Run it

Needs Node.js 22.12 or later. Node 24 LTS is the safe choice: the project is developed on Node 25, which Vitest 5 and
Playwright do not list as supported, so Vitest is pinned to version 4.

```powershell
cd project-creator
npm install
npm run dev
```

`npm run dev` opens the app with hot reload. Edits under `src/renderer` update the window; edits under `src/main` or
`src/preload` need the app closed and started again. Electron downloads its own binary the first time it runs, not
during `npm install`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs the app in development with hot reload |
| `npm run build` | Production build into `out/` |
| `npm start` | Runs the production build |
| `npm run typecheck` | Type-checks the main process and the UI |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Builds, then runs the end-to-end tests (Playwright driving the real app) |

## Tests

- **Unit tests** cover pure functions. They sit next to the code as `*.test.ts`.
- **End-to-end tests** in `e2e/` launch the production build with Playwright's `_electron` API. Each launch gets a
  temporary settings folder (`--user-data-dir`), so tests never touch your real key or recent list. A window opens
  for each test. Screenshots go to `test-results/screens/`.
- **No test calls the real Claude API.** `e2e/fake-anthropic.ts` is a small local server with canned replies, and the
  app is launched with `ANTHROPIC_BASE_URL` pointing at it. The real SDK code path runs.

## Tech stack

| Piece | Choice | Why |
| --- | --- | --- |
| Shell | Electron 44 + electron-vite 5 | Solid terminal support through node-pty |
| UI | React.js 19 + TypeScript 5.9 (strict) | Familiar stack, fast to iterate |
| Editor | monaco-editor 0.55 | The VS Code editor, so there's no editor to build |
| Terminal | @xterm/xterm 5.5 + node-pty 1.1 | node-pty 1.1 ships prebuilt Windows binaries |
| AI | @anthropic-ai/sdk 1.8 + zod 4 | Replies come back as typed, checked JSON |
| Storage | Plain files | The brief travels with the project folder. Nothing to install or migrate |
| Tests | Vitest 4 + @playwright/test | Fast unit tests, and end-to-end tests against the real app |

## How it's put together

```
src/
  main/        Electron main process (Node). Owns the file system, terminals, the API key and Claude calls.
    index.ts     Window setup and security settings
    project.ts   Open folder, recent list, file read/write (locked to the open folder), create a project from a brief
    terminal.ts  node-pty sessions, with a child_process fallback
    keyStore.ts  The Claude API key, encrypted with safeStorage
    ai.ts        The two Claude calls (three proposals, one brief), their prompts and error messages
    brief.ts     Pure functions and runtime shapes for briefs: slugify, briefToMarkdown, zod schemas
  preload/     The bridge. Exposes a small typed window.api and nothing else.
  shared/      Types used on both sides of the bridge (types.ts)
  renderer/    The React.js UI
    src/App.tsx            Layout, open files, keyboard shortcuts
    src/components/        Welcome, NewProject, FileTree, TabBar, EditorPane, TerminalPane, SidePanel, StatusBar,
                           Splitter, Icons
    src/lib/monaco.ts      Monaco setup, workers bundled locally, editor theme
    src/lib/models.ts      One Monaco model per open file, tracks saved vs. unsaved
    src/lib/paths.ts       Path helpers that handle Windows and POSIX separators
    src/styles.css         Design tokens and all styles
e2e/           End-to-end tests, the launch helper and the canned-reply server
docs/          plan.md is the plan for the next milestone. milestone-1.md is the plan that was built.
```

### Security model

The UI runs sandboxed with context isolation and no Node access. It can only call the functions on `window.api`, and the
main process rejects any file path outside the folder the user opened. Terminals are started in that folder.

The Claude API key is typed into the app once. It goes from the UI to the main process, is encrypted by the operating
system (DPAPI on Windows) and saved in the app's settings folder. Nothing sends it back to the UI, and all requests
to Claude are made from the main process. A key that Claude rejects is deleted so the app can ask for a new one.

The SDK honours the `ANTHROPIC_BASE_URL` environment variable, which is how the tests redirect it. If that variable is
set in the environment the app is started from, requests and the key go to that address instead of Anthropic's.

A feature that needs the system (files, network, API keys, storage) is added in this order:

1. Implement it in `src/main/`
2. Add the type to `ProjectCreatorApi` in `src/shared/types.ts`
3. Expose it in `src/preload/index.ts`
4. Call it from the UI through `window.api`

## Design

Dark theme with slate-blue surfaces. One yellow accent (`--pencil`) is reserved for "current" things: the active tab,
the active file and the primary button. Blue (`--blueprint`) is for focus and selection. Colors and type sizes are
tokens at the top of `src/renderer/src/styles.css`. The Monaco and terminal themes repeat some of them as plain values,
because those libraries take colors from code.

## License

MIT. See `LICENSE`.
