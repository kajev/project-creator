import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FAKE_BRIEF } from './fake-anthropic'
import { launchApp, pickFolder, tempDir } from './launch'

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
