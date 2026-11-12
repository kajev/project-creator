import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Monaco runs language services in web workers. Vite bundles each one locally,
// so the editor works offline and never pulls code from a CDN.
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  }
}

// The editor can't see the project's node_modules, so type errors about
// missing imports would be noise. Keep syntax errors, skip semantic ones.
const tsLang = monaco.typescript
for (const defaults of [tsLang.typescriptDefaults, tsLang.javascriptDefaults]) {
  defaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false })
  defaults.setCompilerOptions({
    target: tsLang.ScriptTarget.ES2020,
    module: tsLang.ModuleKind.ESNext,
    jsx: tsLang.JsxEmit.ReactJSX,
    allowJs: true,
    allowNonTsExtensions: true
  })
}

monaco.editor.defineTheme('project-creator', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6b7890', fontStyle: 'italic' },
    { token: 'keyword', foreground: '9cc3e6' },
    { token: 'string', foreground: 'c9d99a' },
    { token: 'number', foreground: 'e9c46a' },
    { token: 'type', foreground: '8fd0c4' }
  ],
  colors: {
    'editor.background': '#121720',
    'editor.foreground': '#d8dde8',
    'editor.lineHighlightBackground': '#19202c',
    'editor.lineHighlightBorder': '#00000000',
    'editorLineNumber.foreground': '#465065',
    'editorLineNumber.activeForeground': '#b9c1d1',
    'editorCursor.foreground': '#e9c46a',
    'editor.selectionBackground': '#2a4766',
    'editor.inactiveSelectionBackground': '#22344a',
    'editorIndentGuide.background1': '#1f2633',
    'editorIndentGuide.activeBackground1': '#344056',
    'editorWidget.background': '#181e29',
    'editorWidget.border': '#2b3446',
    'editorSuggestWidget.background': '#181e29',
    'editorSuggestWidget.selectedBackground': '#24324a',
    'scrollbarSlider.background': '#2a334480',
    'scrollbarSlider.hoverBackground': '#344056a0',
    'editorGutter.background': '#121720'
  }
})

export { monaco }
