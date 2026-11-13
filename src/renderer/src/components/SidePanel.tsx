import { useEffect, useState } from 'react'
import type { Brief, Progress, StarterInfo } from '@shared/types'

type PanelTab = 'brief' | 'tutor'

interface SidePanelProps {
  /** The open project's brief, or null when the folder has none. */
  brief: Brief | null
  /** How to run the project's starter and what its tests look at, or null when it has no starter. */
  starter: StarterInfo | null
  /** Which "done when" items are ticked: ticked[stage][item]. A missing entry is not ticked. */
  ticked: Progress
  onTick: (stage: number, item: number, value: boolean) => void
}

export function SidePanel({ brief, starter, ticked, onTick }: SidePanelProps): React.JSX.Element {
  const [tab, setTab] = useState<PanelTab>('brief')

  return (
    <section className="panel side-panel" aria-label="Guide">
      <div className="side-tabs" role="tablist" aria-label="Guide">
        <button role="tab" aria-selected={tab === 'brief'} className={`side-tab${tab === 'brief' ? ' active' : ''}`} onClick={() => setTab('brief')}>
          Brief
        </button>
        <button role="tab" aria-selected={tab === 'tutor'} className={`side-tab${tab === 'tutor' ? ' active' : ''}`} onClick={() => setTab('tutor')}>
          Tutor
        </button>
      </div>

      {tab === 'brief' ? (
        <BriefView brief={brief} starter={starter} ticked={ticked} onTick={onTick} />
      ) : (
        <div className="side-body">
          <p className="empty-text">The tutor is not built yet.</p>
        </div>
      )}
    </section>
  )
}

/** A command the user runs themselves. The app shows it and can copy it, and never runs it. */
function Command({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = (): void => {
    navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false)
    )
  }

  return (
    <div className="command">
      <code>{text}</code>
      <button type="button" className="button small" onClick={copy} aria-label={`Copy: ${text}`}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function BriefView({ brief, starter, ticked, onTick }: SidePanelProps): React.JSX.Element {
  if (!brief) {
    return (
      <div className="side-body">
        <p className="empty-text">This folder has no brief. Projects made with &ldquo;Start a new project&rdquo; get one.</p>
      </div>
    )
  }

  const isTicked = (stage: number, item: number): boolean => ticked[stage]?.[item] === true
  // The stage to work on: the first one with something left to tick. -1 once everything is ticked.
  const current = brief.stages.findIndex((stage, i) => stage.doneWhen.some((_, j) => !isTicked(i, j)))

  return (
    <div className="side-body">
      <h3 className="brief-title">{brief.title}</h3>
      <p className="brief-meta">
        {brief.stack}, about {brief.estimatedHours} {brief.estimatedHours === 1 ? 'hour' : 'hours'}
      </p>
      <p className="brief-text">{brief.summary}</p>

      {starter && (
        <>
          <h4 className="brief-heading">Getting started</h4>
          <p className="brief-text">
            The project already has starter files that run. The AI wrote them and these commands, so read a command before
            you run it. Paste it into the terminal and press Enter.
          </p>
          {starter.setup.length > 0 && <p className="command-label">Set up, once</p>}
          {starter.setup.map((command, i) => (
            <Command key={i} text={command} />
          ))}
          <p className="command-label">Start the project</p>
          <Command text={starter.run} />
          {starter.tests.length > 0 && (
            <>
              <p className="command-label">Run the tests</p>
              <Command text={starter.testCommand} />
              <p className="brief-text command-note">
                The tests are in {[...new Set(starter.tests.map((test) => test.file))].join(', ')}, and you can add your own.
                Only stage 1&rsquo;s tests are switched on. Each later group is skipped until you remove its skip marker.
              </p>
            </>
          )}
        </>
      )}

      <h4 className="brief-heading">Requirements</h4>
      <ol className="brief-list">
        {brief.requirements.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>

      <h4 className="brief-heading">What finished looks like</h4>
      <pre className="brief-example">{brief.example}</pre>

      <h4 className="brief-heading">Stages</h4>
      <ol className="brief-stages">
        {brief.stages.map((stage, i) => {
          const tests = starter ? starter.tests.filter((test) => test.stage === i + 1) : []
          return (
            <li key={i} className={i === current ? 'current' : undefined} aria-current={i === current ? 'step' : undefined}>
              <span className="stage-name">{stage.title}</span>
              <span className="stage-goal">{stage.goal}</span>
              {stage.why && <span className="stage-why">Why this stage: {stage.why}</span>}
              <span className="stage-done-label">Done when</span>
              <ul className="stage-done">
                {stage.doneWhen.map((item, j) => (
                  <li key={j}>
                    <label className="tick">
                      <input type="checkbox" checked={isTicked(i, j)} onChange={(e) => onTick(i, j, e.target.checked)} />
                      <span>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {tests.length > 0 && (
                <>
                  <span className="stage-done-label">What the tests look at</span>
                  <ul className="stage-tests">
                    {tests.map((test) => (
                      <li key={test.name}>
                        <code>{test.name}</code> {test.observes}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
