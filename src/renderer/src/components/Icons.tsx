/** Tiny inline icons, so the app has no icon-font dependency. */

type IconProps = { className?: string }

export function ChevronIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function FileIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
      <path d="M2 1.5h5l3 3v8H2z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7 1.5v3h3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

export function RefreshIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M11.5 7a4.5 4.5 0 1 1-1.4-3.26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10.6 1.4v2.8H7.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 2l6 6M8 2 2 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
