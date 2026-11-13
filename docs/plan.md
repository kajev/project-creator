# Plan: Milestone 2, Starter files, tests and ticking stages

Status: approved as written on 2026-11-12.

The Milestone 1 plan is kept as `docs/milestone-1.md`.

## What this milestone delivers

A new project no longer opens as a folder with only `ASSIGNMENT.md` in it.

1. **Starter files.** After the brief is written, the AI writes a small starter that runs out of the box: setup is
   done, the project starts and shows a placeholder, and every real feature is left for the learner as a TODO.
2. **Tests in a file.** The starter includes a test file the learner can run and add to. The brief and the Guide
   panel say, in plain words, what each test observes.
3. **Getting started.** The setup, run and test commands are listed in `ASSIGNMENT.md` and in the Guide panel. The
   learner runs them. The app never runs them.
4. **Ticking stages.** Each "done when" item becomes a checkbox in the Guide panel. Ticks are saved with the project
   and the current stage is highlighted.
5. **New file and new folder** from the file tree.

## Why this comes second

1. It is core feature 2 in the README: give boilerplate to start from.
2. You hit this wall yourself on 2026-11-12. The first stage of your mock interview project was "set up a Flask
   project that serves an HTML page", you did not know how, and the app could not even create a file.
3. The tutor (Milestone 3) needs it. A tutor that knows the starter, the current stage and what the tests observe
   can ask better questions than one that only has the brief.

## Decisions from the interview

Asked on 2026-11-12.

| Question | Your answer | Where it lands |
| --- | --- | --- |
| What comes first | Starter files. The tutor is Milestone 3. | This plan. |
| How much the starter does | Runs out of the box. Setup is done, real features are TODOs. | Steps 4 to 6. |
| Checking a stage | You tick the items yourself, and you can run tests from a file. The tests are AI-written, live in a file so you can add your own, and come with a description of what they observe. | Steps 3 to 8. |
| Setup commands | Shown to you, and you run them. | Steps 3 and 7. |

## Decisions for you to approve with this plan

Say so if you want any of these changed.

1. **The app runs nothing.** Setup, run and test commands are shown as text with a Copy button. There is no "run
   tests" button and nothing is typed into the terminal for you. This follows from "show them, I run them", and it
   means running the tests is: copy the command, paste it in the terminal, press Enter.
2. **A starter is refused as a whole, never repaired.** If any file path in the AI's reply is unsafe, or the starter
   is over the size limits, nothing is written and you get a message. The brief is kept so you can try again or
   continue without starter files.
3. **Limits.** At most 15 files, each at most 32 KB, 128 KB in total, text only.
4. **Path rules** (from the research below). A path is refused if it is absolute, starts at a drive or network
   share, contains `..`, a colon, a control character or any of `< > " | ? *`, uses a Windows device name such as
   `CON` or `NUL` (with or without an extension), ends a segment in a dot or space, or collides with another path
   once letter case is ignored. Names starting with a dot are refused, except `.gitignore`. `ASSIGNMENT.md` is
   refused. A `package.json` with `preinstall`, `install`, `postinstall` or `prepare` scripts is refused, because
   `npm install` would run them.
5. **Tighter file access for everything.** `insideRoot` in `src/main/project.ts` only compares path text today. A
   folder link inside a project that points elsewhere would pass it. This plan makes it resolve links first. That
   is a small strengthening of the security model, which is why it is listed here.
6. **The brief changes when starter files are on.** No stage is about setting the project up. Stage 1 becomes a
   small visible change to the running starter, so the learner reads it before building on it. With starter files
   off, the brief is written as it is today.
7. **Tests for later stages start out skipped.** All tests are in the file from the start, but only stage 1's are
   active. Each later group carries the test tool's own skip marker and a comment saying to remove it when you
   reach that stage. Otherwise the first test run is a wall of failures.
8. **Tests look at the project from the outside.** They run the command, call the web address or use the entry
   point the starter already defines. They never depend on function or file names the learner has yet to choose.
9. **Where the new data lives.** `.project-creator/starter.json` holds the commands and the test descriptions.
   `.project-creator/progress.json` holds the ticks. Ticking does not edit `ASSIGNMENT.md`.
10. **Two switches on the questions form:** "Starter files" and "Tests", both on by default. Tests need starter
    files. This is the on and off choice the README's Decided table promises.
11. **No new dependencies.**

## What the research changed

