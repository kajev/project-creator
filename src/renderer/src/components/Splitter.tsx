import { useRef } from 'react'

interface SplitterProps {
  /** "vertical" sits between columns and drags left/right. */
  direction: 'vertical' | 'horizontal'
  label: string
  onDrag: (delta: number) => void
}

export function Splitter({ direction, label, onDrag }: SplitterProps): React.JSX.Element {
  const last = useRef<number | null>(null)

  const handleDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    last.current = direction === 'vertical' ? e.clientX : e.clientY
    document.body.classList.add(direction === 'vertical' ? 'resizing-x' : 'resizing-y')
  }

  const handleMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (last.current === null) return
    const pos = direction === 'vertical' ? e.clientX : e.clientY
    onDrag(pos - last.current)
    last.current = pos
  }

  const handleUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    last.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    document.body.classList.remove('resizing-x', 'resizing-y')
  }

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const step = e.shiftKey ? 40 : 10
    const back = direction === 'vertical' ? 'ArrowLeft' : 'ArrowUp'
    const forward = direction === 'vertical' ? 'ArrowRight' : 'ArrowDown'
    if (e.key === back) onDrag(-step)
    else if (e.key === forward) onDrag(step)
    else return
    e.preventDefault()
  }

  return (
    <div
      className={`splitter splitter-${direction}`}
      role="separator"
      aria-orientation={direction}
      aria-label={label}
      tabIndex={0}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onKeyDown={handleKey}
    />
  )
}
