import { expect, test } from '@playwright/test'
import { BAD_KEY, CUT_OFF, FAKE_BRIEF, FAKE_PROPOSALS, GOOD_KEY, REFUSAL, startFakeAnthropic, WRONG_SHAPE } from './fake-anthropic'
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
