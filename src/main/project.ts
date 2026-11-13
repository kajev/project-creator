import { app, dialog, ipcMain, BrowserWindow } from 'electron'
import { promises as fs } from 'node:fs'
import { basename, dirname, join, relative, resolve, isAbsolute, sep } from 'node:path'
import type { Brief, CreatedProject, DirEntry, ProjectInfo, StarterInfo } from '@shared/types'
import { BriefSchema, briefToMarkdown, parseWith, slugify } from './brief'
import { checkRelativePath } from './paths'
import { starterInfo, StarterInfoSchema, StarterSchema, validateStarter } from './starter'

/** Where the app keeps its own data inside a project it created. */
const APP_DIR = '.project-creator'
const BRIEF_FILE = 'brief.json'
const STARTER_FILE = 'starter.json'
const ASSIGNMENT_FILE = 'ASSIGNMENT.md'

/** Folders that are never worth showing in the tree. */
const HIDDEN = new Set(['.git', 'node_modules', '__pycache__', '.venv', '.DS_Store', 'Thumbs.db', APP_DIR])
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

/** True when `full` is `root` itself or somewhere below it. Compares path text only. */
function contains(root: string, full: string): boolean {
  const rel = relative(root, full)
  return !(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel))
}

/**
 * Every file request from the UI goes through here, so the renderer can only
 * touch files inside the folder the user opened.
 */
async function insideRoot(target: string): Promise<string> {
  if (!currentRoot) throw new Error('Open a project folder first.')
  const blocked = new Error(`Blocked access outside the project: ${target}`)
  const full = resolve(target)
  if (!contains(currentRoot, full)) throw blocked

  // The text of the path is inside the project, but a folder link along the way could still lead out of it. So find
  // the deepest part of the path that exists and check where it really is. The walk ends at the project folder.
  let existing = full
  for (;;) {
    let real: string
    try {
      real = await fs.realpath(existing)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT' || existing === currentRoot) throw err
      existing = dirname(existing)
      continue
    }
    if (!contains(currentRoot, real)) throw blocked
    return full
  }
}

async function setRoot(root: string): Promise<ProjectInfo> {
  // The real location, with any links resolved, so insideRoot compares like with like.
  const full = await fs.realpath(resolve(root))
  const stat = await fs.stat(full)
  if (!stat.isDirectory()) throw new Error(`${full} is not a folder.`)
  currentRoot = full
  await rememberRecent(full)
  return { root: full, name: basename(full) }
}

export function getCurrentRoot(): string | null {
  return currentRoot
}

/**
 * Creates an empty file or a folder at a path the user typed, relative to the project folder. Missing folders on
 * the way are created. Returns the full path. Nothing that already exists is touched.
 */
