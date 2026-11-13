import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { ipcMain } from 'electron'
import { z } from 'zod'
import type { Brief, Proposal, ProposalInput, Starter } from '@shared/types'
import { BriefSchema, parseWith, ProposalInputSchema, ProposalSchema } from './brief'
import { clearKey, getKey, hasKey, setKey } from './keyStore'
import { StarterSchema, validateStarter } from './starter'

const MODEL = 'claude-opus-5-5'

const ProposalsSchema = z.object({ proposals: z.array(ProposalSchema) })

const PROPOSE_SYSTEM = `You help a learner choose a programming project to build on their own. They will write all of the code themselves, so each project has to be something they can realistically finish and be glad they built.

Propose exactly three projects. Make them meaningfully different from each other (different kinds of program, not three variations of one idea) so the choice is a real one. Every project must fit the time the learner has, suit their experience, and follow from what they said they want to build or learn. If they named a language, use it for all three. If they did not, pick the language that best fits each project and their experience.

For each project give:
- title: a short plain name.
- pitch: one or two sentences on what it is and why it is worth building.
- stack: the language and main tools. Prefer the standard library and few dependencies.
- estimatedHours: a realistic number for this learner, no more than the time they have.
- skills: three to five specific things they will practise.`

const BRIEF_SYSTEM = `You write the brief for a programming project, framed like a good classroom assignment. The learner builds the project alone. The brief exists to make starting easy and to make "done" unambiguous. It must not do any of the work for them, because working out how is the part they learn from.

So describe what the finished project does and how to tell each step is done, never how to build it. Do not include code, pseudocode, file or function names, data structure choices or step-by-step instructions. Sample commands, sample input and expected output are fine, because they show the target without giving away the solution.

Write these fields:
- title, stack, estimatedHours: keep them consistent with the project the learner chose.
- summary: one short paragraph on what they are building and why it is worth doing.
- requirements: four to eight things the finished project must do, each one visible from the outside.
- example: a concrete picture of the finished project in use, as plain text. For a command-line tool, a few sample commands with the output they print. For something with a screen, a short description of what is on it and one interaction.
- stages: five to ten stages in the order to build them. Each stage is a small working step that builds on the one before, and the first is small enough to finish in the first sitting. Each stage has a title, a goal of one sentence, why, and doneWhen. why is two or three sentences of reasoning: why this stage comes at this point, what it makes possible for the stages after it, and what the learner practises by doing it. It gives reasons, not instructions, so it must not say how to build the stage. doneWhen is two to four checks the learner can see for themselves by running the project.

Keep it short and plain. The learner should be able to read the whole brief in a few minutes.`

/** Added to the brief prompt when starter files will be written for the project. */
const BRIEF_WITH_STARTER = `The learner starts from starter files that already run, so setup is done for them. No stage is about creating the project, installing anything or getting it to start. Stage 1 is one small visible change to the running starter, so that they read it before they build on it.`

