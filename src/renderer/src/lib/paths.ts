/** Small path helpers that work with both Windows and POSIX separators. */

export function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function relativeTo(root: string, path: string): string {
  if (path.toLowerCase().startsWith(root.toLowerCase())) {
    return path.slice(root.length).replace(/^[\\/]+/, '')
  }
  return path
}
