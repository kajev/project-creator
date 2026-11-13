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
  /** The reasoning: why this stage comes here and what the user gets from it. Briefs written before this lack it. */
  why?: string
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

/** A project folder the app just created from a brief. */
export interface CreatedProject {
  project: ProjectInfo
  /** Full path of the ASSIGNMENT.md written into the new folder. */
  assignmentPath: string
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
    /**
     * Asks where the new folder should go, creates it with the brief inside, and opens it.
     * Resolves to null when the user cancels. Rejects if the folder exists and is not empty.
     */
    create(brief: Brief): Promise<CreatedProject | null>
    /** The brief of the open project, or null when the folder has none. */
    brief(): Promise<Brief | null>
    recent(): Promise<string[]>
    close(): Promise<void>
  }
  fs: {
    readDir(dir: string): Promise<DirEntry[]>
    readFile(file: string): Promise<string>
    writeFile(file: string, content: string): Promise<void>
    /**
     * Creates an empty file at a path relative to the project folder, such as "templates/index.html", making any
     * missing folders. Resolves to the full path. Rejects if the name is unsafe or already exists.
     */
    createFile(path: string): Promise<string>
    /** The same for a folder. */
    createDir(path: string): Promise<string>
  }
  ai: {
    hasKey(): Promise<boolean>
    /** One way only: the key goes to the main process and nothing sends it back. */
    setKey(key: string): Promise<void>
    clearKey(): Promise<void>
    /** Three project ideas that fit the user's answers. */
    proposeProjects(input: ProposalInput): Promise<Proposal[]>
    /** The full assignment for the idea the user picked. */
    writeBrief(input: ProposalInput, proposal: Proposal): Promise<Brief>
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
