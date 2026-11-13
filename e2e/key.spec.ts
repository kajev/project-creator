import { expect, test } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { launchApp, tempDir } from './launch'

// Not a real key. It only has to be a string we can look for on disk.
const FAKE_KEY = 'sk-ant-e2e-not-a-real-key-0123456789'

test('the API key is stored encrypted, survives a restart, and is never readable from the UI', async () => {
  const first = await launchApp()
  expect(await first.win.evaluate(() => window.api.ai.hasKey())).toBe(false)

  await first.win.evaluate((key) => window.api.ai.setKey(key), FAKE_KEY)
  expect(await first.win.evaluate(() => window.api.ai.hasKey())).toBe(true)

  // The bridge offers no way to read the key back.
  expect(await first.win.evaluate(() => Object.keys(window.api.ai).sort())).toEqual([
    'clearKey',
    'hasKey',
    'proposeProjects',
    'setKey',
    'writeBrief',
    'writeStarter'
  ])
  await first.app.close()

  // On disk it is encrypted: the key text does not appear in the file.
  const stored = readFileSync(join(first.userData, 'api-key.bin'))
  expect(stored.length).toBeGreaterThan(0)
  expect(stored.includes(Buffer.from(FAKE_KEY))).toBe(false)

  // A second launch with the same settings folder still has it.
  const second = await launchApp({ userData: first.userData })
  expect(await second.win.evaluate(() => window.api.ai.hasKey())).toBe(true)

  await second.win.evaluate(() => window.api.ai.clearKey())
  expect(await second.win.evaluate(() => window.api.ai.hasKey())).toBe(false)
  await second.app.close()
})

test('a key with characters that cannot be sent is refused with a message that says what to do', async () => {
  const { app, win } = await launchApp()
  // A zero-width space, a curly quote, and a space in the middle: all easy to pick up when copying.
  for (const bad of ['sk-ant-e2e​key', '“sk-ant-e2e-key”', 'sk-ant e2e-key']) {
    const error = await win.evaluate((key) => window.api.ai.setKey(key).then(() => null, (e: Error) => e.message), bad)
    expect(error).toContain("That doesn't look like an API key.")
  }
  expect(await win.evaluate(() => window.api.ai.hasKey())).toBe(false)
  await app.close()
})

test('a key file that can no longer be decrypted counts as no key', async () => {
  const userData = tempDir()
  writeFileSync(join(userData, 'api-key.bin'), 'this is not something safeStorage wrote')
  const { app, win } = await launchApp({ userData })
  expect(await win.evaluate(() => window.api.ai.hasKey())).toBe(false)

  // Saving a key again repairs it.
  await win.evaluate((key) => window.api.ai.setKey(key), FAKE_KEY)
  expect(await win.evaluate(() => window.api.ai.hasKey())).toBe(true)
  await app.close()
})

test('an empty key is refused', async () => {
  const { app, win } = await launchApp()
  const error = await win.evaluate(() => window.api.ai.setKey('   ').then(() => null, (e: Error) => e.message))
  expect(error).toContain('Paste your Claude API key first.')
  expect(await win.evaluate(() => window.api.ai.hasKey())).toBe(false)
  await app.close()
})
