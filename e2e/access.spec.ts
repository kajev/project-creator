import { expect, test } from '@playwright/test'
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { launchApp, tempDir } from './launch'

test('a folder link that leads out of the project cannot be read, listed or written through', async () => {
  const root = tempDir('pc-e2e-root-')
  const outside = tempDir('pc-e2e-outside-')
  writeFileSync(join(outside, 'secret.txt'), 'outside the project')
  // A junction needs no special rights on Windows. On macOS and Linux this is an ordinary symlink.
  symlinkSync(outside, join(root, 'link'), 'junction')
  mkdirSync(join(root, 'real'))
  writeFileSync(join(root, 'real', 'inside.txt'), 'inside the project')

  const { app, win } = await launchApp()
  await win.evaluate((dir) => window.api.project.openRecent(dir), root)

  // Through the link: refused, even though the path text sits inside the project.
  const read = await win.evaluate((file) => window.api.fs.readFile(file).then(() => null, (e: Error) => e.message), join(root, 'link', 'secret.txt'))
  expect(read).toContain('Blocked access outside the project')
  const list = await win.evaluate((dir) => window.api.fs.readDir(dir).then(() => null, (e: Error) => e.message), join(root, 'link'))
  expect(list).toContain('Blocked access outside the project')
  const write = await win.evaluate(
    (file) => window.api.fs.writeFile(file, 'changed').then(() => null, (e: Error) => e.message),
    join(root, 'link', 'secret.txt')
  )
  expect(write).toContain('Blocked access outside the project')
  // A file that does not exist yet, below the link, is refused too.
  const create = await win.evaluate(
    (file) => window.api.fs.writeFile(file, 'new').then(() => null, (e: Error) => e.message),
    join(root, 'link', 'new.txt')
  )
  expect(create).toContain('Blocked access outside the project')
  expect(readFileSync(join(outside, 'secret.txt'), 'utf8')).toBe('outside the project')

  // Ordinary folders still work.
  expect(await win.evaluate((file) => window.api.fs.readFile(file), join(root, 'real', 'inside.txt'))).toBe('inside the project')

  await app.close()
})