async function createEntry(typed: unknown, kind: 'file' | 'dir'): Promise<string> {
  if (!currentRoot) throw new Error('Open a project folder first.')
  // A slash at the end is how people say "this is a folder", so it is not counted as an empty name.
  const rel = checkRelativePath(typeof typed === 'string' ? typed.trim().replace(/[\\/]+$/, '') : '')
  if (rel.split('/')[0].toLowerCase() === APP_DIR) throw new Error(`${APP_DIR} is kept for the app's own files.`)

  const full = await insideRoot(join(currentRoot, rel))
  const exists = await fs.stat(full).then(
    () => true,
    () => false
  )
  if (exists) throw new Error(`"${rel}" already exists.`)

  try {
    await fs.mkdir(kind === 'dir' ? full : dirname(full), { recursive: true })
    // "wx" fails instead of overwriting, in case the file appeared since the check above.
    if (kind === 'file') await fs.writeFile(full, '', { flag: 'wx' })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'EEXIST' || code === 'ENOTDIR') throw new Error(`"${rel}" can't be created because a file is in the way.`)
    throw err
  }
  return full
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

  ipcMain.handle('project:create', async (event, value: unknown, starterValue: unknown): Promise<CreatedProject | null> => {
    const brief = parseWith(BriefSchema, value)
    // The starter came through the UI, so it is checked again here, and before the folder picker opens: a starter
    // that may not be written is refused while nothing exists on disk yet.
    const starter = starterValue == null ? null : validateStarter(parseWith(StarterSchema, starterValue), brief)
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'Choose where to put the new project folder',
      buttonLabel: 'Create project here',
      properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'>
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null

    const dir = join(result.filePaths[0], slugify(brief.title))
    let existing: string[] = []
    try {
      existing = await fs.readdir(dir)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
    if (existing.length > 0) {
      throw new Error(`A folder named "${basename(dir)}" already exists there and is not empty. Choose another location.`)
    }

    await fs.mkdir(dir, { recursive: true })
    const project = await setRoot(dir)
    // From here on the new folder is the open project, so every write goes through insideRoot.
    const assignmentPath = await insideRoot(join(project.root, ASSIGNMENT_FILE))
    await fs.mkdir(await insideRoot(join(project.root, APP_DIR)), { recursive: true })
    await fs.writeFile(await insideRoot(join(project.root, APP_DIR, BRIEF_FILE)), JSON.stringify(brief, null, 2), 'utf8')

    const info = starter ? starterInfo(starter) : undefined
    if (starter && info) {
      for (const file of starter.files) {
        const full = await insideRoot(join(project.root, ...file.path.split('/')))
        await fs.mkdir(dirname(full), { recursive: true })
        // "wx" refuses to write over anything. The folder is new, so this only fails if something is badly wrong.
        await fs.writeFile(full, file.content, { encoding: 'utf8', flag: 'wx' })
      }
      await fs.writeFile(await insideRoot(join(project.root, APP_DIR, STARTER_FILE)), JSON.stringify(info, null, 2), 'utf8')
    }
    await fs.writeFile(assignmentPath, briefToMarkdown(brief, info), 'utf8')
    return { project, assignmentPath }
  })

  ipcMain.handle('project:starter', async (): Promise<StarterInfo | null> => {
    if (!currentRoot) return null
    try {
      const raw = await fs.readFile(await insideRoot(join(currentRoot, APP_DIR, STARTER_FILE)), 'utf8')
      return parseWith(StarterInfoSchema, JSON.parse(raw))
    } catch {
      // No starter was written for this project, or the file is unreadable. Either way there is nothing to show.
      return null
    }
  })

  ipcMain.handle('project:brief', async (): Promise<Brief | null> => {
    if (!currentRoot) return null
    try {
      const raw = await fs.readFile(await insideRoot(join(currentRoot, APP_DIR, BRIEF_FILE)), 'utf8')
      return parseWith(BriefSchema, JSON.parse(raw))
    } catch {
      // No brief here, or the file was edited into something unreadable. Either way the folder has no brief.
      return null
    }
  })

  ipcMain.handle('project:recent', () => loadRecent())

  ipcMain.handle('project:close', () => {
    currentRoot = null
  })

  ipcMain.handle('fs:readDir', async (_event, dir: string): Promise<DirEntry[]> => {
    const full = await insideRoot(dir)
    const entries = await fs.readdir(full, { withFileTypes: true })
    return entries
      .filter((e) => !HIDDEN.has(e.name))
      .map((e) => ({ name: e.name, path: join(full, e.name), isDir: e.isDirectory() }))
      .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) : a.isDir ? -1 : 1))
  })

  ipcMain.handle('fs:readFile', async (_event, file: string): Promise<string> => {
    const full = await insideRoot(file)
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
    const full = await insideRoot(file)
    await fs.writeFile(full, content, 'utf8')
  })

  ipcMain.handle('fs:createFile', (_event, path: unknown) => createEntry(path, 'file'))
  ipcMain.handle('fs:createDir', (_event, path: unknown) => createEntry(path, 'dir'))
}
