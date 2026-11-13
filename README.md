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

Settled in the planning interviews on 2026-11-11 and 2026-11-12. "Built" means it works today.

| Topic | Decision | Built |
| --- | --- | --- |
| Brief contents | Goal and requirements, a concrete example of "finished", ordered stages with "done when" items, starter files with TODOs, a way to check. Each part can be turned on or off. | Yes. Starter files and tests can each be switched off when you start a project. |
| Picking a project | The AI proposes three from a few questions. Also: bring your own idea, or link a GitHub repo (as an idea list, a tutorial to turn into a brief, or starting code). | AI proposes three. |
| Boilerplate | An AI-written skeleton by default, hand-made templates as a choice. The skeleton runs out of the box: setup is done, and every real feature is left as a TODO. | The AI-written skeleton. Not yet: hand-made templates. |
| Stage check | A checklist you tick, plus runnable tests. The tests are AI-written, live in a file you can add to, and come with a description of what each one looks at. | Yes. You run the tests yourself: the app does not run them or read their results. |
| Commands | The app shows the AI's setup, run and test commands for you to copy. It never runs them. | Yes |
| Help level | A 1 to 5 dial: 1 questions only, 2 concept, 3 pseudocode, 4 small snippet, 5 full code for the stuck part. The ceiling is set per project and every question starts at 1. | No |
| AI provider | The user's own Claude API key. Model `claude-opus-5-5`. | Yes |
| Key storage | Electron `safeStorage`, in the app's settings folder. | Yes |
| Where briefs live | In the project folder: `ASSIGNMENT.md` for the user, and `.project-creator/` for the app (`brief.json`, `starter.json` for the commands and test descriptions, `progress.json` for the ticks). No database. | Yes |
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

Milestones 1 and 2 are built: you can start a new project and get an AI-written assignment brief, starter files
that run, and tests. There is no tutor and no chat yet. `docs/milestone-1.md` and `docs/plan.md` are the two plans
that were followed.

What works:

- **Start a new project.** Enter your Claude API key once, answer four questions, pick one of three proposed
  projects, and choose a folder. The app writes the brief there and opens it.
- **Starter files.** After the brief, the AI writes a small starter that runs as it is, with a TODO for each stage
  and a test file. Two switches on the questions form turn the starter and the tests off. If the starter cannot be
  written, the brief is kept and you can try again. You can also continue without it, and the brief is then written
  once more to fit an empty folder.
- **Guide panel** with the open project's brief: summary, requirements, an example, and the stages, each with its
  reasoning and "done when" items. With a starter it also lists the setup, run and test commands, each with a Copy
  button, and what each test looks at. Every "done when" item is a checkbox, the ticks are saved with the project,
  and the stage to work on is highlighted. Folders without a brief say so. The Tutor tab is a stub.
- **Start screen** with "Open a folder" (Ctrl+O), "Start a new project", and a list of recent folders.
- **File tree** that loads folders as you expand them, with New file and New folder. `.git`, `node_modules`,
  `__pycache__`, `.venv`, `.project-creator`, `.DS_Store` and `Thumbs.db` are hidden.
- **Monaco editor** with tabs, unsaved-change dots, Ctrl+S to save, and syntax highlighting for most languages. Long
  lines wrap to the editor's width. Files over 5 MB and binary files are refused with a clear message.
- **Terminal** in the project folder via node-pty (PowerShell on Windows). Ctrl+` shows or hides it, and hiding keeps
  the shell alive. If node-pty fails to load, it falls back to a basic line-by-line mode.
- **Resizable panels**: drag the dividers, or focus one and use the arrow keys.

Known gaps:

- The three Claude calls are tested against a canned-reply server and, by hand, through a local proxy in front of
  another model. The app has not been run with a real Claude key, so the prompts have not been judged against
  Claude's own replies.
- The app checks where a starter's files go and what its commands look like. It cannot tell whether the starter
  really runs, whether the packages it names exist, or whether it leaves the right things undone. Read the commands
  before you run them.
- Tests are run by hand and the app does not read their results. Ticking a stage off is up to you.
- "Only stage 1's tests are switched on" and "tests look at the project from outside" are asked for in the prompt,
  not enforced.
- A project made with starter files off, or before starter files existed, cannot get them later.
- A request to Claude cannot be cancelled. The ideas and the brief time out after two minutes each, the starter
  after ten, and each is retried once. Leaving the screen while one is running is safe: its reply is ignored.
- The brief's "5 to 10 stages" is asked for in the prompt, not enforced. A brief with any stages at all is accepted.
- Quitting within a second or two of opening a project can hang the app and leave `electron.exe` and
  `powershell.exe` running. It happens while the project's shell is still starting, in terminal code that predates
  Milestone 1. Reproduced in 2 of 15 test runs, cause not pinned down. The end-to-end tests wait for the shell
  before closing (`closeApp` in `e2e/launch.ts`).
- Closing the window doesn't warn about unsaved files.
- No rename or delete in the file tree (use the terminal for now).
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
- **No test calls the real Claude API.** `e2e/fake-anthropic.ts` is a small local server with canned replies, plain
  and streamed, and the app is launched with `ANTHROPIC_BASE_URL` pointing at it. The real SDK code path runs.
- **No test touches your clipboard.** The Copy button's test replaces the clipboard call in the page.

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
    project.ts   Open folder, recent list, file read/write/create (locked to the open folder), create a project from
                 a brief and a starter, saved ticks
    terminal.ts  node-pty sessions, with a child_process fallback
    keyStore.ts  The Claude API key, encrypted with safeStorage
    ai.ts        The three Claude calls (three proposals, one brief, one starter), their prompts and error messages
    brief.ts     Pure functions and runtime shapes for briefs: slugify, briefToMarkdown, zod schemas
    starter.ts   The starter's shape, the checks it must pass before it is written, and its part of ASSIGNMENT.md
    paths.ts     The rules for a path typed by the user or written by the AI
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
docs/          The plans that were followed: milestone-1.md, then plan.md for Milestone 2
```

### Security model

The UI runs sandboxed with context isolation and no Node access. It can only call the functions on `window.api`, and the
main process rejects any file path outside the folder the user opened. Folder links are resolved first, so a link
inside the project that leads elsewhere is rejected too. Terminals are started in that folder.

Files the AI writes are checked in the main process before anything touches the disk (`validateStarter` in
`src/main/starter.ts`). A path is refused if it leaves the project, starts at a drive or network share, uses a name
or character Windows reserves, starts with a dot (except `.gitignore`), is a Windows short name such as `PROJEC~1`,
or collides with another file. There are limits on how many files and how large. A `package.json` is refused if it
has a script that `npm install` would run or is not plain JSON, and so is a `binding.gyp`. A starter that breaks
any rule is refused as a whole, never repaired. Files are created so that nothing is overwritten, and if writing
fails partway the new folder is removed again.

The app never runs a command the AI wrote. Setup, run and test commands are shown for you to copy, and a command
with a line break in it is refused, because pasting it would run the first part at once. That holds for a saved
`starter.json` too, which may arrive with a folder from someone else.

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
the active file, the primary button and the stage you are on. Blue (`--blueprint`) is for focus and selection. Colors and type sizes are
tokens at the top of `src/renderer/src/styles.css`. The Monaco and terminal themes repeat some of them as plain values,
because those libraries take colors from code.

## License

MIT. See `LICENSE`.
