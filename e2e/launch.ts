import { _electron as electron, expect, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** A fresh temp folder, used for app settings and for fixture projects. */
export function tempDir(prefix = 'pc-e2e-'): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

/**
 * Starts the built app. Every launch gets its own settings folder unless one
 * is passed in, so tests never read or write the real one.
 */
export async function launchApp(options: { userData?: string; env?: Record<string, string> } = {}): Promise<{
  app: ElectronApplication
  win: Page
  userData: string
}> {
  const userData = options.userData ?? tempDir()
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${userData}`],
    env: { ...(process.env as Record<string, string>), ...options.env }
  })
  const win = await app.firstWindow()
  return { app, win, userData }
}

/**
 * Closes the app. Use this instead of app.close() in any test that opens a project.
 *
 * Quitting while a project's shell is still starting can hang the app (a bug in the terminal code that predates
 * these tests, listed in the README's known gaps). So when a terminal is on screen, wait until the shell has printed
 * something before closing.
 */
export async function closeApp(app: ElectronApplication, win: Page): Promise<void> {
  if ((await win.locator('.terminal-host').count()) > 0) {
    await expect(win.locator('.terminal-host .xterm-rows')).toHaveText(/\S/, { timeout: 30_000 })
  }
  await app.close()
}

/** Makes the native folder picker answer with `dir` instead of opening a dialog. */
export async function pickFolder(app: ElectronApplication, dir: string): Promise<void> {
  await app.evaluate(({ dialog }, chosen) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [chosen] })
  }, dir)
}

/** Screenshots land in test-results/screens so they can be looked at after a run. */
export const shot = (name: string): string => join('test-results', 'screens', `${name}.png`)
