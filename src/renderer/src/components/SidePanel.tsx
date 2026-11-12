import { useState } from 'react'
import type { Brief } from '@shared/types'

type PanelTab = 'brief' | 'tutor'

interface SidePanelProps {
  /** The open project's brief, or null when the folder has none. */
  brief: Brief | null
}

export function SidePanel({ brief }: SidePanelProps): React.JSX.Element {
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
        <BriefView brief={brief} />
      ) : (
        <div className="side-body">
          <p className="empty-text">The tutor is not built yet.</p>
        </div>
      )}
    </section>
  )
}

function BriefView({ brief }: SidePanelProps): React.JSX.Element {
  if (!brief) {
    return (
      <div className="side-body">
        <p className="empty-text">This folder has no brief. Projects made with &ldquo;Start a new project&rdquo; get one.</p>
      </div>
    )
  }

  return (
    <div className="side-body">
      <h3 className="brief-title">{brief.title}</h3>
      <p className="brief-meta">
        {brief.stack}, about {brief.estimatedHours} {brief.estimatedHours === 1 ? 'hour' : 'hours'}
      </p>
      <p className="brief-text">{brief.summary}</p>

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
        {brief.stages.map((stage, i) => (
          <li key={i}>
            <span className="stage-name">{stage.title}</span>
            <span className="stage-goal">{stage.goal}</span>
            {stage.why && <span className="stage-why">Why this stage: {stage.why}</span>}
            <span className="stage-done-label">Done when</span>
            <ul className="stage-done">
              {stage.doneWhen.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
