import { describe, expect, it } from 'vitest'
import { baseName, relativeTo } from './paths'

describe('baseName', () => {
  it('returns the last part of a Windows path', () => {
    expect(baseName('C:\\Users\\me\\project\\main.ts')).toBe('main.ts')
  })

  it('returns the last part of a POSIX path', () => {
    expect(baseName('/home/me/project/main.ts')).toBe('main.ts')
  })

  it('ignores a trailing separator', () => {
    expect(baseName('C:\\Users\\me\\project\\')).toBe('project')
    expect(baseName('/home/me/project/')).toBe('project')
  })
})

describe('relativeTo', () => {
  it('strips the root and the separator from a Windows path', () => {
    expect(relativeTo('C:\\Users\\me\\project', 'C:\\Users\\me\\project\\src\\main.ts')).toBe('src\\main.ts')
  })

  it('strips the root and the separator from a POSIX path', () => {
    expect(relativeTo('/home/me/project', '/home/me/project/src/main.ts')).toBe('src/main.ts')
  })

  it('matches the root without caring about letter case', () => {
    expect(relativeTo('c:\\users\\me\\project', 'C:\\Users\\Me\\Project\\main.ts')).toBe('main.ts')
  })

  it('returns the path unchanged when it is outside the root', () => {
    expect(relativeTo('C:\\Users\\me\\project', 'D:\\other\\main.ts')).toBe('D:\\other\\main.ts')
  })
})
