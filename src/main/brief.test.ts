import { describe, expect, it } from 'vitest'
import type { Brief } from '@shared/types'
import { BriefSchema, briefToMarkdown, parseWith, slugify } from './brief'

describe('slugify', () => {
  it('lowercases and joins words with dashes', () => {
    expect(slugify('Task Tracker CLI')).toBe('task-tracker-cli')
  })

  it('removes characters Windows does not allow in folder names', () => {
    expect(slugify('Notes: "Quick" <Search>? v2/3*')).toBe('notes-quick-search-v2-3')
  })

  it('drops accents and trims dashes from both ends', () => {
    expect(slugify('  Café Finder!  ')).toBe('cafe-finder')
  })

  it('avoids names Windows reserves', () => {
    expect(slugify('CON')).toBe('con-project')
    expect(slugify('Lpt1')).toBe('lpt1-project')
  })

  it('falls back to "project" when nothing usable is left', () => {
    expect(slugify('???')).toBe('project')
    expect(slugify('')).toBe('project')
  })

  it('caps the length at 60 and never ends with a dash', () => {
    const slug = slugify(`${'a'.repeat(59)} tail`)
    expect(slug).toBe('a'.repeat(59))
    expect(slugify('b'.repeat(100))).toHaveLength(60)
  })
})

const brief: Brief = {
  title: 'Task Tracker CLI',
  summary: 'A command-line tool that keeps a to-do list in a file.',
  stack: 'Python 3, standard library',
  estimatedHours: 6,
  requirements: ['Add a task with a description.', 'List tasks, optionally by status.'],
  example: '$ task add "Buy milk"\nAdded task 1',
  stages: [
    {
      title: 'Say hello',
      goal: 'Get a program running.',
      why: 'A running program is the base every later stage adds to.',
      doneWhen: ['Running it prints a usage line.']
    },
    // No "why": briefs written before stages had reasoning look like this.
    { title: 'Add a task', goal: 'Save one task.', doneWhen: ['A new task appears in the file.', 'It has an id.'] }
  ]
}

describe('briefToMarkdown', () => {
  const md = briefToMarkdown(brief)

  it('starts with the title and summary', () => {
    expect(md.startsWith('# Task Tracker CLI\n\nA command-line tool that keeps a to-do list in a file.\n')).toBe(true)
  })

  it('shows the stack and the time estimate', () => {
    expect(md).toContain('- **Stack:** Python 3, standard library')
    expect(md).toContain('- **Estimated time:** about 6 hours')
    expect(briefToMarkdown({ ...brief, estimatedHours: 1 })).toContain('about 1 hour\n')
  })

  it('numbers the requirements', () => {
    expect(md).toContain('## Requirements\n\n1. Add a task with a description.\n2. List tasks, optionally by status.\n')
  })

  it('includes the example under its own heading', () => {
    expect(md).toContain('## What finished looks like\n\n$ task add "Buy milk"\nAdded task 1\n')
  })

  it('numbers the stages and lists each "done when" item as a checkbox', () => {
    expect(md).toContain(
      '### Stage 1: Say hello\n\nGet a program running.\n\n**Why this stage:** A running program is the base every later stage adds to.\n\nDone when:\n\n- [ ] Running it prints a usage line.\n'
    )
    expect(md).toContain('### Stage 2: Add a task\n\nSave one task.\n\nDone when:\n\n- [ ] A new task appears in the file.\n- [ ] It has an id.\n')
  })

  it('gives the reasoning only for stages that have it', () => {
    expect(md.match(/\*\*Why this stage:\*\*/g)).toHaveLength(1)
  })

  it('still accepts a brief whose stages have no reasoning', () => {
    expect(parseWith(BriefSchema, brief).stages[1].why).toBeUndefined()
  })
})
