# Plan: Milestone 1, Start a new project

Status: approved as written on 2026-11-11. Node stays on 25.8.1 for now, so the build uses `vitest@^4`.

## What this milestone delivers

Clicking "Start a new project" takes the user from the Welcome screen to an open project folder that holds an
AI-written assignment brief.

The flow: enter a Claude API key once, answer four short questions, get three project proposals, pick one, choose
where the folder goes. The app creates the folder, writes the brief into it, opens it, and shows the brief in the
Guide panel.

## Why this comes first

1. It is the problem the app exists for. The README's "why" is not knowing how or where to start, and this is core
   feature 1.
2. Everything later consumes its output. The skeleton is generated from the chosen brief, and the tutor needs the
   brief to know what "the full solution" is.
3. It builds the plumbing every AI feature needs (key storage, a Claude call in the main process, the IPC path,
   tests) in its smallest form: two request and response calls, no streaming, no chat history.

## Decisions approved with this plan

1. **Storage.** The brief is saved as two files inside the project folder: `ASSIGNMENT.md` for the user and
   `.project-creator/brief.json` for the app. No database. The README lists storage as not chosen, with SQLite
   suggested.
2. **New dependencies.** Runtime, main process only: `@anthropic-ai/sdk` (1.8.0) and `zod` (4.x). Dev only: `vitest`
   and `@playwright/test`.
3. **How the key gets in.** The user types the key into a field in the app once. It goes UI to main, is encrypted
   with `safeStorage`, and nothing ever sends it back. CLAUDE.md says keys never reach the renderer, so this is the
   one exception. Stricter alternative: a "use the key on my clipboard" button, read in main, so the key never
   enters the UI at all.
4. **Model.** `claude-opus-5-5`, the SDK's recommended default. Say so if you want a cheaper one.
5. **Node version.** You are on Node 25.8.1. Vitest 5 and Playwright do not list Node 25 as supported. Recommended:
   switch to Node 24 LTS. If you stay on 25, the plan uses `vitest@^4`, and step 2's check tells us whether
   Playwright runs.

## Decisions from the interview

| Topic | Your decision | Where it lands |
| --- | --- | --- |
| Brief contents | Goal and requirements, ordered stages, starter files with TODOs, a way to check. Each part can be turned on or off. | Now: goal, requirements, example, stages with "done when" lists. Later: starter files, tests, toggles. |
| Picking a project | AI proposes three. Also: bring your own idea, or link a GitHub repo (as an idea list, a tutorial to turn into a brief, or starting code). | Now: AI proposes three. Later: the rest. |
| Boilerplate | AI-written skeleton by default, hand-made templates as a choice. | Next milestone. |
| Stage check | A checklist you tick, plus runnable tests. | Now: checklist text only. Later: ticking and tests. |
| Help level | A 1 to 5 dial (1 questions only, 2 concept, 3 pseudocode, 4 small snippet, 5 full code for the stuck part). The ceiling is set per project and each question starts at 1. | Tutor milestone. |
| AI provider | The user's own Claude API key. | Now. |
| Key storage | Electron `safeStorage`. | Now. |
| Languages | Any. The AI decides unless the user names one. | Now. |
| Project size | Ask for available hours each time. | Now. |
| Tutor context | The app is the editor, so the tutor reads the open file, recent changes and terminal output. No screen capture. | Tutor milestone. |

## What the research changed

