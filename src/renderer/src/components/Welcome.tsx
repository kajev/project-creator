import { baseName } from '@renderer/lib/paths'

interface WelcomeProps {
  recent: string[]
  onOpenFolder: () => void
  onOpenRecent: (root: string) => void
  onStartNew: () => void
}

export function Welcome({ recent, onOpenFolder, onOpenRecent, onStartNew }: WelcomeProps): React.JSX.Element {
  return (
    <main className="welcome">
      <div className="welcome-inner">
        <h1 className="welcome-title">Project Creator</h1>
        <p className="welcome-lede">Pick a project, get a clear assignment brief, then build it yourself.</p>

        <div className="welcome-actions">
          <button className="button primary" onClick={onOpenFolder}>
            Open a folder
          </button>
          <button className="button" onClick={onStartNew}>
            Start a new project
          </button>
        </div>

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
