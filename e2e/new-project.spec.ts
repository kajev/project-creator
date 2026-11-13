import { expect, test } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BAD_KEY, FAKE_BRIEF, FAKE_PROPOSALS, FAKE_STARTER, GOOD_KEY, STARTER_UNSAFE, startFakeAnthropic } from './fake-anthropic'
import { closeApp, launchApp, pickFolder, shot, tempDir } from './launch'

const INTERESTS = 'command-line tools I would use myself'

test('start a new project: key, questions, three ideas, pick one, land in the project', async () => {
  const fake = await startFakeAnthropic()
  const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })
  const parent = tempDir('pc-e2e-projects-')
  await pickFolder(app, parent)

  await win.getByRole('button', { name: 'Start a new project' }).click()

  // First time: the key is asked for before anything else.
  await win.getByLabel('Claude API key').fill(GOOD_KEY)
  await win.screenshot({ path: shot('new-project-1-key') })
  await win.getByRole('button', { name: 'Save key' }).click()

  await win.getByLabel('What do you want to build or learn?').fill(INTERESTS)
  await win.getByLabel('Your experience').selectOption('new')
  await win.getByLabel('Hours you have for the whole project').fill('6')
  // Starter files and tests are both on unless you turn them off.
  await expect(win.getByLabel('Starter files that already run')).toBeChecked()
  await expect(win.getByLabel('Tests you can run and add to')).toBeChecked()
  await win.screenshot({ path: shot('new-project-2-questions') })
  await win.getByRole('button', { name: 'Suggest three projects' }).click()

  await expect(win.locator('.proposal')).toHaveCount(3)
  await expect(win.locator('.proposal-title')).toHaveText(FAKE_PROPOSALS.map((p) => p.title))
  await win.screenshot({ path: shot('new-project-3-ideas') })
  await win.locator('.proposal').first().getByRole('button', { name: 'Build this one' }).click()

  // The project opens with the assignment in the editor.
  await expect(win.locator('.app-project')).toHaveText('task-tracker-cli')
  await expect(win.locator('.tab.active')).toContainText('ASSIGNMENT.md')
  await expect(win.locator('.monaco-editor .view-lines')).toContainText('Tracker')
  // The starter files are in the tree next to the assignment, and on disk.
  await expect(win.locator('.tree-name')).toHaveText(['tests', '.gitignore', 'ASSIGNMENT.md', 'task.py'])
  expect(readFileSync(join(parent, 'task-tracker-cli', 'task.py'), 'utf8')).toBe(FAKE_STARTER.files[0].content)
  // Each stage in the assignment carries its reasoning, and the assignment says how to run the starter.
  const assignment = readFileSync(join(parent, 'task-tracker-cli', 'ASSIGNMENT.md'), 'utf8')
  expect(assignment).toContain(`**Why this stage:** ${FAKE_BRIEF.stages[0].why}`)
  expect(assignment).toContain('## Getting started')
  expect(assignment).toContain('## Tests')

  // Long lines wrap to the editor's width instead of running off to the right.
  const widestLine = await win
    .locator('.monaco-editor .view-line > span')
    .evaluateAll((spans) => Math.max(...spans.map((span) => span.getBoundingClientRect().width)))
  const editorWidth = await win.locator('.monaco-editor').first().evaluate((el) => el.getBoundingClientRect().width)
  expect(widestLine).toBeGreaterThan(0)
  expect(widestLine).toBeLessThanOrEqual(editorWidth)

  // The Guide panel shows the same brief.
  const guide = win.getByRole('region', { name: 'Guide' })
  await expect(guide.locator('.brief-title')).toHaveText(FAKE_BRIEF.title)
  await expect(guide.locator('.brief-list li')).toHaveText(FAKE_BRIEF.requirements)
  await expect(guide.locator('.brief-example')).toContainText('Added task 1')
  await expect(guide.locator('.stage-name')).toHaveText(FAKE_BRIEF.stages.map((s) => s.title))
  await expect(guide.locator('.stage-why')).toHaveText(FAKE_BRIEF.stages.map((s) => `Why this stage: ${s.why}`))

  // It also says how to set up, start and test the starter, and what each test looks at, under its stage.
  await expect(guide.locator('.command code')).toHaveText([...FAKE_STARTER.setup, FAKE_STARTER.run, FAKE_STARTER.testCommand])
  await expect(guide.locator('.brief-stages > li').nth(0).locator('.stage-tests li')).toHaveText([
    `${FAKE_STARTER.tests[0].name} ${FAKE_STARTER.tests[0].observes}`
  ])
  await expect(guide.locator('.brief-stages > li').nth(1).locator('.stage-tests li')).toHaveText([
    `${FAKE_STARTER.tests[1].name} ${FAKE_STARTER.tests[1].observes}`
  ])
  await expect(guide.locator('.brief-stages > li').nth(2).locator('.stage-tests')).toHaveCount(0)

  // Copy hands the command to the clipboard and says so. The app never runs it. The clipboard call is replaced
  // here, so running the tests does not wipe whatever you had copied.
  expect(await win.evaluate(() => window.isSecureContext && typeof navigator.clipboard.writeText === 'function')).toBe(true)
  await win.evaluate(() => {
    const copied: string[] = []
    ;(window as unknown as { copied: string[] }).copied = copied
    navigator.clipboard.writeText = async (text: string) => void copied.push(text)
  })
  await guide.getByRole('button', { name: `Copy: ${FAKE_STARTER.run}` }).click()
  await expect(guide.getByRole('button', { name: `Copy: ${FAKE_STARTER.run}` })).toHaveText('Copied')
  expect(await win.evaluate(() => (window as unknown as { copied: string[] }).copied)).toEqual([FAKE_STARTER.run])
  await expect(guide.locator('.stage-done li')).toHaveText(FAKE_BRIEF.stages.flatMap((s) => s.doneWhen))
  await win.screenshot({ path: shot('new-project-4-opened') })

  // The Tutor tab is honest about not existing yet.
  await guide.getByRole('tab', { name: 'Tutor' }).click()
  await expect(guide).toContainText('The tutor is not built yet.')

  // A plain folder has no brief, and the panel says so instead of showing the last one.
  await pickFolder(app, tempDir('pc-e2e-plain-'))
  await win.getByRole('button', { name: 'Open folder' }).click()
  await guide.getByRole('tab', { name: 'Brief' }).click()
  await expect(guide).toContainText('This folder has no brief.')
  await expect(guide.locator('.brief-title')).toHaveCount(0)
  await win.screenshot({ path: shot('guide-no-brief') })

  // The answers reached Claude as typed.
  const sent = JSON.stringify(fake.requests[0].body.messages)
  expect(sent).toContain(INTERESTS)
  expect(sent).toContain('new to programming')
  expect(sent).toContain('6 hours')
  // Three requests: the ideas, the brief written for a project that has a starter, and the starter with tests.
  expect(fake.requests).toHaveLength(3)
  expect(fake.requests[1].body.system).toContain('starter files that already run')
  expect(JSON.stringify(fake.requests[2].body.messages)).toContain('Tests: yes')

  await closeApp(app, win)
  await fake.close()
})

