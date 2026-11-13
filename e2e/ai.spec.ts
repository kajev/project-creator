import { expect, test } from '@playwright/test'
import {
  BAD_KEY,
  CUT_OFF,
  FAKE_BRIEF,
  FAKE_PROPOSALS,
  FAKE_STARTER,
  GOOD_KEY,
  REFUSAL,
  STARTER_CUT_OFF,
  STARTER_TOO_BIG,
  STARTER_UNSAFE,
  startFakeAnthropic,
  WRONG_SHAPE
} from './fake-anthropic'
import { launchApp } from './launch'

const INPUT = { interests: 'command-line tools I would use myself', level: 'some' as const, language: '', hours: 6 }

test('proposals and the brief come back through the SDK using the stored key', async () => {
  const fake = await startFakeAnthropic()
  const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })
  await win.evaluate((key) => window.api.ai.setKey(key), GOOD_KEY)

  const proposals = await win.evaluate((input) => window.api.ai.proposeProjects(input), INPUT)
  expect(proposals).toHaveLength(3)
  expect(proposals.map((p) => p.title)).toEqual(FAKE_PROPOSALS.map((p) => p.title))

  const brief = await win.evaluate(([input, proposal]) => window.api.ai.writeBrief(input, proposal), [INPUT, proposals[0]] as const)
  expect(brief.title).toBe(FAKE_BRIEF.title)
  expect(brief.stages.length).toBeGreaterThanOrEqual(5)
  expect(brief.stages.length).toBeLessThanOrEqual(10)

  // What the SDK actually sent.
  expect(fake.requests).toHaveLength(2)
  for (const request of fake.requests) {
    expect(request.apiKey).toBe(GOOD_KEY)
    expect(request.body.model).toBe('claude-opus-5-5')
    expect(request.body.output_config.format.type).toBe('json_schema')
  }
  const proposalPrompt = JSON.stringify(fake.requests[0].body.messages)
  expect(proposalPrompt).toContain('command-line tools I would use myself')
  expect(proposalPrompt).toContain('6 hours')
  expect(JSON.stringify(fake.requests[1].body.messages)).toContain(FAKE_PROPOSALS[0].title)

  // The reply shape is also written into the prompt, for servers that ignore output_config.
  expect(fake.requests[0].body.system).toContain('JSON Schema')
  expect(fake.requests[0].body.system).toContain('"proposals"')
  expect(fake.requests[1].body.system).toContain('"doneWhen"')

  await app.close()
  await fake.close()
})

test('a rejected key gives a clear message and is forgotten', async () => {
  const fake = await startFakeAnthropic()
  const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })
  await win.evaluate((key) => window.api.ai.setKey(key), BAD_KEY)

  const error = await win.evaluate((input) => window.api.ai.proposeProjects(input).then(() => null, (e: Error) => e.message), INPUT)
  expect(error).toContain('Claude rejected that API key')
  expect(await win.evaluate(() => window.api.ai.hasKey())).toBe(false)

  await app.close()
  await fake.close()
})

// Each of these replies has text that is not the JSON we asked for. The message must say what happened,
// not report a JSON syntax error.
const BAD_REPLIES = [
  { word: CUT_OFF, how: 'is cut off', expected: 'The reply was cut off before it finished.' },
  { word: REFUSAL, how: 'is a refusal', expected: 'Claude declined this request.' },
  { word: WRONG_SHAPE, how: 'has the wrong shape', expected: "The reply wasn't in the expected format." }
]
for (const { word, how, expected } of BAD_REPLIES) {
  test(`a reply that ${how} gets a message that says so`, async () => {
    const fake = await startFakeAnthropic()
    const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })
    await win.evaluate((key) => window.api.ai.setKey(key), GOOD_KEY)

    const error = await win.evaluate(
      (input) => window.api.ai.proposeProjects(input).then(() => null, (e: Error) => e.message),
      { ...INPUT, interests: `anything ${word}` }
    )
    expect(error).toContain(expected)
    expect(error).not.toContain('JSON')
    // The key is fine, so it is kept.
    expect(await win.evaluate(() => window.api.ai.hasKey())).toBe(true)

    await app.close()
    await fake.close()
  })
}

