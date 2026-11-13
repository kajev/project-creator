import { expect, test } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { FAKE_BRIEF } from './fake-anthropic'
import { closeApp, launchApp, pickFolder, shot, tempDir } from './launch'

test('ticking "done when" items is saved with the project, and the current stage moves on', async () => {
  const { app, win } = await launchApp()
  const parent = tempDir('pc-e2e-projects-')
  await pickFolder(app, parent)
  const created = await win.evaluate((brief) => window.api.project.create(brief), FAKE_BRIEF)
  const root = created!.project.root
  const progressFile = join(root, '.project-creator', 'progress.json')
  const saved = (): unknown => JSON.parse(readFileSync(progressFile, 'utf8'))

  // Open it through the UI, so the Guide panel is on screen.
  await pickFolder(app, root)
  const open = async (): Promise<void> => {
    await win.getByRole('button', { name: 'Open a folder' }).click()
    await expect(win.locator('.app-project')).toHaveText('task-tracker-cli')
  }
  await open()

  const guide = win.getByRole('region', { name: 'Guide' })
  const stages = guide.locator('.brief-stages > li')
  const box = (text: string) => guide.getByLabel(text, { exact: true })
  const [first, second] = FAKE_BRIEF.stages

  // Nothing is ticked, so the first stage is the one to work on.
  await expect(guide.getByRole('checkbox', { checked: true })).toHaveCount(0)
  await expect(stages.nth(0)).toHaveAttribute('aria-current', 'step')
  await expect(guide.locator('[aria-current]')).toHaveCount(1)

  // Ticking everything in stage 1 makes stage 2 current, and the ticks are on disk.
  await box(first.doneWhen[0]).check()
  await expect(stages.nth(1)).toHaveAttribute('aria-current', 'step')
  await expect(stages.nth(0)).not.toHaveAttribute('aria-current', 'step')
  await expect.poll(saved).toEqual([[true], [false, false], [false], [false], [false, false], [false]])

  // One of stage 2's two items: still the current stage.
  await box(second.doneWhen[1]).check()
  await expect(stages.nth(1)).toHaveAttribute('aria-current', 'step')
  await expect.poll(saved).toEqual([[true], [false, true], [false], [false], [false, false], [false]])
  await win.screenshot({ path: shot('guide-ticked') })

  // Close and reopen: the ticks are still there.
  await win.getByRole('button', { name: 'Close project' }).click()
  await open()
  await expect(box(first.doneWhen[0])).toBeChecked()
  await expect(box(second.doneWhen[1])).toBeChecked()
  await expect(box(second.doneWhen[0])).not.toBeChecked()
  await expect(guide.getByRole('checkbox', { checked: true })).toHaveCount(2)
  await expect(stages.nth(1)).toHaveAttribute('aria-current', 'step')

  // Unticking goes back.
  await box(first.doneWhen[0]).uncheck()
  await expect(stages.nth(0)).toHaveAttribute('aria-current', 'step')
  await expect.poll(saved).toEqual([[false], [false, true], [false], [false], [false, false], [false]])

  // A ticks file that is not readable does not stop the project opening. Nothing is ticked.
  await win.getByRole('button', { name: 'Close project' }).click()
  writeFileSync(progressFile, '{"not": "a list"')
  await open()
  await expect(guide.getByRole('checkbox', { checked: true })).toHaveCount(0)
  await expect(stages.nth(0)).toHaveAttribute('aria-current', 'step')

  await closeApp(app, win)
})
