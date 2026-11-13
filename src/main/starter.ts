import { z } from 'zod'
import type { Brief, Starter, StarterInfo } from '@shared/types'
import { checkRelativePath, findCollision } from './paths'

export const MAX_STARTER_FILES = 15
export const MAX_STARTER_FILE_BYTES = 32 * 1024
export const MAX_STARTER_BYTES = 128 * 1024

const TestSchema = z.object({ stage: z.number(), file: z.string(), name: z.string(), observes: z.string() })
const shared = { setup: z.array(z.string()), run: z.string(), testCommand: z.string(), tests: z.array(TestSchema) }

/*
 * StarterSchema is what Claude's reply must match, so it uses plain types only (structured outputs support nothing
 * else). Everything that makes a starter safe to write is checked afterwards, in validateStarter.
 */
export const StarterSchema = z.object({
  files: z.array(z.object({ path: z.string(), content: z.string() })),
  ...shared
}) satisfies z.ZodType<Starter>

/** The shape of .project-creator/starter.json. */
export const StarterInfoSchema = z.object({ files: z.array(z.string()), ...shared }) satisfies z.ZodType<StarterInfo>

/** npm runs these scripts during "npm install", so a starter's package.json may not define them. */
const LIFECYCLE = ['preinstall', 'install', 'postinstall', 'prepare']

// A command is shown for the user to copy. A line break in it would run the first part the moment it is pasted.
const CONTROL = /[\u0000-\u001f\u007f]/

const kb = (bytes: number): string => `${Math.round(bytes / 1024)} KB`

/**
 * Checks a starter the AI wrote against the rules for what may be written to disk and shown as a command. Returns
 * it with cleaned paths, or throws a one-line reason. A starter that breaks any rule is refused as a whole: writing
 * "the safe part" would leave a project that looks complete and is not.
 */
export function validateStarter(starter: Starter, brief: Brief): Starter {
  if (starter.files.length === 0) throw new Error('The starter has no files in it.')
  if (starter.files.length > MAX_STARTER_FILES) {
    throw new Error(`The starter has ${starter.files.length} files. The limit is ${MAX_STARTER_FILES}.`)
  }

  const files = starter.files.map((file) => ({ path: checkRelativePath(file.path, { noDotNames: true }), content: file.content }))
  let total = 0
  for (const file of files) {
    if (file.path.toLowerCase() === 'assignment.md') throw new Error('The starter tries to replace ASSIGNMENT.md.')
    if (file.content.includes('\u0000')) throw new Error(`${file.path} in the starter is not a text file.`)
    const bytes = Buffer.byteLength(file.content, 'utf8')
    if (bytes > MAX_STARTER_FILE_BYTES) {
      throw new Error(`${file.path} in the starter is ${kb(bytes)}. The limit for one file is ${kb(MAX_STARTER_FILE_BYTES)}.`)
    }
    total += bytes
  }
  if (total > MAX_STARTER_BYTES) throw new Error(`The starter is ${kb(total)} in total. The limit is ${kb(MAX_STARTER_BYTES)}.`)

  const paths = files.map((file) => file.path)
  const clash = findCollision(paths)
  if (clash) throw new Error(`The starter has two files that would land on the same name: ${clash[0]} and ${clash[1]}.`)
  // A name cannot be a file and also the folder another file sits in.
  const taken = new Set(paths.map((path) => path.toLowerCase()))
  for (const path of paths) {
    const segments = path.split('/')
    for (let depth = 1; depth < segments.length; depth++) {
      const folder = segments.slice(0, depth).join('/')
      if (taken.has(folder.toLowerCase())) throw new Error(`The starter uses ${folder} as both a file and a folder.`)
    }
  }

  for (const file of files) {
    if (file.path.split('/').pop()!.toLowerCase() !== 'package.json') continue
    let scripts: unknown
    try {
      scripts = (JSON.parse(file.content) as { scripts?: unknown }).scripts
    } catch {
      continue // Not valid JSON, so npm cannot run anything from it.
    }
    const table = scripts && typeof scripts === 'object' ? (scripts as Record<string, unknown>) : null
    const risky = table ? LIFECYCLE.find((name) => name in table) : undefined
    if (risky) throw new Error(`${file.path} in the starter has a "${risky}" script, which npm would run during install.`)
  }

  const setup = starter.setup.map((command) => command.trim()).filter((command) => command !== '')
  const run = starter.run.trim()
  const testCommand = starter.testCommand.trim()
  if (run === '') throw new Error('The starter does not say how to start the project.')
  if ([...setup, run, testCommand].some((command) => CONTROL.test(command))) {
    throw new Error('A command in the starter has a line break or control character in it.')
  }

  if (starter.tests.length > 0 && testCommand === '') throw new Error('The starter has tests but no command to run them.')
  for (const test of starter.tests) {
    if (!Number.isInteger(test.stage) || test.stage < 1 || test.stage > brief.stages.length) {
      throw new Error(`A test in the starter points at stage ${test.stage}, and the brief has ${brief.stages.length} stages.`)
    }
    if (!taken.has(test.file.toLowerCase())) throw new Error(`A test in the starter points at ${test.file}, which is not one of its files.`)
  }

  return { files, setup, run, testCommand, tests: starter.tests }
}

/** The part of a starter the app keeps once the files are on disk. */
export function starterInfo(starter: Starter): StarterInfo {
  const { files, ...rest } = starter
  return { files: files.map((file) => file.path), ...rest }
}

const block = (lines: string[]): string[] => ['```', ...lines, '```', '']

/** The "Getting started" and "Tests" sections of ASSIGNMENT.md. */
export function starterToMarkdown(info: StarterInfo, brief: Brief): string {
  const lines = [
    '## Getting started',
    '',
    'The project folder already holds starter files that run. The AI wrote them and the commands below, so read a command before you run it. Type the commands in the terminal.',
    ''
  ]
  if (info.setup.length > 0) lines.push('Set up, once:', '', ...block(info.setup))
  lines.push('Start the project:', '', ...block([info.run]))

  if (info.tests.length > 0) {
    const testFiles = [...new Set(info.tests.map((test) => test.file))]
    lines.push(
      '## Tests',
      '',
      `The tests are in ${testFiles.map((file) => `\`${file}\``).join(', ')}. They are yours: change them and add your own. Only the tests for stage 1 are switched on. Each later group is marked as skipped, with a note in the file saying how to switch it on when you reach that stage.`,
      '',
      'Run them:',
      '',
      ...block([info.testCommand]),
      'What each test looks at:',
      ''
    )
    brief.stages.forEach((stage, i) => {
      const tests = info.tests.filter((test) => test.stage === i + 1)
      if (tests.length === 0) return
      lines.push(`**Stage ${i + 1}: ${stage.title}**`, '', ...tests.map((test) => `- \`${test.name}\`: ${test.observes}`), '')
    })
  }
  return lines.join('\n')
}
