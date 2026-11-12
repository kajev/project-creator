import type { Brief } from '@shared/types'

/** Names Windows refuses as a file or folder name, whatever the letter case. */
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/

/** Turns a project title into a folder name that is safe on Windows, macOS and Linux. */
export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // drop accents: "Café" becomes "cafe"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  if (!slug) return 'project'
  return RESERVED.test(slug) ? `${slug}-project` : slug
}

/** The text of ASSIGNMENT.md: the brief as the user reads it. */
export function briefToMarkdown(brief: Brief): string {
  const hours = `about ${brief.estimatedHours} ${brief.estimatedHours === 1 ? 'hour' : 'hours'}`
  const lines = [
    `# ${brief.title}`,
    '',
    brief.summary,
    '',
    `- **Stack:** ${brief.stack}`,
    `- **Estimated time:** ${hours}`,
    '',
    '## Requirements',
    '',
    ...brief.requirements.map((item, i) => `${i + 1}. ${item}`),
    '',
    '## What finished looks like',
    '',
    brief.example,
    '',
    '## Stages',
    ''
  ]
  brief.stages.forEach((stage, i) => {
    lines.push(`### Stage ${i + 1}: ${stage.title}`, '', stage.goal, '', 'Done when:', '')
    lines.push(...stage.doneWhen.map((item) => `- [ ] ${item}`), '')
  })
  return lines.join('\n')
}
