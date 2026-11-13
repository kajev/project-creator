import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { DirEntry } from '@shared/types'
import { ChevronIcon, FileIcon, NewFileIcon, NewFolderIcon, RefreshIcon } from './Icons'

interface TreeContextValue {
  activePath: string | null
  onOpenFile: (path: string) => void
  onError: (err: unknown) => void
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
  // Bumping the key remounts the tree: the top level is read again and open folders close.
  const [refreshKey, setRefreshKey] = useState(0)
  /** What the name field is making, or null when it is closed. */
  const [creating, setCreating] = useState<'file' | 'dir' | null>(null)
  const [newPath, setNewPath] = useState('')

  const startCreating = (kind: 'file' | 'dir'): void => {
    setCreating(kind)
    setNewPath('')
  }

  const create = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    try {
      if (creating === 'file') onOpenFile(await window.api.fs.createFile(newPath))
      else await window.api.fs.createDir(newPath)
      setCreating(null)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      // The field stays open so the name can be corrected.
      onError(err)
    }
  }

  return (
    <TreeContext.Provider value={{ activePath, onOpenFile, onError }}>
      <section className="panel file-tree" aria-label="Project files">
        <header className="panel-header">
          <h2 className="panel-title" title={root}>
            {projectName}
          </h2>
          <button className="icon-button" onClick={() => startCreating('file')} title="New file" aria-label="New file">
            <NewFileIcon />
          </button>
          <button className="icon-button" onClick={() => startCreating('dir')} title="New folder" aria-label="New folder">
            <NewFolderIcon />
          </button>
          <button className="icon-button" onClick={() => setRefreshKey((k) => k + 1)} title="Reload files" aria-label="Reload files">
            <RefreshIcon />
          </button>
        </header>
        {creating && (
          <form className="tree-new" onSubmit={create}>
            <input
              className="input"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setCreating(null)}
              placeholder={creating === 'file' ? 'templates/index.html' : 'templates'}
              aria-label={creating === 'file' ? 'New file name' : 'New folder name'}
              spellCheck={false}
              autoFocus
            />
          </form>
        )}
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
        onError(err)
      })
    return () => {
      cancelled = true
    }
  }, [dir, onError])

  if (entries === null) return <div className="tree-note" style={{ paddingLeft: indent(depth) }}>Loading…</div>
  if (entries.length === 0) {
    return depth === 0 ? <div className="tree-note">This folder is empty. Use New file above to get going.</div> : null
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
