import { useMotionValueEvent, useReducedMotion, useSpring } from 'motion/react'
import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { writePointerPosition } from '@/lib/dom/pointer-position'

type PointerRevealSurfaceProps = { children: ReactNode; className: string }

/** Adapted from Aceternity Inference's pointer reveal; only measured coordinates cross into the DOM adapter. */
export function PointerRevealSurface({ children, className }: PointerRevealSurfaceProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const reducedMotion = useReducedMotion()
  const x = useSpring(0, { stiffness: 180, damping: 26, mass: 0.6 })
  const y = useSpring(0, { stiffness: 180, damping: 26, mass: 0.6 })
  const write = () => {
    if (ref.current) writePointerPosition(ref.current, x.get(), y.get())
  }
  useMotionValueEvent(x, 'change', write)
  useMotionValueEvent(y, 'change', write)

  function followPointer(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    const localX = event.clientX - rect.left
    const localY = event.clientY - rect.top
    if (reducedMotion || !active) {
      x.jump(localX)
      y.jump(localY)
    } else {
      x.set(localX)
      y.set(localY)
    }
    setActive(true)
  }

  return (
    <div
      ref={ref}
      className={className}
      data-pointer-active={active}
      onPointerMove={followPointer}
      onPointerLeave={() => setActive(false)}
    >
      {children}
    </div>
  )
}
