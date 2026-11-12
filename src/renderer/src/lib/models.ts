import { monaco } from './monaco'

/**
 * One Monaco model per open file. Models outlive tab switches, so undo
 * history and unsaved edits survive moving between files.
 */
const savedVersion = new Map<string, number>()

const uriFor = (path: string): monaco.Uri => monaco.Uri.file(path)

export function getModel(path: string): monaco.editor.ITextModel | null {
  return monaco.editor.getModel(uriFor(path))
}

export function openModel(path: string, content: string): monaco.editor.ITextModel {
  const model = getModel(path) ?? monaco.editor.createModel(content, undefined, uriFor(path))
  if (!savedVersion.has(path)) savedVersion.set(path, model.getAlternativeVersionId())
  return model
}

export function isDirty(path: string): boolean {
  const model = getModel(path)
  return model !== null && model.getAlternativeVersionId() !== savedVersion.get(path)
}

export function markSaved(path: string): void {
  const model = getModel(path)
  if (model) savedVersion.set(path, model.getAlternativeVersionId())
}

export function closeModel(path: string): void {
  getModel(path)?.dispose()
  savedVersion.delete(path)
}

export function closeAllModels(): void {
  for (const path of [...savedVersion.keys()]) closeModel(path)
}