const STARTER_SYSTEM = `You write the starter files for a programming project that a learner will build alone, from the brief in the user message. The starter exists so that setup is not the thing that stops them. It must run as it is, and it must leave every real feature of the project to the learner, because building those is what they learn from.

What the starter is:
- After the setup commands, the run command starts the project and shows a placeholder: a line of output, a page with only a heading, a window with a title. Nothing more.
- It has the structure a project like this needs in order to start (an entry point, configuration, a dependency list when there are dependencies) and none of the behaviour in the brief's requirements. Do not build, or half build, any stage.
- Where the learner's work goes, leave a comment that starts with TODO and names the stage, like "TODO (stage 3): ...". It says in one line what belongs there, never how to write it.
- Prefer the standard library. Add a dependency only when the brief's stack names it, and use well-known packages by their exact published names.
- Keep it small: at most 12 files, each short, text only. Paths are relative to the project folder and use forward slashes. Do not write ASSIGNMENT.md or a README. Do not write any file or folder whose name starts with a dot, except .gitignore.
- If you write a package.json, it must be plain JSON and have none of the scripts npm runs during install: preinstall, install, postinstall, prepublish, preprepare, prepare, postprepare. Do not write a binding.gyp file.

Commands:
- setup: what to run once before the first start, in order, one command per entry. Empty when nothing is needed.
- run: the one command that starts the project.
- Write every command for the terminal named in the user message. Each command is a single line.

Tests, only when the user message asks for them:
- Put them in their own file or files, written with the language's built-in test tool when it has one (unittest for Python, node:test for Node.js, go test for Go). If a test tool has to be installed, its install command goes in setup.
- Write tests for every stage of the brief, grouped by stage in order, with a comment above each group naming its stage.
- Tests look at the project from the outside. They run the program and read what it prints, request a page and read the response, or call the entry point the starter itself defines. They never depend on names the learner has yet to choose, such as helper functions or files that do not exist yet.
- The tests for stage 1 are switched on. Every later group is skipped with the test tool's own skip marker, next to a comment telling the learner to remove the marker when they reach that stage.
- Run against the starter as written, the tests for stage 1 fail because the feature is not built yet. Nothing crashes while the test file loads.
- testCommand: the one command that runs all the tests.
- tests: one entry for each test, with its stage number (1 is the first stage), the file it is in, its name exactly as written in that file, and observes: one plain sentence, written for the learner, saying what the test looks at.

When the user message does not ask for tests, write no test files, set testCommand to an empty string and tests to an empty list.`

/** The terminal the learner will type commands into, so the starter's commands fit it. */
const TERMINALS: Record<string, string> = {
  win32: 'Windows, with PowerShell as the terminal',
  darwin: 'macOS, with zsh as the terminal',
  linux: 'Linux, with bash as the terminal'
}

const LEVELS: Record<ProposalInput['level'], string> = {
  new: 'new to programming',
  some: 'has finished a course or a few tutorials, but has not built much alone',
  comfortable: 'comfortable building small programs without a tutorial'
}

function describeLearner(input: ProposalInput): string {
  return [
    `What they want to build or learn: ${input.interests}`,
    `Experience: ${LEVELS[input.level]}`,
    `Language: ${input.language || 'no preference, choose what fits best'}`,
    `Time they have for the whole project: ${input.hours} hours`
  ].join('\n')
}

/** Turns an SDK error into one sentence the user can act on. */
async function explain(err: unknown): Promise<Error> {
  if (err instanceof Anthropic.AuthenticationError) {
    // A rejected key is no use, so forget it. The UI then asks for a new one.
    await clearKey()
    return new Error('Claude rejected that API key. Check it and enter it again.')
  }
  if (err instanceof Anthropic.PermissionDeniedError) return new Error("That API key isn't allowed to use this model.")
  if (err instanceof Anthropic.RateLimitError) return new Error('Claude is rate limiting this key. Wait a minute and try again.')
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new Error('Claude took too long to answer. Try again.')
  if (err instanceof Anthropic.APIConnectionError) return new Error("Couldn't reach Claude. Check your internet connection.")
  if (err instanceof Anthropic.APIError) {
    return new Error(`Claude returned an error (${err.status}): ${err.apiMessage ?? 'no details given'}`)
  }
  return err instanceof Error ? err : new Error(String(err))
}

/**
 * One request, one reply, shaped by `schema`. The key never leaves the main process.
 *
 * `long` is for a reply that can run to many files. That request is streamed and collected at the end, which is
 * what the SDK asks for when the output is long: a plain request can time out while the reply is still being
 * written.
 */
