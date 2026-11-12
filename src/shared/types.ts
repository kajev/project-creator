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

/** What the user tells us before the AI proposes projects. */
export interface ProposalInput {
  /** Free text: what the user wants to build or learn. */
  interests: string
  level: 'new' | 'some' | 'comfortable'
  /** Empty means the AI picks a language that fits. */
  language: string
  /** Hours the user has for the whole project. */
  hours: number
}

/** One of the three project ideas the user chooses between. */
export interface Proposal {
  title: string
  /** One or two sentences. */
  pitch: string
  /** Language and main tools. */
  stack: string
  estimatedHours: number
  /** What the user will practise. */
  skills: string[]
}

export interface BriefStage {
  title: string
  /** One sentence. */
  goal: string
  /** Checks the user can observe by running the project. */
  doneWhen: string[]
}

/** The assignment for one project. It says what and "done when", never how. */
export interface Brief {
  title: string
  /** What you are building and why, one short paragraph. */
  summary: string
  stack: string
  estimatedHours: number
  /** What the finished thing must do. */
  requirements: string[]
  /** A concrete picture of "finished": sample commands and output, or a described screen. */
  example: string
  /** 5 to 10, in order. */
  stages: BriefStage[]
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