- **Brief format.** Frontend Mentor, Codecrafters and roadmap.sh all use a short brief (about 150 to 600 words) with
  a concrete target: a mock-up or example commands. So the brief gets an `example` field and stays short.
  Codecrafters writes each stage's check as observable behaviour, so "done when" items are written that way too.
  Sources: [Frontend Mentor](https://www.frontendmentor.io/challenges/todo-app-Su1_KokOW),
  [Codecrafters](https://docs.codecrafters.io/challenges/how-challenges-work),
  [roadmap.sh](https://roadmap.sh/projects/task-tracker).
- **Hints versus answers.** Not built in this milestone, recorded for the tutor. In two randomized studies,
  unrestricted AI raised task scores but not learning, and in one it lowered unaided exam scores by 17%. Hint-only
  tutors matched having no AI on unaided tests and never beat it. Pseudocode and snippet levels are untested.
  Sources: [Bassner et al. 2026](https://www.edtech.tum.de/?p=3520),
  [Bastani et al. 2025](https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education),
  [Shen and Tamkin 2026](https://arxiv.org/html/2601.20245).
- **Testing.** Playwright's `_electron` API (still experimental) launches the built app with `args: ['.']`. Only
  `@playwright/test` is needed, with no browser download. Use 1.64.1 or later. A temp `--user-data-dir` keeps tests
  away from real settings, and native dialogs are stubbed with `electronApp.evaluate`. Vitest needs its own
  `vitest.config.ts` with the path aliases repeated. Sources:
  [Playwright Electron API](https://playwright.dev/docs/api/class-electron),
  [Electron automated testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing),
  [Vitest config](https://vitest.dev/config/).

## The brief

```ts
interface ProposalInput {
  interests: string // free text: what the user wants to build or learn
  level: 'new' | 'some' | 'comfortable'
  language: string // empty means the AI picks
  hours: number
}

interface Proposal {
  title: string
  pitch: string // one or two sentences
  stack: string // language and main tools
  estimatedHours: number
  skills: string[] // what the user will practise
}

interface Brief {
  title: string
  summary: string // what you are building and why, one short paragraph
  stack: string
  estimatedHours: number
  requirements: string[] // what the finished thing must do, never how
  example: string // a concrete picture of "finished": sample commands and output, or a described screen
  stages: { title: string; goal: string; doneWhen: string[] }[] // 5 to 10, in order
}
```

The prompts tell the model to say what and "done when", never how, and to put no code in the brief.

## Files that change

| File | Change |
| --- | --- |
| `package.json`, `package-lock.json` | New dependencies and the `test`, `test:e2e` scripts |
| `.gitignore` | `test-results/`, `playwright-report/` |
| `vitest.config.ts` | New. Node environment, `@shared` and `@renderer` aliases, `src/**/*.test.ts` only |
| `playwright.config.ts` | New. `testDir: 'e2e'`, one worker |
| `src/shared/types.ts` | `ProposalInput`, `Proposal`, `Brief`, and the new `ai` and `project` API methods |
| `src/main/brief.ts` | New. Pure functions: `slugify`, `briefToMarkdown` |
| `src/main/keyStore.ts` | New. Key encrypted with `safeStorage`, kept in the app's userData folder |
| `src/main/ai.ts` | New. The two Claude calls, error messages, IPC handlers |
| `src/main/project.ts` | `project:create`, `project:brief`, hide `.project-creator` in the tree |
| `src/main/index.ts` | Register the new handlers |
| `src/preload/index.ts` | Expose the new methods |
| `src/renderer/src/App.tsx` | Welcome or new-project screen, load the brief when a project opens |
| `src/renderer/src/components/Welcome.tsx` | Enable the button, fix the lede that states unsettled features |
| `src/renderer/src/components/NewProject.tsx` | New. Key, form, proposals, writing the brief |
| `src/renderer/src/components/SidePanel.tsx` | Real Brief tab, honest Tutor tab, mock-up text removed |
| `src/renderer/src/styles.css` | Styles for the new screen and the brief, from the existing tokens |
| `src/renderer/src/lib/paths.test.ts`, `src/main/brief.test.ts` | New unit tests |
| `e2e/*.spec.ts`, `e2e/fake-anthropic.ts` | New end-to-end tests and a canned-reply server |
| `README.md`, `CLAUDE.md` | Current state, settled decisions, test commands |

## Out of scope

- Starter files, skeleton generation and runnable tests (next milestone).
- The tutor, the help dial and setting its ceiling.
- Bring your own idea, GitHub links, job postings, hand-made templates.
- On and off toggles for brief parts. Only two of the four parts exist after this milestone, so toggles arrive with
  starter files and tests.
- Ticking "done when" items, progress, or a "current stage".
- Streaming replies, cancelling a request, editing or regenerating a single proposal. "Back" and resubmit covers it.
- A settings screen, model or provider choice. The key can be replaced from the new-project screen only.
- A database.
- The server-side refusal fallback the SDK docs suggest for this model (`fallbacks: "default"`). A refusal shows a
  plain message instead. Say so if you want the fallback.
- Fixing the baseline issues listed at the end, packaging, installers.
- Anything under the README's "Open question" and "Later ideas".

## How the minimum tests get added

- **Unit tests (Vitest)** for pure functions only: the existing path helpers, then `slugify` and `briefToMarkdown`.
  Test files sit next to the code as `*.test.ts`. Run with `npm test`.
- **End-to-end tests (Playwright `_electron`)** against the production build, one spec per step that has behaviour.
  Each launch gets a temp `--user-data-dir`. Run with `npm run test:e2e`, which builds first.
- **No real API calls in tests.** A small local HTTP server (`e2e/fake-anthropic.ts`) returns canned Messages API
  replies, and the app is launched with `ANTHROPIC_BASE_URL` pointing at it. The real SDK code path runs and the
  product code needs no test-only switches.
- **One manual check** needs you: a run with your real key in step 7. I am not able to enter a real key myself.

## Steps

Each step is one commit. Each ends with a check I run, and I show the real output.

### Step 0: Housekeeping

Commit `package-lock.json` (generated by the baseline install) and this plan.

Check: `git status --short` prints nothing, `npm run typecheck` exits 0.

### Step 1: Unit test harness

Add `vitest` and the `test` script. Add `vitest.config.ts`. First test covers the existing `baseName` and
`relativeTo` with Windows and POSIX paths, so the harness is proven before any feature code exists.

Files: `package.json`, `package-lock.json`, `vitest.config.ts`, `src/renderer/src/lib/paths.test.ts`.

Check: `npm test` shows the path tests passing, `npm run typecheck` exits 0.

### Step 2: End-to-end smoke test

Add `@playwright/test`, `playwright.config.ts` and the `test:e2e` script. `e2e/smoke.spec.ts` launches the built app
with a temp `--user-data-dir`, asserts the Welcome title and takes a screenshot. Update the commands in CLAUDE.md.

Files: `package.json`, `package-lock.json`, `playwright.config.ts`, `e2e/smoke.spec.ts`, `.gitignore`, `CLAUDE.md`.

Check: `npm run test:e2e` passes, and I open the screenshot to confirm it shows the Welcome screen.

### Step 3: Brief types and pure functions

Add the three types above. Add `slugify` (a folder name that is safe on Windows) and `briefToMarkdown` (the
`ASSIGNMENT.md` text).

Files: `src/shared/types.ts`, `src/main/brief.ts`, `src/main/brief.test.ts`.

Check: `npm test` shows the new cases passing, `npm run typecheck` exits 0.

### Step 4: API key storage

`keyStore.ts` with `hasKey`, `setKey`, `clearKey`, and a `getKey` that only main can call. `window.api.ai` gets
`hasKey`, `setKey` and `clearKey`. There is no method that returns the key.

Files: `src/main/keyStore.ts`, `src/main/ai.ts`, `src/main/index.ts`, `src/shared/types.ts`, `src/preload/index.ts`,
`e2e/key.spec.ts`.

Check: `npm run test:e2e`. The new spec stores a fake key, sees `hasKey()` true, relaunches with the same data
folder and sees it still true, and confirms the file on disk does not contain the key text. `npm run typecheck`.

### Step 5: The two Claude calls

Add `@anthropic-ai/sdk` and `zod`. `proposeProjects(input)` returns exactly three proposals. `writeBrief(input,
proposal)` returns a brief. Both use `client.messages.parse` with `zodOutputFormat` from
`@anthropic-ai/sdk/helpers/zod`, model `claude-opus-5-5`, no streaming, a two minute timeout. Both check
`stop_reason` before using the result. SDK error classes map to short messages: no key, key rejected, rate limited,
no connection, refused, cut off.

Files: `package.json`, `package-lock.json`, `src/main/ai.ts`, `src/shared/types.ts`, `src/preload/index.ts`,
`e2e/fake-anthropic.ts`, `e2e/ai.spec.ts`.

Check: `npm run test:e2e`. Against the fake server, `propose` returns three proposals, `writeBrief` returns a brief
with 5 to 10 stages, and a canned 401 produces the "key was rejected" message. `npm run typecheck`.

### Step 6: Create the project on disk

`project:create` shows the folder picker for the parent, creates `<parent>/<slug>`, writes `ASSIGNMENT.md` and
`.project-creator/brief.json`, and opens it as the project. It refuses a folder that exists and is not empty.
`project:brief` reads and validates the JSON for the open folder and returns null when there is none. The tree
hides `.project-creator`. All writes still pass `insideRoot` once the new root is set.

Files: `src/main/project.ts`, `src/shared/types.ts`, `src/preload/index.ts`, `e2e/create.spec.ts`.

Check: `npm run test:e2e`. With the dialog stubbed to a temp folder, both files exist and `ASSIGNMENT.md` contains
the title and stage names. A second create into the same folder returns the "already exists" message.
`npm run typecheck`.

### Step 7: The new-project screen

Welcome's button is enabled and its lede is rewritten. `NewProject.tsx` shows, in order: the key field (only when no
key is stored, or after a rejected key), the four questions, three proposal cards with "Back", a "writing your
brief" state, then the folder picker. On success the project opens with `ASSIGNMENT.md` in the editor. Errors use
the existing toast.

Files: `src/renderer/src/components/NewProject.tsx`, `src/renderer/src/components/Welcome.tsx`,
`src/renderer/src/App.tsx`, `src/renderer/src/styles.css`, `e2e/new-project.spec.ts`.

Check: `npm run test:e2e`. The spec walks the whole flow against the fake server and takes screenshots of the form,
the proposals and the opened project, which I open and look at. Then you run it once with your real key.

### Step 8: The Guide panel shows the brief

The first tab becomes "Brief": summary, requirements, example, and the stages with their "done when" items. A
folder without a brief shows one plain line. The Tutor tab says it is not built yet. The mock-up text and the hint
ladder mock-up go, along with their styles. `--pencil` is not used here because nothing is "current" yet.

Files: `src/renderer/src/components/SidePanel.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/styles.css`,
`e2e/new-project.spec.ts`.

Check: `npm run test:e2e`. The Guide panel lists the fixture's stage titles, and a plain folder shows the empty
line. Screenshots of both, which I open and look at.

### Step 9: Docs

README: current state, the decisions table above folded into the settled and unsettled lists, provider and storage
no longer "not chosen", the baseline issues under known gaps. CLAUDE.md: remove anything now stale.

Files: `README.md`, `CLAUDE.md`.

Check: `npm run typecheck`, `npm test` and `npm run test:e2e`, all output shown.

### Step 10: Fresh review

A subagent that has not seen the conversation reviews the diff from step 0 to HEAD against this file. It reports
only gaps that affect correctness or this plan's requirements, not style. I fix those and rerun step 9's checks.

## Done when

1. From Welcome, "Start a new project" leads through the key (first time only), the questions, three proposals, a
   pick and a folder choice, and lands in the workbench with `ASSIGNMENT.md` open and the same brief in the Guide
   panel.
2. The key is stored encrypted, survives a restart, and is never returned to the UI.
3. `npm run typecheck`, `npm test` and `npm run test:e2e` pass, and the screenshots have been looked at.
4. You have run it once with a real key and the three proposals and the brief read sensibly.
5. The fresh review's correctness gaps are fixed.

## Rules while building

- Build only what this plan asks for. No extra features, abstractions or config.
- After each step, run its check and show the real output.
- Ask before anything hard to undo: deleting files, changing the security model, adding a large dependency.
- If something is not clearly settled, check the README. Only the four core features and the decisions above are.

## Baseline facts a fresh session needs

- Baseline commit is `e4a3f96`. Install, typecheck and build pass on Windows. The built app was driven end to end
  (folder, tree, terminal through node-pty and PowerShell, Monaco, save) with no errors.
- Electron 44 does not download its binary during `npm install`. Run `node node_modules/electron/install.js`, or let
  the first `npm run dev` fetch it.
- `electron.exe` is a GUI program, so PowerShell does not wait for it. Use `Start-Process -Wait` when a script needs
  its exit code.
- Known and not fixed in this milestone:
  - Dev mode logs two errors on every start: an xterm `TypeError` reading `dimensions`, and
    `Error: AttachConsole failed` from node-pty. The app keeps working. Likely React StrictMode mounting the
    terminal twice, not confirmed.
  - `npm audit` reports dompurify (high) through monaco-editor 0.55.1. The fix is monaco-editor 0.57, a breaking
    upgrade.
  - No `.gitattributes`, so git warns about LF to CRLF on every file.
  - An empty git repo exists at `C:\Users\Acer\Desktop\.git`. It looks accidental.
