import type { TerminalSession } from '@shared/types'

interface StatusBarProps {
  relativePath: string | null
  language: string | null
  cursor: { line: number; column: number } | null
  dirty: boolean
  terminal: TerminalSession | null
  message: string | null
}

export function StatusBar({ relativePath, language, cursor, dirty, terminal, message }: StatusBarProps): React.JSX.Element {
  return (
    <footer className="status-bar">
      <span className="status-item status-path">{relativePath ? `${relativePath}${dirty ? ' (unsaved)' : ''}` : 'No file open'}</span>
      <span className="status-spacer" />
      {message && (
        <span className="status-item status-message" role="status">
          {message}
        </span>
      )}
      {cursor && relativePath && <span className="status-item">Ln {cursor.line}, Col {cursor.column}</span>}
      {language && <span className="status-item">{language}</span>}
      {terminal?.mode === 'basic' && (
        <span className="status-item status-warn" title="node-pty didn't load, so the terminal can't run interactive programs.">
          Basic terminal
        </span>
      )}
    </footer>
  )
}
