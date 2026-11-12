import { useEffect, useState } from 'react'
import type { Brief, CreatedProject, Proposal, ProposalInput } from '@shared/types'

interface NewProjectProps {
  onCreated: (created: CreatedProject) => void
  onCancel: () => void
  onError: (err: unknown) => void
}

/** key: no API key stored yet. ready: the brief is written and needs a folder. */
type Step = 'loading' | 'key' | 'form' | 'proposals' | 'ready'

const LEVELS: { value: ProposalInput['level']; label: string }[] = [
  { value: 'new', label: 'New to programming' },
  { value: 'some', label: 'Finished a course or a few tutorials' },
  { value: 'comfortable', label: 'Comfortable building small things alone' }
]

const hoursLabel = (hours: number): string => `about ${hours} ${hours === 1 ? 'hour' : 'hours'}`

export function NewProject({ onCreated, onCancel, onError }: NewProjectProps): React.JSX.Element {
  const [step, setStep] = useState<Step>('loading')
  /** A sentence to show while waiting on Claude. Null when idle. */
  const [busy, setBusy] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [interests, setInterests] = useState('')
  const [level, setLevel] = useState<ProposalInput['level']>('some')
  const [language, setLanguage] = useState('')
  const [hours, setHours] = useState('8')
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [brief, setBrief] = useState<Brief | null>(null)

  useEffect(() => {
    window.api.ai.hasKey().then(
      (has) => setStep(has ? 'form' : 'key'),
      () => setStep('key')
    )
  }, [])

  const input = (): ProposalInput => ({ interests, level, language, hours: Number(hours) })

  /** Shows the error. A rejected key is forgotten by the main process, so that case goes back to the key step. */
  const fail = async (err: unknown): Promise<void> => {
    onError(err)
    if (!(await window.api.ai.hasKey())) setStep('key')
  }

  const saveKey = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    try {
      await window.api.ai.setKey(apiKey)
      setApiKey('')
      setStep('form')
    } catch (err) {
      onError(err)
    }
  }

  const changeKey = async (): Promise<void> => {
    await window.api.ai.clearKey()
    setStep('key')
  }

  const propose = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setBusy('Asking Claude for three project ideas. This can take a minute.')
    try {
      setProposals(await window.api.ai.proposeProjects(input()))
      setStep('proposals')
    } catch (err) {
      await fail(err)
    } finally {
      setBusy(null)
    }
  }

  /** Opens the folder picker and creates the project. Cancelling leaves the brief here to try again. */
  const create = async (written: Brief): Promise<void> => {
    try {
      const created = await window.api.project.create(written)
      if (created) onCreated(created)
    } catch (err) {
      onError(err)
    }
  }

  const choose = async (proposal: Proposal): Promise<void> => {
    setBusy(`Writing the brief for ${proposal.title}. This can take a minute.`)
    let written: Brief
    try {
      written = await window.api.ai.writeBrief(input(), proposal)
    } catch (err) {
      await fail(err)
      return
    } finally {
      setBusy(null)
    }
    setBrief(written)
    setStep('ready')
    await create(written)
  }

  const waiting = busy !== null

  return (
    <main className="welcome">
      <div className="welcome-inner new-project">
        <button type="button" className="link-button" onClick={onCancel}>
          Back to start
        </button>
        <h1 className="np-title">Start a new project</h1>

        {step === 'key' && (
          <form className="np-form" onSubmit={saveKey}>
            <p className="np-text">
              The app uses your own Claude API key to suggest projects and write the brief. The key is encrypted and kept
              on this computer. It is only used for requests to the Claude API.
            </p>
            <label className="field">
              <span className="field-label">Claude API key</span>
              <input
                className="input"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
            </label>
            <div className="np-actions">
              <button type="submit" className="button primary" disabled={!apiKey.trim()}>
                Save key
              </button>
            </div>
          </form>
        )}

        {step === 'form' && (
          <form className="np-form" onSubmit={propose}>
            <label className="field">
              <span className="field-label">What do you want to build or learn?</span>
              <textarea
                className="input"
                rows={3}
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="For example: a tool I would use every day, or practice working with an API"
                maxLength={2000}
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span className="field-label">Your experience</span>
              <select className="input" value={level} onChange={(e) => setLevel(e.target.value as ProposalInput['level'])}>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Language (leave empty to let the AI choose)</span>
              <input className="input" value={language} onChange={(e) => setLanguage(e.target.value)} maxLength={60} />
            </label>
            <label className="field">
              <span className="field-label">Hours you have for the whole project</span>
              <input
                className="input np-hours"
                type="number"
                min={1}
                max={500}
                step={1}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
              />
            </label>
            <div className="np-actions">
              <button type="submit" className="button primary" disabled={waiting}>
                Suggest three projects
              </button>
              <button type="button" className="link-button" onClick={changeKey} disabled={waiting}>
                Change API key
              </button>
            </div>
          </form>
        )}

        {step === 'proposals' && (
          <>
            <p className="np-text">Pick the one you want to build. You get a full brief for it next.</p>
            <ul className="proposal-list">
              {proposals.map((proposal) => (
                <li key={proposal.title} className="proposal">
                  <h2 className="proposal-title">{proposal.title}</h2>
                  <p className="proposal-pitch">{proposal.pitch}</p>
                  <p className="proposal-meta">
                    {proposal.stack}, {hoursLabel(proposal.estimatedHours)}
                  </p>
                  <ul className="proposal-skills">
                    {proposal.skills.map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                  <button type="button" className="button" onClick={() => choose(proposal)} disabled={waiting}>
                    Build this one
                  </button>
                </li>
              ))}
            </ul>
            <div className="np-actions">
              <button type="button" className="link-button" onClick={() => setStep('form')} disabled={waiting}>
                Back to my answers
              </button>
            </div>
          </>
        )}

        {step === 'ready' && brief && (
          <>
            <p className="np-text">
              Your brief for <strong>{brief.title}</strong> is ready. Choose where the project folder should go.
            </p>
            <div className="np-actions">
              <button type="button" className="button primary" onClick={() => create(brief)}>
                Choose a folder
              </button>
              <button type="button" className="link-button" onClick={() => setStep('proposals')}>
                Back to the ideas
              </button>
            </div>
          </>
        )}

        {busy && (
          <p className="np-busy" role="status">
            {busy}
          </p>
        )}
      </div>
    </main>
  )
}
