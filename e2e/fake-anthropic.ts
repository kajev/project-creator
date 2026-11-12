import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

/*
 * A stand-in for the Claude API. The app is launched with ANTHROPIC_BASE_URL
 * pointing here, so the real SDK code runs but no request leaves the machine
 * and no money is spent.
 */

/** Not real keys. BAD_KEY makes the fake server answer 401. */
export const GOOD_KEY = 'sk-ant-e2e-not-a-real-key-0123456789'
export const BAD_KEY = 'sk-ant-e2e-rejected-key'

export const FAKE_PROPOSALS = [
  {
    title: 'Task Tracker CLI',
    pitch: 'A command-line to-do list that saves to a file. Small, useful, and you will use it yourself.',
    stack: 'Python 3, standard library',
    estimatedHours: 6,
    skills: ['Reading command-line arguments', 'Saving data as JSON', 'Handling bad input']
  },
  {
    title: 'Markdown Link Checker',
    pitch: 'Scans a folder of notes and reports links that no longer work.',
    stack: 'Python 3, standard library',
    estimatedHours: 5,
    skills: ['Walking a folder tree', 'Pattern matching', 'Making web requests']
  },
  {
    title: 'Unit Converter',
    pitch: 'Converts between everyday units from the terminal, with a table you can extend.',
    stack: 'Python 3, standard library',
    estimatedHours: 4,
    skills: ['Designing a small data table', 'Parsing input', 'Writing tests']
  }
]

export const FAKE_BRIEF = {
  title: 'Task Tracker CLI',
  summary: 'You are building a to-do list you run from the terminal. It keeps your tasks in a file, so they are still there tomorrow.',
  stack: 'Python 3, standard library',
  estimatedHours: 6,
  requirements: [
    'Add a task with a description.',
    'List all tasks, or only the ones with a given status.',
    'Mark a task as in progress or done.',
    'Delete a task.',
    'Keep tasks between runs.'
  ],
  example: '$ task add "Buy milk"\nAdded task 1\n$ task list\n1  todo  Buy milk',
  stages: [
    {
      title: 'Say hello',
      goal: 'Get a program that runs.',
      // Long on purpose: the end-to-end test uses this line to check that the editor wraps.
      why: 'Starting with something that runs gives you a working base and proves your setup is right before there is any real logic to get wrong. Every later stage adds to this program instead of starting over.',
      doneWhen: ['Running it with no arguments prints a usage line.']
    },
    {
      title: 'Add a task',
      goal: 'Accept a description and confirm it.',
      why: 'Adding comes first because nothing else can be tried until a task exists.',
      doneWhen: ['Adding a task prints its new id.', 'An empty description is refused.']
    },
    {
      title: 'Remember tasks',
      goal: 'Keep tasks between runs.',
      why: 'Saving early means every later stage works with real saved data.',
      doneWhen: ['A task added in one run shows up in the next.']
    },
    {
      title: 'List tasks',
      goal: 'Show what is saved.',
      why: 'Listing lets you see what the earlier stages stored, so mistakes show up.',
      doneWhen: ['Listing prints every task with its id and status.']
    },
    {
      title: 'Change status',
      goal: 'Move a task along.',
      why: 'Changing a task means finding it by its id, which deleting needs too.',
      doneWhen: ['Marking a task done changes what the list shows.', 'An unknown id gives a clear message.']
    },
    {
      title: 'Delete a task',
      goal: 'Remove what you no longer need.',
      why: 'Deleting comes last because it reuses what the earlier stages set up.',
      doneWhen: ['A deleted task no longer appears in the list.']
    }
  ]
}

export interface FakeRequest {
  apiKey: string | undefined
  // The JSON body the SDK sent, as-is.
  body: any
}

export interface FakeAnthropic {
  url: string
  requests: FakeRequest[]
  /** How many replies have been fully sent. */
  readonly served: number
  close(): Promise<void>
}

/**
 * Put one of these words in the "What do you want to build" answer to get a reply that went wrong
 * in that particular way.
 */
export const CUT_OFF = 'E2E_CUT_OFF'
export const REFUSAL = 'E2E_REFUSAL'
export const WRONG_SHAPE = 'E2E_WRONG_SHAPE'

/** `delayMs` holds every reply back, to test what happens while the app is waiting. */
export async function startFakeAnthropic(options: { delayMs?: number } = {}): Promise<FakeAnthropic> {
  const requests: FakeRequest[] = []
  let served = 0

  const server = createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs))
    const send = (status: number, payload: unknown): void => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(payload), () => served++)
    }

    if (req.method !== 'POST' || !req.url?.startsWith('/v1/messages')) {
      send(404, { type: 'error', error: { type: 'not_found_error', message: `no route for ${req.method} ${req.url}` } })
      return
    }
    const body = JSON.parse(raw)
    // SDK 1.x sends the key as "Authorization: Bearer <key>".
    const apiKey = req.headers.authorization?.replace(/^Bearer /, '')
    requests.push({ apiKey, body })

    if (apiKey === BAD_KEY) {
      send(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })
      return
    }

    const reply = (text: string, stop_reason: string): void =>
      send(200, {
        id: 'msg_e2e',
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: [{ type: 'text', text }],
        stop_reason,
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 }
      })

    const asked = JSON.stringify(body.messages)
    if (asked.includes(CUT_OFF)) return reply('{"proposals": [{"title": "Task Tr', 'max_tokens')
    if (asked.includes(REFUSAL)) return reply('I can not help with that.', 'refusal')
    if (asked.includes(WRONG_SHAPE)) return reply('{"something": "else"}', 'end_turn')

    // The two calls differ in the shape they ask for, so answer by that.
    const wantsProposals = JSON.stringify(body.output_config ?? {}).includes('proposals')
    reply(JSON.stringify(wantsProposals ? { proposals: FAKE_PROPOSALS } : FAKE_BRIEF), 'end_turn')
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    get served() {
      return served
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      })
  }
}
