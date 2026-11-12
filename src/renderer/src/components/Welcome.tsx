import { baseName } from '@renderer/lib/paths'

interface WelcomeProps {
  recent: string[]
  onOpenFolder: () => void
  onOpenRecent: (root: string) => void
}

export function Welcome({ recent, onOpenFolder, onOpenRecent }: WelcomeProps): React.JSX.Element {
  return (
    <main className="welcome">
      <div className="welcome-inner">
        <h1 className="welcome-title">Project Creator</h1>
        <p className="welcome-lede">
          Pick a project, get the scaffolding, then build it yourself. You make the engineering calls, and the tutor hints
          before it tells.
        </p>

        <div className="welcome-actions">
          <button className="button primary" onClick={onOpenFolder}>
            Open a folder
          </button>
          <button className="button" disabled title="The project picker is coming in a later build">
            Start a new project
          </button>
        </div>
        <p className="welcome-note">Starting a new project from the picker isn&rsquo;t built yet. For now, open any folder you already have.</p>

        <section className="recent" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="recent-heading">
            Recent folders
          </h2>
          {recent.length === 0 ? (
            <p className="recent-empty">Folders you open show up here.</p>
          ) : (
            <ul className="recent-list">
              {recent.map((root) => (
                <li key={root}>
                  <button className="recent-item" onClick={() => onOpenRecent(root)} title={root}>
                    <span className="recent-name">{baseName(root)}</span>
                    <span className="recent-path">{root}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
