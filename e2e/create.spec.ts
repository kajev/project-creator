import { expect, test } from '@playwright/test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FAKE_BRIEF, FAKE_STARTER } from './fake-anthropic'
import { launchApp, pickFolder, tempDir } from './launch'

test('creating a project with a starter writes its files, and says how to run them', async () => {
  const { app, win } = await launchApp()
  const parent = tempDir('pc-e2e-projects-')
  await pickFolder(app, parent)

  const created = await win.evaluate(([brief, starter]) => window.api.project.create(brief, starter), [FAKE_BRIEF, FAKE_STARTER] as const)
  const root = join(parent, 'task-tracker-cli')
  expect(created?.project.root).toBe(root)

  // Every starter file is on disk, in its folder, with the content the AI wrote.
  for (const file of FAKE_STARTER.files) expect(readFileSync(join(root, file.path), 'utf8'), file.path).toBe(file.content)

  // The app keeps the commands and test descriptions, not the file contents.
  const info = { ...FAKE_STARTER, files: FAKE_STARTER.files.map((file) => file.path) }
  expect(JSON.parse(readFileSync(join(root, '.project-creator', 'starter.json'), 'utf8'))).toEqual(info)
  expect(await win.evaluate(() => window.api.project.starter())).toEqual(info)

  // The assignment explains the starter between the example and the stages.
  const assignment = readFileSync(join(root, 'ASSIGNMENT.md'), 'utf8')
  expect(assignment).toContain('## Getting started')
  expect(assignment).toContain('python -m venv .venv')
  expect(assignment).toContain('python task.py')
  expect(assignment).toContain('## Tests')
  expect(assignment).toContain('python -m unittest discover tests')
  expect(assignment).toContain('- `test_usage_line`: Running the program with no arguments prints a line that starts with "usage".')
  expect(assignment.indexOf('## Tests')).toBeLessThan(assignment.indexOf('## Stages'))

  // The tree shows the starter next to the assignment.
  const names = await win.evaluate((dir) => window.api.fs.readDir(dir).then((list) => list.map((e) => e.name)), root)
  expect([...names].sort()).toEqual(['.gitignore', 'ASSIGNMENT.md', 'task.py', 'tests'])

  await app.close()
})

// A starter that breaks a rule is refused as a whole, before anything is written.
const REFUSED_STARTERS = [
  {
    how: 'a path that leaves the project',
    starter: { ...FAKE_STARTER, files: [...FAKE_STARTER.files, { path: '../evil.py', content: 'print("outside")\n' }] },
    expected: `"../evil.py" can't be used`
  },
  {
    how: 'more files than the limit',
    starter: { ...FAKE_STARTER, files: Array.from({ length: 16 }, (_, i) => ({ path: `file${i}.py`, content: '' })), tests: [] },
    expected: 'The starter has 16 files. The limit is 15.'
  },
  {
    how: 'a settings folder that tools run things from',
    starter: { ...FAKE_STARTER, files: [...FAKE_STARTER.files, { path: '.vscode/settings.json', content: '{}' }] },
    expected: 'names that start with a dot are not allowed here'
  },
  { how: 'the wrong shape', starter: { files: 'not a list' }, expected: '' }
]
for (const { how, starter, expected } of REFUSED_STARTERS) {
  test(`a starter with ${how} is refused and leaves nothing on disk`, async () => {
    const { app, win } = await launchApp()
    const parent = tempDir('pc-e2e-projects-')
    await pickFolder(app, parent)

    const error = await win.evaluate(
      ([brief, bad]) => window.api.project.create(brief, bad as never).then(() => 'created', (e: Error) => e.message),
      [FAKE_BRIEF, starter] as const
    )
    expect(error).not.toBe('created')
    expect(error).toContain(expected)
    // No project folder, and nothing beside where it would have been.
    expect(readdirSync(parent)).toEqual([])
    expect(await win.evaluate(() => window.api.project.brief())).toBeNull()

    await app.close()
  })
}

