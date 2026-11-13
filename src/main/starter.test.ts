import { describe, expect, it } from 'vitest'
import type { Brief, Starter } from '@shared/types'
import { briefToMarkdown } from './brief'
import { MAX_STARTER_FILES, starterInfo, starterToMarkdown, validateStarter } from './starter'

const brief: Brief = {
  title: 'Task Tracker CLI',
  summary: 'A command-line tool that keeps a to-do list in a file.',
  stack: 'Python 3, standard library',
  estimatedHours: 6,
  requirements: ['Add a task with a description.'],
  example: '$ task add "Buy milk"\nAdded task 1',
  stages: [
    { title: 'Say hello', goal: 'Change what the starter prints.', doneWhen: ['Running it prints your own line.'] },
    { title: 'Add a task', goal: 'Save one task.', doneWhen: ['A new task appears in the file.'] }
  ]
}

const starter: Starter = {
  files: [
    { path: 'task.py', content: 'print("Task tracker")\n# TODO (stage 2): add a task\n' },
    { path: 'tests/test_task.py', content: 'import unittest\n' },
    { path: '.gitignore', content: '__pycache__/\n' }
  ],
  setup: ['python -m venv .venv'],
  run: 'python task.py',
  testCommand: 'python -m unittest',
  tests: [
    { stage: 1, file: 'tests/test_task.py', name: 'test_prints_a_line', observes: 'Running the program prints one line.' },
    { stage: 2, file: 'tests/test_task.py', name: 'test_add', observes: 'Adding a task prints its new id.' }
  ]
}

const withFiles = (files: Starter['files']): Starter => ({ ...starter, files, tests: [] })

describe('validateStarter', () => {
  it('accepts a sound starter and returns it unchanged', () => {
    expect(validateStarter(starter, brief)).toEqual(starter)
  })

  it('returns paths with forward slashes and commands without stray spaces or empty entries', () => {
    const checked = validateStarter(
      { ...starter, files: [{ path: 'src\\task.py', content: '' }], setup: ['  pip install flask  ', '   '], run: ' python task.py ', tests: [] },
      brief
    )
    expect(checked.files[0].path).toBe('src/task.py')
    expect(checked.setup).toEqual(['pip install flask'])
    expect(checked.run).toBe('python task.py')
  })

  it('refuses a starter with no files, or with too many', () => {
    expect(() => validateStarter(withFiles([]), brief)).toThrow('no files')
    const many = Array.from({ length: MAX_STARTER_FILES + 1 }, (_, i) => ({ path: `file${i}.py`, content: '' }))
    expect(() => validateStarter(withFiles(many), brief)).toThrow('The starter has 16 files. The limit is 15.')
    expect(() => validateStarter(withFiles(many.slice(0, MAX_STARTER_FILES)), brief)).not.toThrow()
  })

  it('refuses any unsafe path, and dot names other than .gitignore', () => {
    for (const path of ['../evil.py', 'C:\\Windows\\x.py', '/etc/x', 'a/CON.txt', 'x:stream', '.vscode/settings.json', '.git/hooks/pre-commit']) {
      expect(() => validateStarter(withFiles([{ path, content: '' }]), brief), path).toThrow("can't be used")
    }
  })

  it('refuses a starter that tries to replace the assignment', () => {
    expect(() => validateStarter(withFiles([{ path: 'assignment.MD', content: '' }]), brief)).toThrow('replace ASSIGNMENT.md')
  })

  it('refuses a file that is too large, a total that is too large, and a file that is not text', () => {
    const big = 'x'.repeat(33 * 1024)
    expect(() => validateStarter(withFiles([{ path: 'big.py', content: big }]), brief)).toThrow('big.py in the starter is 33 KB')
    const five = Array.from({ length: 5 }, (_, i) => ({ path: `f${i}.py`, content: 'x'.repeat(30 * 1024) }))
    expect(() => validateStarter(withFiles(five), brief)).toThrow('150 KB in total')
    expect(() => validateStarter(withFiles([{ path: 'a.bin', content: 'a\u0000b' }]), brief)).toThrow('not a text file')
  })

  it('refuses two files that land on the same name, and a name used as both file and folder', () => {
    const twice = [
      { path: 'README.md', content: '' },
      { path: 'readme.md', content: '' }
    ]
    expect(() => validateStarter(withFiles(twice), brief)).toThrow('same name: README.md and readme.md')
    const both = [
      { path: 'app', content: '' },
      { path: 'App/main.py', content: '' }
    ]
    expect(() => validateStarter(withFiles(both), brief)).toThrow('uses App as both a file and a folder')
  })

  it('refuses a package.json with a script npm runs on install, in any folder', () => {
    for (const script of ['preinstall', 'install', 'postinstall', 'prepare']) {
      const content = JSON.stringify({ name: 'x', scripts: { start: 'node index.js', [script]: 'node setup.js' } })
      expect(() => validateStarter(withFiles([{ path: 'web/package.json', content }]), brief), script).toThrow(`has a "${script}" script`)
    }
    const fine = JSON.stringify({ name: 'x', scripts: { start: 'node index.js', test: 'node --test' } })
    expect(() => validateStarter(withFiles([{ path: 'package.json', content: fine }]), brief)).not.toThrow()
    expect(() => validateStarter(withFiles([{ path: 'package.json', content: 'not json' }]), brief)).not.toThrow()
  })

  it('refuses a missing run command, and commands with a line break', () => {
    expect(() => validateStarter({ ...starter, run: '  ' }, brief)).toThrow('does not say how to start')
    expect(() => validateStarter({ ...starter, setup: ['pip install flask\nrm -rf x'] }, brief)).toThrow('line break or control character')
    expect(() => validateStarter({ ...starter, testCommand: 'pytest\r' + 'x' }, brief)).toThrow('line break or control character')
  })

  it('refuses tests that point at a stage or a file that does not exist, and tests with no command', () => {
    const test = starter.tests[0]
    expect(() => validateStarter({ ...starter, tests: [{ ...test, stage: 3 }] }, brief)).toThrow('points at stage 3, and the brief has 2 stages')
    expect(() => validateStarter({ ...starter, tests: [{ ...test, stage: 0 }] }, brief)).toThrow('points at stage 0')
    expect(() => validateStarter({ ...starter, tests: [{ ...test, file: 'tests/missing.py' }] }, brief)).toThrow('not one of its files')
    expect(() => validateStarter({ ...starter, testCommand: '' }, brief)).toThrow('tests but no command')
  })
})

