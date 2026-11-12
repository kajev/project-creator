import { expect, test } from '@playwright/test'
import { launchApp, shot } from './launch'

test('the built app opens on the Welcome screen', async () => {
  const { app, win } = await launchApp()
  await expect(win.locator('.welcome-title')).toHaveText('Project Creator')
  await win.screenshot({ path: shot('smoke-welcome') })
  await app.close()
})