- **What other platforms give you.** Starters are small and runnable, with the gap marked in place: Codecrafters
  ships an entry file with stage 1 commented out, CS50 pre-writes the input and output code and leaves the rest,
  freeCodeCamp gives a working server with one sample endpoint. Installing tools is left to the learner but listed.
  Checks that work across languages look at the program from outside (output, exit code, web responses). Exercism
  skips every test but the first. That is where decisions 6, 7 and 8 come from. Sources:
  [Codecrafters starter code](https://docs.codecrafters.io/contributors/adding-language-support/starter-code.md),
  [Exercism practice exercises](https://exercism.org/docs/building/tracks/practice-exercises),
  [CS50 filter](https://cs50.harvard.edu/x/psets/4/filter/less/),
  [check50](https://cs50.readthedocs.io/projects/check50/en/latest/check_writer/),
  [freeCodeCamp boilerplate](https://github.com/freeCodeCamp/boilerplate-project-timestamp).
- **Writing AI-generated files safely.** Reject bad paths instead of cleaning them. Check Windows device names,
  colons, trailing dots and spaces, and case collisions, not only `..`. Resolve links before checking a path is
  inside the folder. Create files exclusively so nothing is overwritten. Watch for files that run later: in 2025 an
  AI coding tool was tricked into writing `.vscode/settings.json` and gained command execution from it. That is
  where decisions 2, 4 and 5 come from. Sources:
  [OWASP LLM05](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/),
  [Zip Slip](https://security.snyk.io/research/zip-slip-vulnerability),
  [Windows file naming](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file),
  [Node path docs](https://nodejs.org/api/path.html),
  [Copilot CVE-2025-53773](https://embracethered.com/blog/posts/2025/github-copilot-remote-code-execution-via-prompt-injection/),
  [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts).
- **Running AI-suggested commands.** No source recommends running them automatically. OWASP names model output
  passed to a shell as a remote code execution risk and asks for human approval at minimum. One study found that
  commercial models invent package names in at least 5.2% of cases, so even `pip install` deserves a look first.
  That is where decision 1 comes from, and why "Getting started" tells the learner to read the commands. Sources:
  [OWASP LLM06](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/),
  [Spracklen et al. 2025](https://www.usenix.org/conference/usenixsecurity25/presentation/spracklen).
- **How much starter code helps a beginner.** The evidence leans toward giving one, and it is thin. Two small
  experiments (57 and 40 students) found that completing an existing program taught program writing better than
  starting from scratch, with fewer dropouts in one of them. Giving the structure while the learner still writes
  the logic did not hurt later code writing in two larger studies. Labelling the steps raised quiz scores and
  roughly halved failures over a semester, which is why every TODO names its stage. Against that: TODO comments on
  their own are untested, no study compares a project skeleton with an empty folder, and one 2026 study found code
  scaffolds raised first-lab anxiety more than blank templates (it measured anxiety only, and only its abstract
  could be read). Guidance that helps beginners can hold back experienced learners, which is why the starter is a
  switch (decision 10). Sources:
  [van Merriënboer 1990](https://research.utwente.nl/en/publications/strategies-for-programming-instruction-in-high-school-program-com/),
  [van Merriënboer and de Croock 1992](https://research.utwente.nl/en/publications/strategies-for-computer-based-programming-instruction-program-com/),
  [Weinman et al. 2021](https://acelab.berkeley.edu/wp-content/papercite-data/pdf/parsons-chi2021.pdf),
  [Hou et al. 2022](https://web.eecs.umich.edu/~xwanghci/papers/ICER22.pdf),
  [Margulieux et al. 2020](https://par.nsf.gov/servlets/purl/10171482),
  [Bolloju et al. 2026](https://api.crossref.org/works/10.1145/3796506),
  [Kalyuga et al. 2003](https://api.openalex.org/works/doi:10.1207/S15326985EP3801_4).
- **The Claude call.** The SDK guidance is to stream any request with long output and collect it with
  `finalMessage()`, which avoids request timeouts. Structured replies work with streaming. Reply schemas may only
  use plain types, so the size limits above are checked in the app, not in the schema.

## The new shapes

```ts
interface StarterFile {
  path: string // relative to the project folder, forward slashes
  content: string
}

interface StarterTest {
  stage: number // 1 is the first stage
  name: string // the test's name as it appears in the test file
  observes: string // one plain sentence: what this test looks at
}

/** What Claude returns. */
interface Starter {
  files: StarterFile[] // source, config and test files
  setup: string[] // commands to run once, in order. May be empty.
  run: string // the command that starts the project
  testCommand: string // empty when tests are off
  tests: StarterTest[] // empty when tests are off
}

/** What the app keeps in .project-creator/starter.json: everything except the file contents. */
interface StarterInfo {
  files: string[]
  setup: string[]
  run: string
  testCommand: string
  tests: StarterTest[]
}

/** .project-creator/progress.json. ticked[stage][item], same order as the brief. */
type Progress = boolean[][]
```

`ASSIGNMENT.md` gains two sections after "What finished looks like": "Getting started" (setup commands, the run
command, and a line saying the AI wrote them so read them first) and "Tests" (the test command, which files hold
the tests, that you can add your own, and what each test observes, grouped by stage).

The starter prompt tells the model: make it run after the setup commands, mark every gap with a TODO that names the
stage it belongs to, write none of the project's real behaviour, prefer the standard library and the language's
built-in test tool, and keep within the limits.

## Files that change

| File | Change |
| --- | --- |
| `src/shared/types.ts` | `Starter`, `StarterFile`, `StarterTest`, `StarterInfo`, `Progress`, and the new API methods |
| `src/main/paths.ts` | New. `checkRelativePath`, the pure path rules |
| `src/main/starter.ts` | New. `StarterSchema`, `validateStarter` (limits, paths, lifecycle scripts), `starterToMarkdown` |
| `src/main/brief.ts` | `briefToMarkdown` takes an optional starter |
| `src/main/ai.ts` | `writeStarter` (streamed), its prompt, the brief prompt's "starter is provided" variant |
| `src/main/project.ts` | Link-aware `insideRoot`, `project:create` writes the starter, `project:starter`, `project:progress`, `project:setProgress`, `fs:createFile`, `fs:createDir` |
| `src/preload/index.ts` | Expose the new methods |
| `src/renderer/src/components/FileTree.tsx` | New file and new folder |
| `src/renderer/src/components/NewProject.tsx` | The two switches, the starter step, keeping the brief when the starter fails |
| `src/renderer/src/components/SidePanel.tsx` | Getting started, tests per stage, checkboxes, current stage |
| `src/renderer/src/App.tsx` | Load starter info and progress with the brief |
| `src/renderer/src/styles.css` | Styles for the above, from the existing tokens. `--pencil` marks the current stage. |
| `src/main/*.test.ts` | Unit tests for the path rules, the starter checks and the markdown |
| `e2e/*.spec.ts`, `e2e/fake-anthropic.ts` | New tests, a canned starter, and a streamed reply |
| `README.md`, `CLAUDE.md` | Current state, the Decided table, the security model |

## Out of scope

- The tutor, the help dial and its ceiling (Milestone 3).
- The app running any command. A "run tests" button. Reading test results. Ticking items from test results.
- Checking that the starter really runs, or that the packages it names exist. That is the manual check below.
- Rename, delete and move in the file tree.
- Adding a starter to a project that already exists. Writing a starter again for the same project.
- Hand-made templates. Bring your own idea. GitHub links.
- Images or other binary files in a starter.
- Showing the reply as it streams. A cancel button.
- Keeping `ASSIGNMENT.md` checkboxes in step with the ticks.
- The server-side refusal fallback, as in Milestone 1.
- The quit hang, the two dev-mode errors and the dompurify audit finding. They stay in the README's known gaps.
- Anything under the README's "Open question" and "Later ideas".

## Tests

Same rules as Milestone 1. Unit tests for pure functions, end-to-end tests against the built app, and no test calls
the real Claude API.

New for this milestone:

- `e2e/fake-anthropic.ts` learns to answer a streamed request with server-sent events, because the starter call
  streams. It gets a canned starter, plus markers for an unsafe path and for too many files.
- Each case of the "refuse the whole starter" rule is tested by asserting that no folder was created.
- **One manual check needs you**, in step 6: make a real project, read and run the setup commands, see the starter
  start, and run the tests once. I am not able to run AI-written code or commands on your computer for you.

## Steps

Each step is one commit. Each ends with a check I run, and I show the real output.

### Step 0: Housekeeping

Commit this plan, the renamed Milestone 1 plan and the README lines that point at them.

Check: `git status --short` prints nothing, `npm run typecheck` exits 0.

### Step 1: Path rules

`checkRelativePath(path)` returns the cleaned relative path or throws a one-line reason. It implements decision 4
except the `package.json` rule. `insideRoot` resolves links before comparing (decision 5).

Files: `src/main/paths.ts`, `src/main/paths.test.ts`, `src/main/project.ts`.

Check: `npm test`. The unit tests feed it `../x`, `C:\x`, `C:x`, `\\server\share\x`, `a/CON.txt`, `a:b`, `a./b`,
`.vscode/settings.json`, `.gitignore`, and two paths that differ only by case. `npm run test:e2e` still passes.

### Step 2: New file and new folder

Two buttons in the file tree header. Each opens a one-line field for a path relative to the project folder, such as
`templates/index.html`. Missing folders are created. A new file opens in the editor. An unsafe or existing name
shows the reason. The empty-folder hint stops telling you to use the terminal.

Files: `src/main/project.ts`, `src/shared/types.ts`, `src/preload/index.ts`,
`src/renderer/src/components/FileTree.tsx`, `src/renderer/src/styles.css`, `e2e/tree.spec.ts`.

Check: `npm run test:e2e`. The spec creates `templates/index.html`, sees it in the tree and in the editor, and sees
`../x` and a repeated name refused. Screenshot, which I open and look at.

### Step 3: Starter shapes, checks and markdown

Add the types above. `validateStarter` applies the limits, runs every path through `checkRelativePath`, refuses
duplicates and `package.json` lifecycle scripts, and refuses a test whose stage number is not in the brief.
`starterToMarkdown` writes the two new sections.

Files: `src/shared/types.ts`, `src/main/starter.ts`, `src/main/starter.test.ts`, `src/main/brief.ts`,
`src/main/brief.test.ts`.

Check: `npm test` shows the new cases passing, `npm run typecheck` exits 0.

### Step 4: The starter call

`writeStarter(input, brief, wantTests)` asks Claude for a `Starter`. It streams the request and collects it with
`finalMessage()`, with the same model, the same stop-reason checks and the same error messages as the other two
calls. `writeBrief` gets a flag for "a starter will be provided" (decision 6).

Files: `src/main/ai.ts`, `src/shared/types.ts`, `src/preload/index.ts`, `e2e/fake-anthropic.ts`, `e2e/ai.spec.ts`.

Check: `npm run test:e2e`. Against the fake server the call returns the canned starter, the request was streamed
and contains the brief, and a cut-off reply gives the "cut off" message. `npm run typecheck`.

### Step 5: Write the starter to disk

`project:create(brief, starter)` validates the starter before asking for a folder. After the folder is created it
writes every file exclusively, then `starter.json`, then `ASSIGNMENT.md` with the new sections. `project:starter`
returns the saved info, or null.

Files: `src/main/project.ts`, `src/shared/types.ts`, `src/preload/index.ts`, `e2e/create.spec.ts`.

Check: `npm run test:e2e`. The canned starter's files are on disk with the right content. A starter with `../evil`
and one with 16 files are each refused with no folder created. A project made without a starter still works.

### Step 6: The new-project screen

The two switches on the questions form. Picking a proposal writes the brief, then the starter, with a status line
for each. If the starter fails or is refused, the brief is kept and the screen offers "Try the starter files again"
and "Continue without starter files". Leaving the screen still stops everything, as it does today.

Files: `src/renderer/src/components/NewProject.tsx`, `src/renderer/src/styles.css`, `e2e/new-project.spec.ts`.

Check: `npm run test:e2e`. The spec walks the flow with both switches on and with both off, and the refused-starter
path. Screenshots, which I open and look at. Then your manual check.

### Step 7: The Guide panel shows the starter

Under the summary: "Getting started" with each command and a Copy button. Under each stage: its tests, each with
its name and what it observes. The test command sits with the tests. A project without a starter shows none of it.

Files: `src/renderer/src/components/SidePanel.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/styles.css`,
`e2e/new-project.spec.ts`.

Check: `npm run test:e2e`. The panel lists the canned commands and test descriptions, and Copy puts the command on
the clipboard. Screenshot, which I open and look at.

### Step 8: Ticking and the current stage

Each "done when" item is a checkbox. Ticks are saved to `progress.json` as they change. The current stage is the
first one with an unticked item, and it is marked with `--pencil`.

Files: `src/main/project.ts`, `src/shared/types.ts`, `src/preload/index.ts`,
`src/renderer/src/components/SidePanel.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/styles.css`,
`e2e/progress.spec.ts`.

Check: `npm run test:e2e`. The spec ticks every item in stage 1, sees stage 2 become current, reopens the project
and finds the ticks still there. A project with a damaged `progress.json` opens with nothing ticked.

### Step 9: Docs

README: the Decided table's "Built" column, current state, known gaps, and the security model (AI-written files are
checked before writing, commands are shown and never run). CLAUDE.md: the same two rules, briefly.

Files: `README.md`, `CLAUDE.md`.

Check: `npm run typecheck`, `npm test` and `npm run test:e2e`, all output shown.

### Step 10: Fresh review

A subagent that has not seen the conversation reviews the diff from step 0 to HEAD against this file. It reports
only gaps that affect correctness or this plan's requirements, not style. I fix those and rerun step 9's checks.

## Done when

1. A new project made with both switches on opens with the starter files in the tree, a test file among them, and
   an `ASSIGNMENT.md` that has "Getting started" and "Tests".
2. The Guide panel shows the commands, the tests per stage with what they observe, and tickable "done when" items.
   Ticks survive closing and reopening the project, and the current stage is marked.
3. A starter with an unsafe path or over the limits is refused as a whole and leaves nothing on disk.
4. New file and new folder work from the tree and refuse unsafe names.
5. `npm run typecheck`, `npm test` and `npm run test:e2e` pass, and the screenshots have been looked at.
6. You have made one real project, run its setup commands, seen the starter start, and run its tests.
7. The fresh review's correctness gaps are fixed.

## Changed while building

Where the build differs from the plan above, and why.

- **A test also names its file.** `StarterTest` has a `file` field. The plan's "Tests" section says which files hold
  the tests, and the plan's shape had no way to know.
- **Continuing without starter files writes the brief again.** Decision 2 said the brief is kept. Decision 6 said a
  brief written for a starter has no setup stage. Kept as it was, the brief would tell the learner to change a
  starter that is not there, so "Continue without starter files" asks for a new one. "Try again" still keeps it.
- **More is refused than decision 4 lists**, all found by the fresh review: Windows short names such as `PROJEC~1`
  (a second spelling of the app's own folder), any path under a folder named `ASSIGNMENT.md`, a `package.json` that
  is not plain JSON (npm reads some that `JSON.parse` cannot), the scripts `prepublish`, `preprepare` and
  `postprepare`, and `binding.gyp`. The device names also cover the superscript digits and the console names.
- **A project that fails partway through writing is removed.** The plan checked everything before writing and had
  no answer for a write that fails afterwards.
- **A link whose target is missing is blocked**, not treated as "nothing here yet".
- **A saved `starter.json` with a line break in a command is not shown.** The plan only checked commands on the way
  in.
- **The test command is listed under "Getting started"**, next to the other commands, not under each stage.
- **Names that start with a dot are refused for the AI only.** You can make `.env` with New file.
- **New file and New folder close the open folders in the tree**, because the tree is reloaded.

## Rules while building

- Build only what this plan asks for. No extra features, abstractions or config.
- After each step, run its check and show the real output.
- Ask before anything hard to undo: deleting files, changing the security model, adding a large dependency.
- If something is not clearly settled, check the README. Only the four core features and the Decided table are.

## Facts a fresh session needs

- The repo is public at `github.com/kajev/project-creator`. `main` is pushed. Commits in this repo use the GitHub
  no-reply address, set in the repo's own git config. Do not push unless asked.
- You are testing without a real Claude key, through a local proxy on `http://127.0.0.1:8082` that forwards to
  another model. Start the app with `$env:ANTHROPIC_BASE_URL = "http://127.0.0.1:8082"; npm run dev` and type
  placeholder text as the key. The proxy ignores the reply-shape setting, which is why every prompt also carries
  the JSON Schema as text. The starter call streams, so step 4 must be tried through the proxy too.
- That other model follows the prompts less strictly than Claude. Do not tune prompts to its mistakes.
- `npm run dev` does not restart the app when files under `src/main` or `src/preload` change. Close and reopen it.
- A stage's `why` field is optional in the schema, so briefs from before it existed still load. Keep new fields on
  stored files tolerant in the same way.
- Still open from Milestone 1: quitting within a second or two of opening a project can hang the app (the
  end-to-end tests wait for the shell before closing, see `closeApp` in `e2e/launch.ts`), and the app has not been
  run with a real Claude key.
