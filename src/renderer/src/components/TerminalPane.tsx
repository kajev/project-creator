import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import type { TerminalSession } from '@shared/types'
import { CloseIcon, RefreshIcon } from './Icons'

interface TerminalPaneProps {
  cwd: string
  onHide: () => void
  onSession: (session: TerminalSession | null) => void
}

const theme = {
  background: '#121720',
  foreground: '#d8dde8',
  cursor: '#e9c46a',
  cursorAccent: '#121720',
  selectionBackground: '#2a4766',
  black: '#1b2130',
  red: '#e07a6f',
  green: '#9ccf8f',
  yellow: '#e9c46a',
  blue: '#7fb2d9',
  magenta: '#c49ad9',
  cyan: '#8fd0c4',
  white: '#d8dde8',
  brightBlack: '#5d6679',
  brightRed: '#f09a90',
  brightGreen: '#b6e3a9',
  brightYellow: '#f3d68c',
  brightBlue: '#a3cbea',
  brightMagenta: '#d8b6e8',
  brightCyan: '#aee3d9',
  brightWhite: '#f2f4f8'
}

export function TerminalPane({ cwd, onHide, onSession }: TerminalPaneProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const [restartKey, setRestartKey] = useState(0)
  const [session, setSession] = useState<TerminalSession | null>(null)
  const [exited, setExited] = useState(false)

  const onSessionRef = useRef(onSession)
  onSessionRef.current = onSession

  useEffect(() => {
    const host = hostRef.current!
    const term = new Terminal({
      fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: false,
      theme
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host)
    safeFit(fit)

    let disposed = false
    let id: number | null = null
    let mode: TerminalSession['mode'] = 'pty'
    let lineBuffer = ''

    const offData = window.api.terminal.onData((sid, data) => {
      if (sid === id) term.write(data)
    })
    const offExit = window.api.terminal.onExit((sid, code) => {
      if (sid !== id) return
      term.write(`\r\n\x1b[2mShell exited with code ${code}. Use Restart to open a new one.\x1b[0m\r\n`)
      id = null
      setExited(true)
    })

    window.api.terminal
      .start(cwd, term.cols, term.rows)
      .then((s) => {
        if (disposed) {
          window.api.terminal.kill(s.id)
          return
        }
        id = s.id
        mode = s.mode
        setSession(s)
        setExited(false)
        onSessionRef.current(s)
        if (s.mode === 'basic') {
          term.write('\x1b[33mBasic terminal mode: node-pty did not load, so interactive programs will not work here.\x1b[0m\r\n')
        }
      })
      .catch((err: unknown) => {
        term.write(`\x1b[31mCouldn't start a shell: ${err instanceof Error ? err.message : String(err)}\x1b[0m\r\n`)
      })

    const input = term.onData((data) => {
      if (id === null) return
      if (mode === 'pty') {
        window.api.terminal.write(id, data)
        return
      }
      // Basic mode has no pty, so echo keystrokes ourselves and send whole lines.
      for (const ch of data) {
        if (ch === '\r') {
          term.write('\r\n')
          window.api.terminal.write(id, `${lineBuffer}\n`)
          lineBuffer = ''
        } else if (ch === '\x7f') {
          if (lineBuffer.length > 0) {
            lineBuffer = lineBuffer.slice(0, -1)
            term.write('\b \b')
          }
        } else if (ch === '\x03') {
          lineBuffer = ''
          term.write('^C\r\n')
        } else if (ch >= ' ') {
          lineBuffer += ch
          term.write(ch)
        }
      }
    })

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (disposed) return
        safeFit(fit)
        if (id !== null && mode === 'pty') window.api.terminal.resize(id, term.cols, term.rows)
      })
    })
    observer.observe(host)

    return () => {
      disposed = true
      observer.disconnect()
      offData()
      offExit()
      input.dispose()
      if (id !== null) window.api.terminal.kill(id)
      term.dispose()
      onSessionRef.current(null)
    }
  }, [cwd, restartKey])

  return (
    <section className="terminal-pane" aria-label="Terminal">
      <header className="terminal-header">
        <h2 className="panel-title">Terminal</h2>
        <span className="terminal-meta">
          {session ? `${session.shell}${session.mode === 'basic' ? ', basic mode' : ''}` : 'Starting…'}
          {exited && ', exited'}
        </span>
        <div className="terminal-actions">
          <button className="icon-button" onClick={() => setRestartKey((k) => k + 1)} title="Restart shell" aria-label="Restart shell">
            <RefreshIcon />
          </button>
          <button className="icon-button" onClick={onHide} title="Hide terminal (Ctrl+`)" aria-label="Hide terminal">
            <CloseIcon />
          </button>
        </div>
      </header>
      <div ref={hostRef} className="terminal-host" />
    </section>
  )
}

function safeFit(fit: FitAddon): void {
  try {
    fit.fit()
  } catch {
    // Fitting fails while the panel has no size (e.g. mid-layout). It re-fits on the next resize.
  }
}
