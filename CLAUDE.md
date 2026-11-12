# Project Creator

Desktop app (Electron + React.js + TypeScript) that helps people start a project and build it themselves.
README.md has the purpose, what is settled versus undecided, and the code layout. Read it before planning anything.

## Commands

- `npm run dev`: run the app with hot reload
- `npm run typecheck`: type-check the main process and the UI. Run it after any series of code changes.
- `npm run build`: production build into `out/`

There are no tests yet.

## Rules

- The developer is on Windows (PowerShell). The base build was only ever run on Linux.
- Product scope: only the four core features in the README are settled. Anything under "Open question" or
  "Ideas discussed, not settled" needs the developer's OK before it gets built.
- The UI (renderer) is sandboxed and has no Node access. Anything that needs files, network, API keys or storage is
  implemented in `src/main`, typed in `src/shared/types.ts`, exposed in `src/preload/index.ts`, and called through
  `window.api`. API keys never reach the renderer.
- File access stays locked to the open project folder (`insideRoot` in `src/main/project.ts`).
- Monaco 0.55 keeps its TypeScript settings at `monaco.typescript`, not `monaco.languages.typescript`.
- Styles use the tokens at the top of `src/renderer/src/styles.css`. `--pencil` is reserved for "current" items.
- Keep changes small. No features, abstractions or config beyond what was asked for.
- Keep explanations short: the one-sentence point first, then two or three lines. No em dashes.
