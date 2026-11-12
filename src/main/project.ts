import { app, dialog, ipcMain, BrowserWindow } from 'electron'
import { promises as fs } from 'node:fs'
import { basename, join, relative, resolve, isAbsolute, sep } from 'node:path'
import type { DirEntry, ProjectInfo } from '@shared/types'

/** Folders that are never worth showing in the tree. */
const HIDDEN = new Set(['.git', 'node_modules', '__pycache__', '.venv', '.DS_Store', 'Thumbs.db'])
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_RECENT = 8

let currentRoot: string | null = null

const recentFile = (): string => join(app.getPath('userData'), 'recent-projects.json')

async function loadRecent(): Promise<string[]> {
  try {
    const raw = await fs.readFile(recentFile(), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

async function rememberRecent(root: string): Promise<void> {
  const list = [root, ...(await loadRecent()).filter((p) => p !== root)].slice(0, MAX_RECENT)
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(recentFile(), JSON.stringify(list, null, 2), 'utf8')
}

/**
 * Every file request from the UI goes through here, so the renderer can only
 * touch files inside the folder the user opened.
 */
function insideRoot(target: string): string {
  if (!currentRoot) throw new Error('Open a project folder first.')
  const full = resolve(target)
  const rel = relative(currentRoot, full)
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Blocked access outside the project: ${target}`)
  }
  return full
}

async function setRoot(root: string): Promise<ProjectInfo> {
  const full = resolve(root)
  const stat = await fs.stat(full)
  if (!stat.isDirectory()) throw new Error(`${full} is not a folder.`)
  currentRoot = full
  await rememberRecent(full)
  return { root: full, name: basename(full) }
}

export function getCurrentRoot(): string | null {
  return currentRoot
}

export function registerProjectHandlers(): void {
  ipcMain.handle('project:openFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = { title: 'Open a project folder', properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'> }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return setRoot(result.filePaths[0])
  })

  ipcMain.handle('project:openRecent', async (_event, root: string) => {
    try {
      return await setRoot(root)
    } catch {
      const list = (await loadRecent()).filter((p) => p !== root)
      await fs.writeFile(recentFile(), JSON.stringify(list, null, 2), 'utf8')
      throw new Error(`Couldn't open ${root}. It may have been moved or deleted, so it was removed from your recent list.`)
    }
  })

  ipcMain.handle('project:recent', () => loadRecent())

  ipcMain.handle('project:close', () => {
    currentRoot = null
  })

  ipcMain.handle('fs:readDir', async (_event, dir: string): Promise<DirEntry[]> => {
    const full = insideRoot(dir)
    const entries = await fs.readdir(full, { withFileTypes: true })
    return entries
      .filter((e) => !HIDDEN.has(e.name))
      .map((e) => ({ name: e.name, path: join(full, e.name), isDir: e.isDirectory() }))
      .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) : a.isDir ? -1 : 1))
  })

  ipcMain.handle('fs:readFile', async (_event, file: string): Promise<string> => {
    const full = insideRoot(file)
    const stat = await fs.stat(full)
    if (stat.size > MAX_FILE_BYTES) {
      throw new Error(`${basename(full)} is larger than 5 MB, so it won't open in the editor.`)
    }
    const buffer = await fs.readFile(full)
    // A NUL byte in the first chunk is a good sign the file is binary.
    if (buffer.subarray(0, 8000).includes(0)) {
      throw new Error(`${basename(full)} looks like a binary file, so it won't open in the editor.`)
    }
    return buffer.toString('utf8')
  })

  ipcMain.handle('fs:writeFile', async (_event, file: string, content: string): Promise<void> => {
    const full = insideRoot(file)
    await fs.writeFile(full, content, 'utf8')
  })
}
