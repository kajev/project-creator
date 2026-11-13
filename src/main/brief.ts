import { z } from 'zod'
import type { Brief, Proposal, ProposalInput, StarterInfo } from '@shared/types'
import { starterToMarkdown } from './starter'

/*
 * Runtime shapes for the types in shared/types.ts. ProposalSchema and
 * BriefSchema are also what Claude's replies must match, so they stay free of
 * length limits (structured outputs only support plain types).
 */
export const ProposalInputSchema = z.object({
  interests: z.string().trim().min(1, 'Say what you want to build or learn.').max(2000, 'Keep that under 2000 characters.'),
  level: z.enum(['new', 'some', 'comfortable']),
  language: z.string().trim().max(60, 'Keep the language under 60 characters.'),
  hours: z.number().min(1, 'Hours must be at least 1.').max(500, 'Hours must be 500 or fewer.')
}) satisfies z.ZodType<ProposalInput>

export const ProposalSchema = z.object({
  title: z.string(),
  pitch: z.string(),
  stack: z.string(),
  estimatedHours: z.number(),
  skills: z.array(z.string())
}) satisfies z.ZodType<Proposal>

export const BriefSchema = z.object({
  title: z.string(),
  summary: z.string(),
  stack: z.string(),
  estimatedHours: z.number(),
  requirements: z.array(z.string()),
  example: z.string(),
  stages: z.array(z.object({ title: z.string(), goal: z.string(), why: z.string().optional(), doneWhen: z.array(z.string()) }))
}) satisfies z.ZodType<Brief>

/** Checks a value that crossed the IPC bridge or came from disk. Throws a one-line message when it does not fit. */
export function parseWith<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? 'That value has the wrong shape.')
  return result.data
}

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

/** The text of ASSIGNMENT.md: the brief as the user reads it, with how to run the starter when there is one. */
export function briefToMarkdown(brief: Brief, starter?: StarterInfo): string {
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
    ...(starter ? [starterToMarkdown(starter, brief)] : []),
    '## Stages',
    ''
  ]
  brief.stages.forEach((stage, i) => {
    lines.push(`### Stage ${i + 1}: ${stage.title}`, '', stage.goal, '')
    if (stage.why) lines.push(`**Why this stage:** ${stage.why}`, '')
    lines.push('Done when:', '', ...stage.doneWhen.map((item) => `- [ ] ${item}`), '')
  })
  return lines.join('\n')
}
