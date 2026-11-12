import { app, safeStorage } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

/**
 * The user's Claude API key, encrypted by the operating system (DPAPI on
 * Windows) and kept in the app's own settings folder. The key comes in from
 * the UI once and is never sent back to it.
 */
const keyFile = (): string => join(app.getPath('userData'), 'api-key.bin')

export async function hasKey(): Promise<boolean> {
  try {
    await fs.access(keyFile())
    return true
  } catch {
    return false
  }
}

export async function setKey(key: string): Promise<void> {
  const trimmed = typeof key === 'string' ? key.trim() : ''
  if (!trimmed) throw new Error('Paste your Claude API key first.')
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("This computer can't encrypt the key, so it was not saved.")
  }
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(keyFile(), safeStorage.encryptString(trimmed))
}

export async function clearKey(): Promise<void> {
  await fs.rm(keyFile(), { force: true })
}

/** For the main process only. Never expose this over IPC. */
export async function getKey(): Promise<string | null> {
  try {
    return safeStorage.decryptString(await fs.readFile(keyFile()))
  } catch {
    return null
  }
}
