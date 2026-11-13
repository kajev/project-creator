# Project Creator

Desktop app (Electron + React.js + TypeScript) that helps people start a project and build it themselves.
README.md has the purpose, what is settled versus undecided, and the code layout. Read it before planning anything.

## Commands

- `npm run dev`: run the app with hot reload. Only the UI reloads: after an edit under `src/main` or `src/preload`,
  close the app and start it again.
- `npm run typecheck`: type-check the main process and the UI. Run it after any series of code changes.
- `npm run build`: production build into `out/`
- `npm test`: unit tests (Vitest). Test files sit next to the code as `*.test.ts`.
- `npm run test:e2e`: builds, then runs the end-to-end tests in `e2e/` (Playwright driving the real app). A window
  opens for each test. Screenshots go to `test-results/screens/`.

## Rules

- The developer is on Windows (PowerShell), Node 25. `electron.exe` is a GUI program, so PowerShell does not wait
  for it: use `Start-Process -Wait` when a script needs its exit code.
- Product scope: the four core features and the README's "Decided" table are settled. Anything under "Open question"
  or "Ideas discussed, not settled" needs the developer's OK before it gets built.
- The UI (renderer) is sandboxed and has no Node access. Anything that needs files, network, API keys or storage is
  implemented in `src/main`, typed in `src/shared/types.ts`, exposed in `src/preload/index.ts`, and called through
  `window.api`.
- The Claude API key is typed in the UI once and sent to the main process. Nothing may send it back to the renderer,
  and all Claude calls are made in `src/main`.
- Tests never call the real Claude API. End-to-end tests point `ANTHROPIC_BASE_URL` at `e2e/fake-anthropic.ts`.
  Tests never touch the real clipboard either.
- File access stays locked to the open project folder (`insideRoot` in `src/main/project.ts`, which also resolves
  folder links).
- Files the AI writes pass `validateStarter` in `src/main/starter.ts` before anything touches the disk. A starter
  that breaks a rule is refused as a whole, never repaired.
- The app never runs a command the AI wrote. Commands are shown for the user to copy.
- Every prompt also carries its reply's JSON Schema as text, because a stand-in server may ignore the reply format.
- A field added to a file the app stores in a project is optional when read, so older projects still open.
- Monaco 0.55 keeps its TypeScript settings at `monaco.typescript`, not `monaco.languages.typescript`.
- Styles use the tokens at the top of `src/renderer/src/styles.css`. `--pencil` is reserved for "current" items.
- Keep changes small. No features, abstractions or config beyond what was asked for.
- Keep explanations short: the one-sentence point first, then two or three lines. No em dashes.