describe('starterInfo', () => {
  it('keeps everything but the file contents', () => {
    expect(starterInfo(starter)).toEqual({
      files: ['task.py', 'tests/test_task.py', '.gitignore'],
      setup: starter.setup,
      run: starter.run,
      testCommand: starter.testCommand,
      tests: starter.tests
    })
  })
})

describe('starterToMarkdown', () => {
  const md = starterToMarkdown(starterInfo(starter), brief)

  it('lists the setup and run commands, and says to read them first', () => {
    expect(md).toContain('## Getting started\n')
    expect(md).toContain('read a command before you run it')
    expect(md).toContain('Set up, once:\n\n```\npython -m venv .venv\n```\n')
    expect(md).toContain('Start the project:\n\n```\npython task.py\n```\n')
  })

  it('leaves out the setup block when there is nothing to set up', () => {
    expect(starterToMarkdown({ ...starterInfo(starter), setup: [] }, brief)).not.toContain('Set up, once')
  })

  it('says where the tests are, how to run them, and what each one looks at, by stage', () => {
    expect(md).toContain('## Tests\n')
    expect(md).toContain('The tests are in `tests/test_task.py`. They are yours: change them and add your own.')
    expect(md).toContain('Run them:\n\n```\npython -m unittest\n```\n')
    expect(md).toContain('**Stage 1: Say hello**\n\n- `test_prints_a_line`: Running the program prints one line.\n')
    expect(md).toContain('**Stage 2: Add a task**\n\n- `test_add`: Adding a task prints its new id.\n')
  })

  it('has no Tests section when the starter has no tests', () => {
    expect(starterToMarkdown({ ...starterInfo(starter), testCommand: '', tests: [] }, brief)).not.toContain('## Tests')
  })
})

describe('briefToMarkdown with a starter', () => {
  it('puts Getting started and Tests between the example and the stages', () => {
    const md = briefToMarkdown(brief, starterInfo(starter))
    const order = ['## What finished looks like', '## Getting started', '## Tests', '## Stages'].map((heading) => md.indexOf(heading))
    expect(order.every((at) => at >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    // One blank line between the last test and the next heading.
    expect(md).toContain('Adding a task prints its new id.\n\n## Stages\n')
  })

  it('is unchanged without one', () => {
    expect(briefToMarkdown(brief)).not.toContain('Getting started')
  })
})
