import { useEffect, useRef } from 'react'
import { monaco } from '@renderer/lib/monaco'
import { getModel } from '@renderer/lib/models'

interface EditorPaneProps {
  activePath: string | null
  onContentChange: (path: string) => void
  onCursorChange: (line: number, column: number) => void
}

export function EditorPane({ activePath, onContentChange, onCursorChange }: EditorPaneProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const viewStates = useRef(new Map<string, monaco.editor.ICodeEditorViewState | null>())
  const shownPath = useRef<string | null>(null)

  // Latest callbacks, so the editor's listeners never call a stale closure.
  const callbacks = useRef({ onContentChange, onCursorChange })
  callbacks.current = { onContentChange, onCursorChange }

  useEffect(() => {
    const editor = monaco.editor.create(hostRef.current!, {
      model: null,
      theme: 'project-creator',
      automaticLayout: true,
      fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, 'Courier New', monospace",
      fontSize: 14,
      lineHeight: 22,
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      renderLineHighlight: 'line',
      padding: { top: 12 },
      tabSize: 2,
      bracketPairColorization: { enabled: true },
      guides: { indentation: true, bracketPairs: false }
    })
    editorRef.current = editor

    const contentSub = editor.onDidChangeModelContent(() => {
      if (shownPath.current) callbacks.current.onContentChange(shownPath.current)
    })
    const cursorSub = editor.onDidChangeCursorPosition((e) => {
      callbacks.current.onCursorChange(e.position.lineNumber, e.position.column)
    })

    return () => {
      contentSub.dispose()
      cursorSub.dispose()
      editor.dispose()
      editorRef.current = null
      shownPath.current = null
    }
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (shownPath.current) viewStates.current.set(shownPath.current, editor.saveViewState())
    shownPath.current = activePath

    const model = activePath ? getModel(activePath) : null
    editor.setModel(model)
    if (!activePath || !model) return

    const saved = viewStates.current.get(activePath)
    if (saved) editor.restoreViewState(saved)
    const pos = editor.getPosition()
    if (pos) callbacks.current.onCursorChange(pos.lineNumber, pos.column)
    editor.focus()
  }, [activePath])

  return (
    <div className="editor-pane">
      <div ref={hostRef} className="editor-host" hidden={!activePath} />
      {!activePath && (
        <div className="editor-empty">
          <p className="editor-empty-title">Pick a file from the tree to start editing.</p>
          <p className="editor-empty-hint">Ctrl+S saves. Ctrl+` shows or hides the terminal.</p>
        </div>
      )}
    </div>
  )
}