test('with a key already stored, the key step is skipped; cancelling the folder picker keeps the brief', async () => {
  const fake = await startFakeAnthropic()
  const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })
  await win.evaluate((key) => window.api.ai.setKey(key), GOOD_KEY)
  await app.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] })
  })

  await win.getByRole('button', { name: 'Start a new project' }).click()
  await expect(win.getByLabel('Claude API key')).toHaveCount(0)
  await win.getByLabel('What do you want to build or learn?').fill(INTERESTS)
  // Starter files off. Tests need them, so that switch goes off and locks with it.
  await win.getByLabel('Starter files that already run').uncheck()
  await expect(win.getByLabel('Tests you can run and add to')).not.toBeChecked()
  await expect(win.getByLabel('Tests you can run and add to')).toBeDisabled()
  await win.getByRole('button', { name: 'Suggest three projects' }).click()
  await win.locator('.proposal').nth(0).getByRole('button', { name: 'Build this one' }).click()

  // The picker was cancelled, so the brief waits here instead of being lost.
  await expect(win.getByRole('button', { name: 'Choose a folder' })).toBeVisible()
  await win.screenshot({ path: shot('new-project-5-choose-folder') })
  // Two requests only: no starter was asked for, and the brief was written as for an empty folder.
  expect(fake.requests).toHaveLength(2)
  expect(fake.requests[1].body.system).not.toContain('starter files that already run')

  // Choosing a folder now creates the project without asking Claude again.
  const parent = tempDir('pc-e2e-projects-')
  await pickFolder(app, parent)
  await win.getByRole('button', { name: 'Choose a folder' }).click()
  await expect(win.locator('.app-project')).toHaveText('task-tracker-cli')
  expect(fake.requests).toHaveLength(2)
  await expect(win.locator('.tree-name')).toHaveText(['ASSIGNMENT.md'])
  expect(readFileSync(join(parent, 'task-tracker-cli', 'ASSIGNMENT.md'), 'utf8')).not.toContain('Getting started')

  await closeApp(app, win)
  await fake.close()
})

