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

/** A starter for FAKE_BRIEF: it runs, prints a placeholder, and leaves every stage to the learner. */
export const FAKE_STARTER = {
  files: [
    {
      path: 'task.py',
      content:
        '"""Task tracker. Start it with: python task.py"""\n\n\ndef main():\n    # TODO (stage 1): print a usage line instead of this placeholder\n    print("Task tracker starter")\n\n\nif __name__ == "__main__":\n    main()\n'
    },
    {
      path: 'tests/test_task.py',
      content:
        'import subprocess\nimport sys\nimport unittest\n\n\ndef run(*args):\n    return subprocess.run([sys.executable, "task.py", *args], capture_output=True, text=True)\n\n\n# Stage 1: Say hello\nclass Stage1(unittest.TestCase):\n    def test_usage_line(self):\n        self.assertTrue(run().stdout.lower().startswith("usage"))\n\n\n# Stage 2: Add a task. Remove the skip line when you reach this stage.\n@unittest.skip("stage 2")\nclass Stage2(unittest.TestCase):\n    def test_add_prints_id(self):\n        self.assertIn("1", run("add", "Buy milk").stdout)\n'
    },
    { path: '.gitignore', content: '__pycache__/\n.venv/\n' }
  ],
  setup: ['python -m venv .venv'],
  run: 'python task.py',
  testCommand: 'python -m unittest discover tests',
  tests: [
    { stage: 1, file: 'tests/test_task.py', name: 'test_usage_line', observes: 'Running the program with no arguments prints a line that starts with "usage".' },
    { stage: 2, file: 'tests/test_task.py', name: 'test_add_prints_id', observes: 'Adding a task prints the id it was given.' }
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
/** These three only affect the starter call. The proposals and the brief still come back as usual. */
export const STARTER_CUT_OFF = 'E2E_STARTER_CUT_OFF'
export const STARTER_UNSAFE = 'E2E_STARTER_UNSAFE'
export const STARTER_TOO_BIG = 'E2E_STARTER_TOO_BIG'

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

    const message = { id: 'msg_e2e', type: 'message', role: 'assistant', model: body.model, stop_sequence: null }
    const usage = { input_tokens: 1, output_tokens: 1 }

    /** The same reply as server-sent events, the way the API answers a request with "stream": true. */
    const stream = (text: string, stop_reason: string): void => {
      const half = Math.ceil(text.length / 2)
      const events: [string, unknown][] = [
        ['message_start', { message: { ...message, content: [], stop_reason: null, usage } }],
        ['content_block_start', { index: 0, content_block: { type: 'text', text: '' } }],
        ['content_block_delta', { index: 0, delta: { type: 'text_delta', text: text.slice(0, half) } }],
        ['content_block_delta', { index: 0, delta: { type: 'text_delta', text: text.slice(half) } }],
        ['content_block_stop', { index: 0 }],
        ['message_delta', { delta: { stop_reason, stop_sequence: null }, usage: { output_tokens: 1 } }],
        ['message_stop', {}]
      ]
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
      res.end(events.map(([type, data]) => `event: ${type}\ndata: ${JSON.stringify({ type, ...(data as object) })}\n\n`).join(''), () => served++)
    }

    const reply = (text: string, stop_reason: string): void =>
      body.stream ? stream(text, stop_reason) : send(200, { ...message, content: [{ type: 'text', text }], stop_reason, usage })

    const asked = JSON.stringify(body.messages)
    if (asked.includes(CUT_OFF)) return reply('{"proposals": [{"title": "Task Tr', 'max_tokens')
    if (asked.includes(REFUSAL)) return reply('I can not help with that.', 'refusal')
    if (asked.includes(WRONG_SHAPE)) return reply('{"something": "else"}', 'end_turn')

    // The three calls differ in the shape they ask for, so answer by that.
    const shape = JSON.stringify(body.output_config ?? {})
    if (shape.includes('proposals')) return reply(JSON.stringify({ proposals: FAKE_PROPOSALS }), 'end_turn')
    if (!shape.includes('testCommand')) return reply(JSON.stringify(FAKE_BRIEF), 'end_turn')

    if (asked.includes(STARTER_CUT_OFF)) return reply('{"files": [{"path": "task.py", "content": "print(', 'max_tokens')
    let starter = FAKE_STARTER
    if (asked.includes(STARTER_UNSAFE)) starter = { ...starter, files: [...starter.files, { path: '../evil.py', content: 'print("outside")\n' }] }
    if (asked.includes(STARTER_TOO_BIG)) {
      starter = { ...starter, files: Array.from({ length: 16 }, (_, i) => ({ path: `file${i}.py`, content: '' })), tests: [] }
    }
    // A request that says "Tests: no" gets a starter without them, as the prompt asks.
    if (asked.includes('Tests: no')) {
      starter = { ...starter, files: starter.files.filter((file) => !file.path.startsWith('tests/')), testCommand: '', tests: [] }
    }
    reply(JSON.stringify(starter), 'end_turn')
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
