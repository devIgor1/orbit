import { useAnimationFrame, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { wave } from './workflow-paths'
import type { InputKind, Point } from './workflow-types'

export function WorkflowSpark({ from, to, kind }: { from: Point; to: Point; kind: InputKind }) {
  const reduceMotion = useReducedMotion()
  const [phase, setPhase] = useState(0)
  useAnimationFrame((_, delta) => {
    if (reduceMotion) return
    setPhase((current) => (current + delta / 1000 * 2.2) % (Math.PI * 2))
  })
  const path = wave(from, to, phase)
  return <g className="workflow-cable workflow-spark" data-kind={kind}>
    <path className="workflow-cable-glow" d={path} />
    <path className="workflow-cable-line" d={path} />
    <circle className="workflow-spark-ring" cx={to.x} cy={to.y} />
  </g>
}
