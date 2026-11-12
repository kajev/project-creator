import { ipcMain, type WebContents } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { relative, isAbsolute } from 'node:path'
import type * as NodePty from 'node-pty'
import type { TerminalSession } from '@shared/types'
import { getCurrentRoot } from './project'

/**
 * node-pty gives us a real terminal (colours, prompts, Ctrl+C, interactive
 * CLIs). It ships prebuilt binaries for Windows and macOS, but if it fails to
 * load we fall back to a plain child process so the app still works.
 */
const requireNative = createRequire(__filename)
let pty: typeof NodePty | null = null
let ptyLoadError: string | null = null
try {
  pty = requireNative('node-pty') as typeof NodePty
} catch (err) {
  ptyLoadError = err instanceof Error ? err.message : String(err)
}

interface Session {
  owner: WebContents
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
}

const sessions = new Map<number, Session>()
let nextId = 1

function defaultShell(): { file: string; args: string[] } {
  if (process.platform === 'win32') return { file: 'powershell.exe', args: ['-NoLogo'] }
  return { file: process.env.SHELL || '/bin/bash', args: ['-l'] }
}

function send(owner: WebContents, channel: string, ...args: unknown[]): void {
  if (!owner.isDestroyed()) owner.send(channel, ...args)
}

function startPty(id: number, owner: WebContents, cwd: string, cols: number, rows: number): Session {
  const { file, args } = defaultShell()
  const proc = pty!.spawn(file, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: { ...process.env, TERM_PROGRAM: 'project-creator' } as Record<string, string>
  })
  proc.onData((data) => send(owner, 'terminal:data', id, data))
  proc.onExit(({ exitCode }) => {
    sessions.delete(id)
    send(owner, 'terminal:exit', id, exitCode)
  })
  return {
    owner,
    write: (data) => proc.write(data),
    resize: (c, r) => {
      try {
        proc.resize(Math.max(c, 2), Math.max(r, 2))
      } catch {
        // Resizing a pty that just exited throws; nothing to do.
      }
    },
    kill: () => proc.kill()
  }
}

function startBasic(id: number, owner: WebContents, cwd: string): Session {
  const { file } = defaultShell()
  const args = process.platform === 'win32' ? ['-NoLogo', '-NoExit', '-Command', '-'] : ['-i']
  const proc: ChildProcessWithoutNullStreams = spawn(file, args, { cwd, env: process.env })
  const forward = (chunk: Buffer): void => send(owner, 'terminal:data', id, chunk.toString('utf8').replace(/\r?\n/g, '\r\n'))
  proc.stdout.on('data', forward)
  proc.stderr.on('data', forward)
  proc.on('exit', (code) => {
    sessions.delete(id)
    send(owner, 'terminal:exit', id, code ?? 0)
  })
  proc.on('error', (err) => send(owner, 'terminal:data', id, `\r\nCouldn't start ${file}: ${err.message}\r\n`))
  return {
    owner,
    write: (data) => proc.stdin.write(data),
    resize: () => undefined,
    kill: () => proc.kill()
  }
}

/** Terminals only start inside the open project (or home if none is open). */
function safeCwd(requested: string): string {
  const root = getCurrentRoot()
  if (!root) return homedir()
  const rel = relative(root, requested)
  return rel.startsWith('..') || isAbsolute(rel) ? root : requested
}

export function killAllTerminals(): void {
  for (const session of sessions.values()) session.kill()
  sessions.clear()
}

export function registerTerminalHandlers(): void {
  ipcMain.handle('terminal:start', (event, cwd: string, cols: number, rows: number): TerminalSession => {
    const id = nextId++
    const owner = event.sender
    cwd = safeCwd(cwd)
    const usePty = pty !== null
    const session = usePty ? startPty(id, owner, cwd, cols, rows) : startBasic(id, owner, cwd)
    sessions.set(id, session)
    // Clean up if the window goes away without telling us.
    owner.once('destroyed', () => {
      sessions.get(id)?.kill()
      sessions.delete(id)
    })
    if (!usePty && ptyLoadError) console.warn(`[terminal] node-pty unavailable, using basic mode: ${ptyLoadError}`)
    return { id, mode: usePty ? 'pty' : 'basic', shell: defaultShell().file }
  })

  ipcMain.on('terminal:write', (_event, id: number, data: string) => sessions.get(id)?.write(data))
  ipcMain.on('terminal:resize', (_event, id: number, cols: number, rows: number) => sessions.get(id)?.resize(cols, rows))
  ipcMain.on('terminal:kill', (_event, id: number) => {
    sessions.get(id)?.kill()
    sessions.delete(id)
  })
}