test('starter files come back through a streamed request, with or without tests', async () => {
  const fake = await startFakeAnthropic()
  const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })
  await win.evaluate((key) => window.api.ai.setKey(key), GOOD_KEY)

  const starter = await win.evaluate(([input, brief]) => window.api.ai.writeStarter(input, brief, true), [INPUT, FAKE_BRIEF] as const)
  expect(starter).toEqual(FAKE_STARTER)

  // What the SDK actually sent: a streamed request that carries the brief and names the terminal.
  const request = fake.requests[0]
  expect(request.apiKey).toBe(GOOD_KEY)
  expect(request.body.stream).toBe(true)
  expect(request.body.model).toBe('claude-opus-5-5')
  expect(request.body.output_config.format.type).toBe('json_schema')
  expect(request.body.system).toContain('"testCommand"')
  const sent = JSON.stringify(request.body.messages)
  expect(sent).toContain(FAKE_BRIEF.title)
  expect(sent).toContain(FAKE_BRIEF.stages[5].title)
  expect(sent).toContain('Tests: yes')
  expect(sent).toContain({ win32: 'PowerShell', darwin: 'zsh', linux: 'bash' }[process.platform as 'win32' | 'darwin' | 'linux'])

  // Without tests the request says so, and the starter has none.
  const plain = await win.evaluate(([input, brief]) => window.api.ai.writeStarter(input, brief, false), [INPUT, FAKE_BRIEF] as const)
  expect(JSON.stringify(fake.requests[1].body.messages)).toContain('Tests: no')
  expect(plain.files.map((file) => file.path)).toEqual(['task.py', '.gitignore'])
  expect(plain.testCommand).toBe('')
  expect(plain.tests).toEqual([])

  await app.close()
  await fake.close()
})

// A starter that may not be written is stopped in the main process, before the UI ever holds it.
const BAD_STARTERS = [
  { word: STARTER_CUT_OFF, how: 'is cut off', expected: 'The reply was cut off before it finished.' },
  { word: STARTER_UNSAFE, how: 'has a path outside the project', expected: `"../evil.py" can't be used` },
  { word: STARTER_TOO_BIG, how: 'has too many files', expected: 'The starter has 16 files. The limit is 15.' }
]
for (const { word, how, expected } of BAD_STARTERS) {
  test(`a starter that ${how} is refused with a message that says so`, async () => {
    const fake = await startFakeAnthropic()
    const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })
    await win.evaluate((key) => window.api.ai.setKey(key), GOOD_KEY)

    const error = await win.evaluate(
      ([input, brief]) => window.api.ai.writeStarter(input, brief, true).then(() => null, (e: Error) => e.message),
      [{ ...INPUT, interests: `anything ${word}` }, FAKE_BRIEF] as const
    )
    expect(error).toContain(expected)

    await app.close()
    await fake.close()
  })
}

test('the brief is asked for differently when starter files will be written', async () => {
  const fake = await startFakeAnthropic()
  const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })
  await win.evaluate((key) => window.api.ai.setKey(key), GOOD_KEY)

  await win.evaluate(([input, proposal]) => window.api.ai.writeBrief(input, proposal, true), [INPUT, FAKE_PROPOSALS[0]] as const)
  await win.evaluate(([input, proposal]) => window.api.ai.writeBrief(input, proposal), [INPUT, FAKE_PROPOSALS[0]] as const)
  expect(fake.requests[0].body.system).toContain('starter files that already run')
  expect(fake.requests[1].body.system).not.toContain('starter files that already run')

  await app.close()
  await fake.close()
})

test('without a key, nothing is sent', async () => {
  const fake = await startFakeAnthropic()
  const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })

  const error = await win.evaluate((input) => window.api.ai.proposeProjects(input).then(() => null, (e: Error) => e.message), INPUT)
  expect(error).toContain('Add your Claude API key first.')
  expect(fake.requests).toHaveLength(0)

  await app.close()
  await fake.close()
})

test('answers that make no sense are refused before anything is sent', async () => {
  const fake = await startFakeAnthropic()
  const { app, win } = await launchApp({ env: { ANTHROPIC_BASE_URL: fake.url } })
  await win.evaluate((key) => window.api.ai.setKey(key), GOOD_KEY)

  const error = await win.evaluate(
    (input) => window.api.ai.proposeProjects(input).then(() => null, (e: Error) => e.message),
    { ...INPUT, interests: '   ' }
  )
  expect(error).toContain('Say what you want to build or learn.')
  expect(fake.requests).toHaveLength(0)

  await app.close()
  await fake.close()
})
