import { CloseIcon } from './Icons'

export interface OpenFile {
  path: string
  name: string
}

interface TabBarProps {
  files: OpenFile[]
  activePath: string | null
  dirty: Set<string>
  onSelect: (path: string) => void
  onClose: (path: string) => void
}

export function TabBar({ files, activePath, dirty, onSelect, onClose }: TabBarProps): React.JSX.Element | null {
  if (files.length === 0) return null
  return (
    <div className="tab-bar" role="tablist" aria-label="Open files">
      {files.map((file) => {
        const active = file.path === activePath
        const isDirty = dirty.has(file.path)
        return (
          <div key={file.path} className={`tab${active ? ' active' : ''}`} title={file.path}>
            <button
              className="tab-label"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(file.path)}
              onAuxClick={(e) => e.button === 1 && onClose(file.path)}
            >
              {file.name}
            </button>
            <button
              className={`tab-close${isDirty ? ' dirty' : ''}`}
              onClick={() => onClose(file.path)}
              aria-label={isDirty ? `Close ${file.name} (unsaved changes)` : `Close ${file.name}`}
              title={isDirty ? 'Unsaved changes' : 'Close'}
            >
              <span className="dirty-dot" aria-hidden="true" />
              <CloseIcon className="close-glyph" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