test('a starter that is refused keeps the brief: try again, or continue without it', async () => {
  const fake = await startFakeAnthropic()
  const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })
  await win.evaluate((key) => window.api.ai.setKey(key), GOOD_KEY)
  const parent = tempDir('pc-e2e-projects-')
  await pickFolder(app, parent)

  await win.getByRole('button', { name: 'Start a new project' }).click()
  // The marker makes the canned starter carry a file path that leaves the project.
  await win.getByLabel('What do you want to build or learn?').fill(`${INTERESTS} ${STARTER_UNSAFE}`)
  await win.getByRole('button', { name: 'Suggest three projects' }).click()
  await win.locator('.proposal').first().getByRole('button', { name: 'Build this one' }).click()

  // The reason is shown, nothing was created, and the brief is still here.
  await expect(win.locator('.toast')).toContainText(`"../evil.py" can't be used`)
  await expect(win.getByText('its starter files could not be written')).toBeVisible()
  await win.screenshot({ path: shot('new-project-7-starter-refused') })
  expect(readdirSync(parent)).toEqual([])
  expect(fake.requests).toHaveLength(3)

  // Trying again asks for the starter only. The brief is not written a second time.
  await win.getByRole('button', { name: 'Try the starter files again' }).click()
  await expect.poll(() => fake.requests.length).toBe(4)
  expect(JSON.stringify(fake.requests[3].body.output_config)).toContain('testCommand')
  await expect(win.getByRole('button', { name: 'Continue without starter files' })).toBeEnabled()
  expect(readdirSync(parent)).toEqual([])

  // Continuing writes the brief once more, this time for an empty folder: the one on hand has no setup stage and
  // tells the learner to change a starter that will not be there.
  await win.getByRole('button', { name: 'Continue without starter files' }).click()
  await expect(win.locator('.app-project')).toHaveText('task-tracker-cli')
  await expect(win.locator('.tree-name')).toHaveText(['ASSIGNMENT.md'])
  expect(fake.requests).toHaveLength(5)
  expect(fake.requests[1].body.system).toContain('starter files that already run')
  expect(JSON.stringify(fake.requests[4].body.output_config)).not.toContain('testCommand')
  expect(fake.requests[4].body.system).not.toContain('starter files that already run')
  expect(JSON.stringify(fake.requests[4].body.messages)).toContain(FAKE_PROPOSALS[0].title)

  await closeApp(app, win)
  await fake.close()
})

test('leaving the screen while Claude is still writing stops the flow there', async () => {
  const fake = await startFakeAnthropic({ delayMs: 1500 })
  const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })
  await win.evaluate((key) => window.api.ai.setKey(key), GOOD_KEY)
  // Count how often the folder picker is asked for.
  await app.evaluate(({ dialog }) => {
    const state = globalThis as unknown as { pickerCalls: number }
    state.pickerCalls = 0
    dialog.showOpenDialog = async () => {
      state.pickerCalls++
      return { canceled: true, filePaths: [] }
    }
  })

  await win.getByRole('button', { name: 'Start a new project' }).click()
  await win.getByLabel('What do you want to build or learn?').fill(INTERESTS)
  await win.getByRole('button', { name: 'Suggest three projects' }).click()
  await win.locator('.proposal').first().getByRole('button', { name: 'Build this one' }).click()
  await expect(win.getByRole('status')).toContainText('Writing the brief')

  // Leave while the brief is still on its way.
  await win.getByRole('button', { name: 'Back to start' }).click()
  await expect(win.locator('.welcome-title')).toBeVisible()

  // The brief arrives after that. Nothing may happen: no folder picker, no error, still on Welcome.
  await expect.poll(() => fake.served, { timeout: 10_000 }).toBe(2)
  await win.waitForTimeout(500)
  expect(await app.evaluate(() => (globalThis as unknown as { pickerCalls: number }).pickerCalls)).toBe(0)
  await expect(win.locator('.welcome-title')).toBeVisible()
  await expect(win.getByRole('alert')).toHaveCount(0)

  await closeApp(app, win)
  await fake.close()
})

test('a rejected key shows the reason and asks for the key again', async () => {
  const fake = await startFakeAnthropic()
  const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })

  await win.getByRole('button', { name: 'Start a new project' }).click()
  await win.getByLabel('Claude API key').fill(BAD_KEY)
  await win.getByRole('button', { name: 'Save key' }).click()
  await win.getByLabel('What do you want to build or learn?').fill(INTERESTS)
  await win.getByRole('button', { name: 'Suggest three projects' }).click()

  await expect(win.getByRole('alert')).toContainText('Claude rejected that API key')
  await expect(win.getByLabel('Claude API key')).toBeVisible()
  await win.screenshot({ path: shot('new-project-6-rejected-key') })

  // "Back to start" returns to the Welcome screen.
  await win.getByRole('button', { name: 'Back to start' }).click()
  await expect(win.locator('.welcome-title')).toHaveText('Project Creator')

  await closeApp(app, win)
  await fake.close()
})