async function ask<T>(system: string, user: string, schema: z.ZodType<T>, long = false): Promise<T> {
  const apiKey = await getKey()
  if (!apiKey) throw new Error('Add your Claude API key first.')
  const client = new Anthropic({ apiKey, timeout: long ? 600_000 : 120_000, maxRetries: 1 })
  const format = zodOutputFormat(schema)
  // The shape is also written into the prompt. Claude enforces `format` by itself, but a stand-in server that
  // ignores it (a proxy in front of another model) has only the prompt to go on.
  const shaped = `${system}\n\nReply with only a JSON object that matches this JSON Schema, with no other text:\n${JSON.stringify(format.schema)}`
  try {
    // Not messages.parse: it parses the text before we can look at stop_reason, so a reply that was cut off or
    // declined would surface as a JSON syntax error instead of saying what happened.
    const request = {
      model: MODEL,
      max_tokens: long ? 64000 : 16000,
      system: shaped,
      messages: [{ role: 'user' as const, content: user }],
      // Only the schema goes on the wire. Handing the SDK the whole `format`, with its parse function, makes the
      // streaming helper parse the text itself, and a cut-off reply then fails as a JSON error before the
      // stop_reason below can be looked at.
      output_config: { effort: 'medium' as const, format: { type: format.type, schema: format.schema } }
    }
    const message = long ? await client.messages.stream(request).finalMessage() : await client.messages.create(request)
    if (message.stop_reason === 'refusal') {
      throw new Error('Claude declined this request. Try describing what you want differently.')
    }
    if (message.stop_reason === 'max_tokens') throw new Error('The reply was cut off before it finished. Try again.')
    const text = message.content.find((block) => block.type === 'text')
    try {
      if (!text) throw new Error('no text in the reply')
      return format.parse(text.text)
    } catch {
      throw new Error("The reply wasn't in the expected format. Try again.")
    }
  } catch (err) {
    throw await explain(err)
  }
}

export async function proposeProjects(input: ProposalInput): Promise<Proposal[]> {
  const { proposals } = await ask(PROPOSE_SYSTEM, describeLearner(input), ProposalsSchema)
  if (proposals.length < 3) throw new Error("Claude didn't come back with three projects. Try again.")
  return proposals.slice(0, 3)
}

export async function writeBrief(input: ProposalInput, proposal: Proposal, withStarter = false): Promise<Brief> {
  const user = `${describeLearner(input)}\n\nThe project they chose:\n${JSON.stringify(proposal, null, 2)}`
  const brief = await ask(withStarter ? `${BRIEF_SYSTEM}\n\n${BRIEF_WITH_STARTER}` : BRIEF_SYSTEM, user, BriefSchema)
  if (brief.stages.length === 0) throw new Error('The brief came back without any stages. Try again.')
  return brief
}

/** Starter files for a brief. Checked here, so a starter that may not be written never reaches the UI. */
export async function writeStarter(input: ProposalInput, brief: Brief, wantTests: boolean): Promise<Starter> {
  const user = [
    describeLearner(input),
    `Their computer: ${TERMINALS[process.platform] ?? 'an unknown system'}`,
    `Tests: ${wantTests ? 'yes, write them' : 'no'}`,
    '',
    'The brief:',
    JSON.stringify(brief, null, 2)
  ].join('\n')
  const starter = validateStarter(await ask(STARTER_SYSTEM, user, StarterSchema, true), brief)
  if (wantTests && starter.tests.length === 0) throw new Error('The starter came back without tests. Try again.')
  return starter
}

export function registerAiHandlers(): void {
  ipcMain.handle('ai:hasKey', () => hasKey())
  ipcMain.handle('ai:setKey', (_event, key: string) => setKey(key))
  ipcMain.handle('ai:clearKey', () => clearKey())
  ipcMain.handle('ai:propose', (_event, input: unknown) => proposeProjects(parseWith(ProposalInputSchema, input)))
  ipcMain.handle('ai:writeBrief', (_event, input: unknown, proposal: unknown, withStarter: unknown) =>
    writeBrief(parseWith(ProposalInputSchema, input), parseWith(ProposalSchema, proposal), withStarter === true)
  )
  ipcMain.handle('ai:writeStarter', (_event, input: unknown, brief: unknown, wantTests: unknown) =>
    writeStarter(parseWith(ProposalInputSchema, input), parseWith(BriefSchema, brief), wantTests === true)
  )
}
