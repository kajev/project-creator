import { useCallback, useEffect, useRef, useState } from 'react'
import type { Brief, CreatedProject, ProjectInfo, TerminalSession } from '@shared/types'
import { FileTree } from './components/FileTree'
import { TabBar, type OpenFile } from './components/TabBar'
import { EditorPane } from './components/EditorPane'
import { TerminalPane } from './components/TerminalPane'
import { SidePanel } from './components/SidePanel'
import { Welcome } from './components/Welcome'
import { NewProject } from './components/NewProject'
import { StatusBar } from './components/StatusBar'
import { Splitter } from './components/Splitter'
import { CloseIcon } from './components/Icons'
import { closeAllModels, closeModel, getModel, isDirty, markSaved, openModel } from './lib/models'
import { baseName, relativeTo } from './lib/paths'

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const LANGUAGE_NAMES: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  markdown: 'Markdown',
  plaintext: 'Plain text',
  yaml: 'YAML',
  shell: 'Shell',
  powershell: 'PowerShell',
  sql: 'SQL',
  java: 'Java',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust'
}

const errorText = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : String(err)
  // Electron prefixes IPC errors with "Error invoking remote method '...': Error: ".
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}

export default function App(): React.JSX.Element {
  const [project, setProject] = useState<ProjectInfo | null>(null)
  /** True while the "Start a new project" screen is showing instead of Welcome. */
  const [starting, setStarting] = useState(false)
  /** The open project's brief, or null when the folder has none. */
  const [brief, setBrief] = useState<Brief | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const [files, setFiles] = useState<OpenFile[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [dirty, setDirty] = useState<Set<string>>(() => new Set())
  const [cursor, setCursor] = useState<{ line: number; column: number } | null>(null)
  const [terminal, setTerminal] = useState<TerminalSession | null>(null)
  const [showTerminal, setShowTerminal] = useState(true)
  const [showGuide, setShowGuide] = useState(true)
  const [sizes, setSizes] = useState({ left: 260, right: 340, bottom: 240 })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeRef = useRef(activePath)
  activeRef.current = activePath
  const projectRef = useRef(project)
  projectRef.current = project
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const showError = useCallback((msg: string) => setError(msg), [])
  /** For errors as they were thrown. Stable, so components can list it in effect dependencies. */
  const showFailure = useCallback((err: unknown) => setError(errorText(err)), [])

  const loadRecent = useCallback(() => {
    window.api.project.recent().then(setRecent).catch(() => setRecent([]))
  }, [])

  useEffect(loadRecent, [loadRecent])

  useEffect(() => {
    document.title = project ? `${project.name} - Project Creator` : 'Project Creator'
  }, [project])

  // The Guide panel shows the brief of whichever project is open.
  useEffect(() => {
    setBrief(null)
    if (!project) return
    let cancelled = false
    window.api.project.brief().then(
      (found) => !cancelled && setBrief(found),
      () => undefined
    )
    return () => {
      cancelled = true
    }
  }, [project])

  // Transient messages clear themselves.
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 2500)
    return () => clearTimeout(t)
  }, [message])
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 8000)
    return () => clearTimeout(t)
  }, [error])

  const resetWorkspace = useCallback(() => {
    closeAllModels()
    setFiles([])
    setActivePath(null)
    setDirty(new Set())
    setCursor(null)
  }, [])

  const confirmDiscard = useCallback((): boolean => {
    const count = dirtyRef.current.size
    if (count === 0) return true
    return window.confirm(`You have ${count} unsaved file${count === 1 ? '' : 's'}. Discard the changes?`)
  }, [])

  const openProject = useCallback(
    (info: ProjectInfo) => {
      resetWorkspace()
      setProject(info)
      setStarting(false)
      loadRecent()
    },
    [resetWorkspace, loadRecent]
  )

  const handleOpenFolder = useCallback(async () => {
    if (!confirmDiscard()) return
    try {
      const info = await window.api.project.openFolder()
      if (info) openProject(info)
    } catch (err) {
      showError(errorText(err))
    }
  }, [confirmDiscard, openProject, showError])

  const handleOpenRecent = useCallback(
    async (root: string) => {
      try {
        openProject(await window.api.project.openRecent(root))
      } catch (err) {
        showError(errorText(err))
        loadRecent()
      }
    },
    [openProject, showError, loadRecent]
  )

  const handleCloseProject = useCallback(async () => {
    if (!confirmDiscard()) return
    await window.api.project.close()
    resetWorkspace()
    setError(null)
    setProject(null)
    loadRecent()
  }, [confirmDiscard, resetWorkspace, loadRecent])

  const openFile = useCallback(
    async (path: string) => {
      if (!getModel(path)) {
        try {
          openModel(path, await window.api.fs.readFile(path))
        } catch (err) {
          showError(errorText(err))
          return
        }
      }
      setFiles((prev) => (prev.some((f) => f.path === path) ? prev : [...prev, { path, name: baseName(path) }]))
      setActivePath(path)
    },
    [showError]
  )

  /** A project made from a brief opens with its assignment in the editor. */
  const handleCreated = useCallback(
    (created: CreatedProject) => {
      openProject(created.project)
      void openFile(created.assignmentPath)
    },
    [openProject, openFile]
  )

  const closeFile = useCallback(
    (path: string) => {
      if (isDirty(path) && !window.confirm(`${baseName(path)} has unsaved changes. Close it anyway?`)) return
      const index = files.findIndex((f) => f.path === path)
      const remaining = files.filter((f) => f.path !== path)
      closeModel(path)
      setFiles(remaining)
      setDirty((prev) => {
        if (!prev.has(path)) return prev
        const next = new Set(prev)
        next.delete(path)
        return next
      })
      if (activePath === path) {
        setActivePath(remaining[Math.min(index, remaining.length - 1)]?.path ?? null)
      }
    },
    [files, activePath]
  )

  const saveActive = useCallback(async () => {
    const path = activeRef.current
    const model = path ? getModel(path) : null
    if (!path || !model) return
    try {
      await window.api.fs.writeFile(path, model.getValue())
      markSaved(path)
      setDirty((prev) => {
        const next = new Set(prev)
        next.delete(path)
        return next
      })
      setMessage(`Saved ${baseName(path)}`)
    } catch (err) {
      showError(errorText(err))
    }
  }, [showError])

  const handleContentChange = useCallback((path: string) => {
    const nowDirty = isDirty(path)
    setDirty((prev) => {
      if (prev.has(path) === nowDirty) return prev
      const next = new Set(prev)
      if (nowDirty) next.add(path)
      else next.delete(path)
      return next
    })
  }, [])

  const handleCursor = useCallback((line: number, column: number) => setCursor({ line, column }), [])

  // App-wide shortcuts. Capture phase, so the terminal doesn't swallow Ctrl+`.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const inTerminal = e.target instanceof Element && e.target.closest('.terminal-host') !== null
      const key = e.key.toLowerCase()
      if (key === 's' && !inTerminal) {
        e.preventDefault()
        void saveActive()
      } else if (e.key === '`' && projectRef.current) {
        e.preventDefault()
        e.stopPropagation()
        setShowTerminal((v) => !v)
      } else if (key === 'o' && !inTerminal) {
        e.preventDefault()
        void handleOpenFolder()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [saveActive, handleOpenFolder])

  const errorToast = error && (
    <div className="toast" role="alert">
      <span>{error}</span>
      <button className="icon-button" onClick={() => setError(null)} aria-label="Dismiss">
        <CloseIcon />
      </button>
    </div>
  )

  if (!project) {
    return (
      <div className="app">
        {starting ? (
          <NewProject onCreated={handleCreated} onCancel={() => setStarting(false)} onError={(err) => showError(errorText(err))} />
        ) : (
          <Welcome recent={recent} onOpenFolder={handleOpenFolder} onOpenRecent={handleOpenRecent} onStartNew={() => setStarting(true)} />
        )}
        {errorToast}
      </div>
    )
  }

  const languageId = activePath ? getModel(activePath)?.getLanguageId() : undefined
  const language = languageId ? (LANGUAGE_NAMES[languageId] ?? languageId) : null

  return (
    <div className="app workbench">
      <header className="app-header">
        <span className="app-name">Project Creator</span>
        <span className="app-project" title={project.root}>
          {project.name}
        </span>
        <div className="header-actions">
          <button className={`toggle${showTerminal ? ' on' : ''}`} aria-pressed={showTerminal} onClick={() => setShowTerminal((v) => !v)} title="Ctrl+`">
            Terminal
          </button>
          <button className={`toggle${showGuide ? ' on' : ''}`} aria-pressed={showGuide} onClick={() => setShowGuide((v) => !v)}>
            Guide
          </button>
          <span className="header-divider" aria-hidden="true" />
          <button className="button small" onClick={handleOpenFolder}>
            Open folder
          </button>
          <button className="button small" onClick={handleCloseProject}>
            Close project
          </button>
        </div>
      </header>

      <div className="workbench-main">
        <div className="col-left" style={{ width: sizes.left }}>
          <FileTree root={project.root} projectName={project.name} activePath={activePath} onOpenFile={openFile} onError={showFailure} />
        </div>
        <Splitter direction="vertical" label="Resize file panel" onDrag={(d) => setSizes((s) => ({ ...s, left: clamp(s.left + d, 180, 520) }))} />

        <div className="col-center">
          <TabBar files={files} activePath={activePath} dirty={dirty} onSelect={setActivePath} onClose={closeFile} />
          <EditorPane activePath={activePath} onContentChange={handleContentChange} onCursorChange={handleCursor} />
          {/* The terminal stays mounted while hidden so the shell keeps its state. */}
          <div className="terminal-slot" hidden={!showTerminal}>
            <Splitter direction="horizontal" label="Resize terminal" onDrag={(d) => setSizes((s) => ({ ...s, bottom: clamp(s.bottom - d, 120, 640) }))} />
            <div style={{ height: sizes.bottom }} className="terminal-frame">
              <TerminalPane cwd={project.root} onHide={() => setShowTerminal(false)} onSession={setTerminal} />
            </div>
          </div>
        </div>

        {showGuide && (
          <>
            <Splitter direction="vertical" label="Resize guide panel" onDrag={(d) => setSizes((s) => ({ ...s, right: clamp(s.right - d, 260, 560) }))} />
            <div className="col-right" style={{ width: sizes.right }}>
              <SidePanel brief={brief} />
            </div>
          </>
        )}
      </div>

      <StatusBar
        relativePath={activePath ? relativeTo(project.root, activePath) : null}
        language={language}
        cursor={cursor}
        dirty={activePath ? dirty.has(activePath) : false}
        terminal={terminal}
        message={message}
      />
      {errorToast}
    </div>
  )
}
