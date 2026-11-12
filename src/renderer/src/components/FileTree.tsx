import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { DirEntry } from '@shared/types'
import { ChevronIcon, FileIcon, RefreshIcon } from './Icons'

interface TreeContextValue {
  activePath: string | null
  onOpenFile: (path: string) => void
  onError: (message: string) => void
}

const TreeContext = createContext<TreeContextValue | null>(null)

const useTree = (): TreeContextValue => {
  const value = useContext(TreeContext)
  if (!value) throw new Error('FileTree pieces must render inside <FileTree>.')
  return value
}

interface FileTreeProps extends TreeContextValue {
  root: string
  projectName: string
}

export function FileTree({ root, projectName, activePath, onOpenFile, onError }: FileTreeProps): React.JSX.Element {
  // Bumping the key remounts the tree, which re-reads every expanded folder.
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <TreeContext.Provider value={{ activePath, onOpenFile, onError }}>
      <section className="panel file-tree" aria-label="Project files">
        <header className="panel-header">
          <h2 className="panel-title" title={root}>
            {projectName}
          </h2>
          <button className="icon-button" onClick={() => setRefreshKey((k) => k + 1)} title="Reload files" aria-label="Reload files">
            <RefreshIcon />
          </button>
        </header>
        <div className="tree-scroll" role="tree" aria-label={projectName}>
          <DirChildren key={refreshKey} dir={root} depth={0} />
        </div>
      </section>
    </TreeContext.Provider>
  )
}

function DirChildren({ dir, depth }: { dir: string; depth: number }): React.JSX.Element | null {
  const { onError } = useTree()
  const [entries, setEntries] = useState<DirEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.fs
      .readDir(dir)
      .then((list) => !cancelled && setEntries(list))
      .catch((err: unknown) => {
        if (cancelled) return
        setEntries([])
        onError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [dir, onError])

  if (entries === null) return <div className="tree-note" style={{ paddingLeft: indent(depth) }}>Loading…</div>
  if (entries.length === 0) {
    return depth === 0 ? <div className="tree-note">This folder is empty. Create a file from the terminal to get going.</div> : null
  }
  return (
    <div role="group">
      {entries.map((entry) =>
        entry.isDir ? <DirNode key={entry.path} entry={entry} depth={depth} /> : <FileNode key={entry.path} entry={entry} depth={depth} />
      )}
    </div>
  )
}

function DirNode({ entry, depth }: { entry: DirEntry; depth: number }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((o) => !o), [])

  return (
    <>
      <button className="tree-row" role="treeitem" aria-expanded={open} style={{ paddingLeft: indent(depth) }} onClick={toggle} title={entry.path}>
        <ChevronIcon className={`tree-chevron${open ? ' open' : ''}`} />
        <span className="tree-name">{entry.name}</span>
      </button>
      {open && <DirChildren dir={entry.path} depth={depth + 1} />}
    </>
  )
}

function FileNode({ entry, depth }: { entry: DirEntry; depth: number }): React.JSX.Element {
  const { activePath, onOpenFile } = useTree()
  const active = activePath === entry.path
  return (
    <button
      className={`tree-row tree-file${active ? ' active' : ''}`}
      role="treeitem"
      aria-selected={active}
      style={{ paddingLeft: indent(depth) }}
      onClick={() => onOpenFile(entry.path)}
      title={entry.path}
    >
      <FileIcon className="tree-file-icon" />
      <span className="tree-name">{entry.name}</span>
    </button>
  )
}

const indent = (depth: number): number => 10 + depth * 14
