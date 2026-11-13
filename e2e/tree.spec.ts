import { expect, test } from '@playwright/test'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { closeApp, launchApp, pickFolder, shot, tempDir } from './launch'

test('new file and new folder from the file tree', async () => {
  const root = tempDir('pc-e2e-tree-')
  const { app, win } = await launchApp()
  await pickFolder(app, root)
  await win.getByRole('button', { name: 'Open a folder' }).click()
  await expect(win.locator('.tree-note')).toContainText('This folder is empty. Use New file above to get going.')

  // A new file inside a folder that does not exist yet: the folder is made, and the file opens in the editor.
  await win.getByRole('button', { name: 'New file' }).click()
  await win.getByLabel('New file name').fill('templates/index.html')
  await win.getByLabel('New file name').press('Enter')
  await expect(win.locator('.tab.active')).toContainText('index.html')
  expect(statSync(join(root, 'templates', 'index.html')).size).toBe(0)
  await expect(win.locator('.tree-name')).toHaveText(['templates'])
  await win.getByRole('treeitem', { name: 'templates' }).click()
  await expect(win.locator('.tree-name')).toHaveText(['templates', 'index.html'])

  // A new folder, typed with the slash people put on the end.
  await win.getByRole('button', { name: 'New folder' }).click()
  await win.getByLabel('New folder name').fill('static/')
  await win.getByLabel('New folder name').press('Enter')
  await expect(win.locator('.tree-name')).toHaveText(['static', 'templates'])
  expect(statSync(join(root, 'static')).isDirectory()).toBe(true)

  // A refused name says why, and the field stays open so it can be corrected.
  await win.getByRole('button', { name: 'New file' }).click()
  const field = win.getByLabel('New file name')
  const refused = [
    ['../outside.txt', 'could point outside the project'],
    ['templates/index.html', 'already exists'],
    ['CON', 'Windows reserves the name CON'],
    ['.project-creator/notes.txt', "kept for the app's own files"],
    ['templates/index.html/deeper.txt', 'a file is in the way']
  ]
  for (const [name, reason] of refused) {
    await field.fill(name)
    await field.press('Enter')
    // The app's own message box. The editor has hidden "alert" elements of its own, so the role is not enough.
    await expect(win.locator('.toast'), name).toContainText(reason)
    await expect(field).toBeVisible()
  }
  expect(existsSync(join(root, '..', 'outside.txt'))).toBe(false)
  await win.screenshot({ path: shot('tree-new-file') })

  // Escape closes the field without creating anything.
  await field.fill('never-made.txt')
  await field.press('Escape')
  await expect(field).toHaveCount(0)
  expect(existsSync(join(root, 'never-made.txt'))).toBe(false)

  await closeApp(app, win)
})