test('creating a project writes the brief into a new folder and opens it', async () => {
  const { app, win } = await launchApp()
  const parent = tempDir('pc-e2e-projects-')
  await pickFolder(app, parent)

  const created = await win.evaluate((brief) => window.api.project.create(brief), FAKE_BRIEF)
  const root = join(parent, 'task-tracker-cli')
  expect(created).toEqual({ project: { root, name: 'task-tracker-cli' }, assignmentPath: join(root, 'ASSIGNMENT.md') })

  // Both files are on disk with the right content.
  const assignment = readFileSync(join(root, 'ASSIGNMENT.md'), 'utf8')
  expect(assignment).toContain('# Task Tracker CLI')
  for (const stage of FAKE_BRIEF.stages) expect(assignment).toContain(stage.title)
  expect(JSON.parse(readFileSync(join(root, '.project-creator', 'brief.json'), 'utf8'))).toEqual(FAKE_BRIEF)

  // The new folder is the open project: the tree shows the assignment and hides the app's own folder.
  const names = await win.evaluate((dir) => window.api.fs.readDir(dir).then((list) => list.map((e) => e.name)), root)
  expect(names).toEqual(['ASSIGNMENT.md'])
  expect(await win.evaluate(() => window.api.project.brief())).toEqual(FAKE_BRIEF)
  expect(await win.evaluate(() => window.api.project.recent())).toEqual([root])
  // Made without a starter, so there is none to show and the assignment does not mention one.
  expect(await win.evaluate(() => window.api.project.starter())).toBeNull()
  expect(assignment).not.toContain('Getting started')

  // A second project with the same title in the same place is refused, and nothing is overwritten.
  const error = await win.evaluate((brief) => window.api.project.create(brief).then(() => null, (e: Error) => e.message), {
    ...FAKE_BRIEF,
    summary: 'A different summary.'
  })
  expect(error).toContain('already exists there and is not empty')
  expect(readFileSync(join(root, 'ASSIGNMENT.md'), 'utf8')).toBe(assignment)

  await app.close()
})

test('cancelling the folder picker creates nothing', async () => {
  const { app, win } = await launchApp()
  await app.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] })
  })
  expect(await win.evaluate((brief) => window.api.project.create(brief), FAKE_BRIEF)).toBeNull()
  expect(await win.evaluate(() => window.api.project.brief())).toBeNull()
  await app.close()
})

test('a folder without a brief, or with a broken one, has no brief', async () => {
  const { app, win } = await launchApp()
  const plain = tempDir('pc-e2e-plain-')
  await win.evaluate((dir) => window.api.project.openRecent(dir), plain)
  expect(await win.evaluate(() => window.api.project.brief())).toBeNull()

  // A brief.json that is not a brief is treated the same way.
  const parent = tempDir('pc-e2e-projects-')
  await pickFolder(app, parent)
  const created = await win.evaluate((brief) => window.api.project.create(brief), FAKE_BRIEF)
  const briefFile = join(created!.project.root, '.project-creator', 'brief.json')
  expect(existsSync(briefFile)).toBe(true)
  await win.evaluate((file) => window.api.fs.writeFile(file, '{"title": 42}'), briefFile)
  expect(await win.evaluate(() => window.api.project.brief())).toBeNull()

  await app.close()
})

test('a brief with the wrong shape is refused before any folder is created', async () => {
  const { app, win } = await launchApp()
  const parent = tempDir('pc-e2e-projects-')
  await pickFolder(app, parent)
  const error = await win.evaluate(
    (brief) => window.api.project.create(brief as never).then(() => null, (e: Error) => e.message),
    { title: 'No stages here' }
  )
  expect(error).not.toBeNull()
  expect(existsSync(join(parent, 'no-stages-here'))).toBe(false)
  await app.close()
})
