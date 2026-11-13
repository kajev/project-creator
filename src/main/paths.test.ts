import { describe, expect, it } from 'vitest'
import { checkRelativePath, findCollision } from './paths'

describe('checkRelativePath', () => {
  it('accepts ordinary relative paths and returns them with forward slashes', () => {
    expect(checkRelativePath('app.py')).toBe('app.py')
    expect(checkRelativePath('templates/index.html')).toBe('templates/index.html')
    expect(checkRelativePath('src\\static\\style.css')).toBe('src/static/style.css')
    expect(checkRelativePath('notes v2.txt')).toBe('notes v2.txt')
  })

  it('refuses an empty name', () => {
    expect(() => checkRelativePath('')).toThrow('Type a name first.')
    expect(() => checkRelativePath('   ')).toThrow('Type a name first.')
  })

  it('refuses paths that leave the project', () => {
    for (const bad of ['../x', 'a/../../x', '..', './x', 'a/./b']) {
      expect(() => checkRelativePath(bad), bad).toThrow('could point outside the project')
    }
  })

  it('refuses absolute, drive and network paths', () => {
    for (const bad of ['/etc/passwd', '\\x', '\\\\server\\share\\x', '//server/share/x']) {
      expect(() => checkRelativePath(bad), bad).toThrow('top of a drive or on a network share')
    }
    // A drive letter needs a colon, and a colon is never allowed.
    for (const bad of ['C:\\x', 'C:x', 'c:/x']) {
      expect(() => checkRelativePath(bad), bad).toThrow('cannot contain')
    }
  })

  it('refuses characters Windows does not allow, including the colon of an NTFS stream', () => {
    for (const bad of ['a:b', 'file.txt:hidden', 'what?.txt', 'a*b', 'a|b', 'a<b', 'a>b', 'say "hi".txt', 'tab\there']) {
      expect(() => checkRelativePath(bad), bad).toThrow('cannot contain')
    }
  })

  it('refuses names that end in a dot or a space, or start with a space', () => {
    for (const bad of ['a./b', 'file.', 'folder /x', 'trailing ', ' leading']) {
      expect(() => checkRelativePath(bad), JSON.stringify(bad)).toThrow('cannot start with a space or end with a dot or a space')
    }
  })

  it('refuses Windows device names in any folder, with or without an extension', () => {
    for (const bad of ['CON', 'a/CON.txt', 'nul', 'Aux.py', 'src/com1/x', 'LPT9.log']) {
      expect(() => checkRelativePath(bad), bad).toThrow('Windows reserves the name')
    }
    // Only the whole name counts: these merely contain a device name.
    expect(checkRelativePath('console.py')).toBe('console.py')
    expect(checkRelativePath('null.txt')).toBe('null.txt')
  })

  it('refuses empty names inside a path', () => {
    expect(() => checkRelativePath('a//b')).toThrow('empty name')
    expect(() => checkRelativePath('a/')).toThrow('empty name')
  })

  it('allows dot names by default, and refuses them when asked, except .gitignore', () => {
    expect(checkRelativePath('.env')).toBe('.env')
    for (const bad of ['.vscode/settings.json', '.git/hooks/pre-commit', '.github/workflows/ci.yml', 'src/.hidden']) {
      expect(() => checkRelativePath(bad, { noDotNames: true }), bad).toThrow('start with a dot')
    }
    expect(checkRelativePath('.gitignore', { noDotNames: true })).toBe('.gitignore')
  })
})

describe('findCollision', () => {
  it('returns null when every path is distinct', () => {
    expect(findCollision(['app.py', 'tests/test_app.py', 'README.md'])).toBeNull()
  })

  it('finds paths that differ only by letter case', () => {
    expect(findCollision(['README.md', 'src/app.py', 'readme.MD'])).toEqual(['README.md', 'readme.MD'])
  })

  it('finds the same character written two ways', () => {
    // "é" as one character, and as "e" followed by a combining accent.
    expect(findCollision(['caf\u00e9.txt', 'cafe\u0301.txt'])).not.toBeNull()
  })
})
