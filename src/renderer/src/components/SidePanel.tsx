import { useState } from 'react'

type PanelTab = 'milestones' | 'tutor'

const HINT_LEVELS = ['Nudge', 'Concept', 'Pseudocode', 'Code']

/**
 * Placeholder for the two features that come next in the build order:
 * the milestone plan and the tutor chat. The layout is real so the
 * workbench feels right while those features are built.
 */
export function SidePanel(): React.JSX.Element {
  const [tab, setTab] = useState<PanelTab>('milestones')

  return (
    <section className="panel side-panel" aria-label="Guide">
      <div className="side-tabs" role="tablist" aria-label="Guide">
        <button role="tab" aria-selected={tab === 'milestones'} className={`side-tab${tab === 'milestones' ? ' active' : ''}`} onClick={() => setTab('milestones')}>
          Milestones
        </button>
        <button role="tab" aria-selected={tab === 'tutor'} className={`side-tab${tab === 'tutor' ? ' active' : ''}`} onClick={() => setTab('tutor')}>
          Tutor
        </button>
      </div>

      {tab === 'milestones' ? <MilestonesPlaceholder /> : <TutorPlaceholder />}
    </section>
  )
}

function MilestonesPlaceholder(): React.JSX.Element {
  return (
    <div className="side-body">
      <div className="empty-block">
        <h3 className="empty-title">No plan for this folder yet</h3>
        <p className="empty-text">
          Projects you start from the picker get a plan of 5 to 10 milestones. You see one at a time, each with a clear
          &ldquo;done when&rdquo; check and the engineering decision it asks you to make.
        </p>
      </div>
      <ol className="milestone-ghost" aria-label="Example of how milestones will look">
        <li className="current">
          <span className="ghost-name">Set up the data model</span>
          <span className="ghost-check">Done when the schema is written and you can explain why you chose it.</span>
        </li>
        <li>
          <span className="ghost-name">First API route</span>
        </li>
        <li>
          <span className="ghost-name">Connect the UI</span>
        </li>
      </ol>
    </div>
  )
}

function TutorPlaceholder(): React.JSX.Element {
  return (
    <div className="side-body tutor">
      <div className="empty-block">
        <h3 className="empty-title">Ask about the file you&rsquo;re in</h3>
        <p className="empty-text">
          The tutor will see your open file, the current milestone and recent terminal errors. Answers start small, and you
          ask for more only when you need it.
        </p>
      </div>
      <ol className="hint-ladder" aria-label="Hint levels">
        {HINT_LEVELS.map((level) => (
          <li key={level}>{level}</li>
        ))}
      </ol>
      <form className="tutor-input" onSubmit={(e) => e.preventDefault()}>
        <textarea placeholder="The tutor isn't connected yet" disabled rows={3} aria-label="Message the tutor" />
        <button type="submit" className="button" disabled>
          Ask
        </button>
      </form>
    </div>
  )
}
