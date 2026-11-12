/** Shapes shared by the main process, the preload bridge and the UI. */

export interface DirEntry {
  name: string
  path: string
  isDir: boolean
}

export interface ProjectInfo {
  root: string
  name: string
}

export type TerminalMode = 'pty' | 'basic'

export interface TerminalSession {
  id: number
  mode: TerminalMode
  shell: string
}

/** Everything the UI is allowed to ask the main process for. */
export interface ProjectCreatorApi {
  /** "win32", "darwin" or "linux". */
  platform: string
  project: {
    /** Shows the folder picker. Resolves to null when the user cancels. */
    openFolder(): Promise<ProjectInfo | null>
    /** Reopens a folder from the recent list. Rejects if it no longer exists. */
    openRecent(root: string): Promise<ProjectInfo>
    recent(): Promise<string[]>
    close(): Promise<void>
  }
  fs: {
    readDir(dir: string): Promise<DirEntry[]>
    readFile(file: string): Promise<string>
    writeFile(file: string, content: string): Promise<void>
  }
  terminal: {
    start(cwd: string, cols: number, rows: number): Promise<TerminalSession>
    write(id: number, data: string): void
    resize(id: number, cols: number, rows: number): void
    kill(id: number): void
    onData(listener: (id: number, data: string) => void): () => void
    onExit(listener: (id: number, code: number) => void): () => void
  }
}
