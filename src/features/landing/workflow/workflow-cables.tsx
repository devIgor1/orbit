import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { cable, cableMid, restSag, stringPath } from './workflow-paths'
import type { Point } from './workflow-types'

const STRING_SPRING = { stiffness: 140, damping: 7, mass: 1 }

// Adapted from Inference's StringCable. Motion updates the computed SVG path,
// while all cable appearance and reduced-motion effects remain in globals.css.
export function StringCable({ from, to, kind }: { from: Point; to: Point; kind?: string }) {
  const reduceMotion = useReducedMotion()
  const taut = cableMid(from, to)
  const rest = { x: taut.x, y: taut.y + restSag(from, to) }
  const midX = useSpring(rest.x, STRING_SPRING)
  const midY = useSpring(reduceMotion ? rest.y : taut.y, STRING_SPRING)
  const startX = useSpring(from.x, STRING_SPRING), startY = useSpring(from.y, STRING_SPRING)
  const endX = useSpring(to.x, STRING_SPRING), endY = useSpring(to.y, STRING_SPRING)

  useEffect(() => {
    // Endpoints stay attached to ports while only the string midpoint oscillates.
    startX.jump(from.x); startY.jump(from.y); endX.jump(to.x); endY.jump(to.y)
    if (reduceMotion) { midX.jump(rest.x); midY.jump(rest.y) }
    else { midX.set(rest.x); midY.set(rest.y) }
  }, [from.x, from.y, to.x, to.y, rest.x, rest.y, reduceMotion, midX, midY, startX, startY, endX, endY])

  const path = useTransform(() => stringPath(
    { x: startX.get(), y: startY.get() }, { x: endX.get(), y: endY.get() }, { x: midX.get(), y: midY.get() },
  ))
  return <g className="workflow-cable" data-kind={kind} data-active="true">
    <motion.path className="workflow-cable-glow" d={path} />
    <motion.path className="workflow-cable-line" d={path} />
    <motion.path className="workflow-cable-flow" d={path} />
  </g>
}

export function IdleCable({ from, to }: { from: Point; to: Point }) {
  return <path className="workflow-cable-idle" d={cable(from, to)} />
}

export function DragCable({ from, to, kind, valid }: { from: Point; to: Point; kind: string; valid: boolean }) {
  return <g className="workflow-cable workflow-cable-drag" data-kind={kind} data-valid={valid}>
    <path className="workflow-cable-glow" d={cable(from, to)} />
    <path className="workflow-cable-line" d={cable(from, to)} />
    <circle className="workflow-cable-tip" cx={to.x} cy={to.y} />
  </g>
}
