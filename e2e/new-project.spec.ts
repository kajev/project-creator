import { expect, test } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { BAD_KEY, FAKE_BRIEF, FAKE_PROPOSALS, GOOD_KEY, startFakeAnthropic } from './fake-anthropic'
import { launchApp, pickFolder, shot, tempDir } from './launch'

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
  await expect(win.locator('.tree-name')).toHaveText(['ASSIGNMENT.md'])
  expect(existsSync(join(parent, 'task-tracker-cli', 'ASSIGNMENT.md'))).toBe(true)

  // The Guide panel shows the same brief.
  const guide = win.getByRole('region', { name: 'Guide' })
  await expect(guide.locator('.brief-title')).toHaveText(FAKE_BRIEF.title)
  await expect(guide.locator('.brief-list li')).toHaveText(FAKE_BRIEF.requirements)
  await expect(guide.locator('.brief-example')).toContainText('Added task 1')
  await expect(guide.locator('.stage-name')).toHaveText(FAKE_BRIEF.stages.map((s) => s.title))
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

  await app.close()
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
  await win.getByRole('button', { name: 'Suggest three projects' }).click()
  await win.locator('.proposal').nth(0).getByRole('button', { name: 'Build this one' }).click()

  // The picker was cancelled, so the brief waits here instead of being lost.
  await expect(win.getByRole('button', { name: 'Choose a folder' })).toBeVisible()
  await win.screenshot({ path: shot('new-project-5-choose-folder') })
  expect(fake.requests).toHaveLength(2)

  // Choosing a folder now creates the project without asking Claude again.
  const parent = tempDir('pc-e2e-projects-')
  await pickFolder(app, parent)
  await win.getByRole('button', { name: 'Choose a folder' }).click()
  await expect(win.locator('.app-project')).toHaveText('task-tracker-cli')
  expect(fake.requests).toHaveLength(2)

  await app.close()
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

  await app.close()
  await fake.close()
})
