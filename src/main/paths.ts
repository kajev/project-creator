/*
 * Rules for a path that came from outside the main process: typed by the user, or written by the AI.
 *
 * A path that breaks a rule is refused, never repaired. A "cleaned" path is a different path from the one that was
 * asked for, and quietly writing somewhere else is worse than saying no.
 */

/** Names Windows treats as devices, with or without an extension: "NUL.txt" is still NUL. */
const DEVICE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

/** Not allowed anywhere in a name. The colon also rules out drive letters ("C:x") and NTFS streams ("a:b"). */
const FORBIDDEN = /[<>:"|?*\u0000-\u001f]/

export interface PathRules {
  /** Refuse names that start with a dot, except .gitignore. Used for files the AI wrote: dot folders are where
   *  tools keep settings that run things later (.git, .vscode, .github). */
  noDotNames?: boolean
}

/**
 * Checks a path that should be relative to the project folder. Returns it with forward slashes, or throws a
 * one-line reason the user can read.
 */
export function checkRelativePath(path: string, rules: PathRules = {}): string {
  if (typeof path !== 'string' || path.trim() === '') throw new Error('Type a name first.')
  const refuse = (why: string): never => {
    throw new Error(`"${path}" can't be used: ${why}`)
  }

  const unified = path.replace(/\\/g, '/')
  if (unified.startsWith('/')) refuse('it starts at the top of a drive or on a network share.')

  const segments = unified.split('/')
  for (const segment of segments) {
    if (segment === '') refuse('it has an empty name in it.')
    if (segment === '.' || segment === '..') refuse('"." and ".." could point outside the project.')
    if (FORBIDDEN.test(segment)) refuse('a name cannot contain < > : " | ? * or control characters.')
    if (/^ |[. ]$/.test(segment)) refuse('a name cannot start with a space or end with a dot or a space.')
    const base = segment.split('.')[0]
    if (DEVICE.test(base)) refuse(`Windows reserves the name ${base.toUpperCase()}.`)
    if (rules.noDotNames && segment.startsWith('.') && segment !== '.gitignore') {
      refuse('names that start with a dot are not allowed here.')
    }
  }
  return segments.join('/')
}

/**
 * Finds two paths that Windows and macOS would treat as the same file: same letters in a different case, or the
 * same character written two ways. Returns the pair, or null when every path is distinct.
 */
export function findCollision(paths: string[]): [string, string] | null {
  const seen = new Map<string, string>()
  for (const path of paths) {
    const key = path.normalize('NFC').toLowerCase()
    const first = seen.get(key)
    if (first !== undefined) return [first, path]
    seen.set(key, path)
  }
  return null
}
