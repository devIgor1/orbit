import type { Point } from './workflow-types'

// Original Inference Bézier/string math; values below are technical curve physics.
const handles = (a: Point, b: Point) => {
  const dx = Math.max(60, Math.abs(b.x - a.x) * .5)
  return { c1: { x: a.x + dx, y: a.y }, c2: { x: b.x - dx, y: b.y } }
}

export function cable(a: Point, b: Point) {
  const { c1, c2 } = handles(a, b)
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`
}

export function cableMid(a: Point, b: Point): Point {
  const { c1, c2 } = handles(a, b)
  return { x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8, y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8 }
}

export function restSag(a: Point, b: Point) { return Math.min(56, Math.hypot(b.x - a.x, b.y - a.y) * .09) }

export function stringPath(a: Point, b: Point, mid: Point) {
  const { c1, c2 } = handles(a, b)
  const natural = cableMid(a, b)
  const ox = (mid.x - natural.x) * 4 / 3, oy = (mid.y - natural.y) * 4 / 3
  const f = (value: number) => value.toFixed(1)
  return `M ${f(a.x)} ${f(a.y)} C ${f(c1.x + ox)} ${f(c1.y + oy)}, ${f(c2.x + ox)} ${f(c2.y + oy)}, ${f(b.x)} ${f(b.y)}`
}

// Original sampled electrical wave between a dragged cable and its matching port.
export function wave(from: Point, to: Point, phase: number) {
  const dx = to.x - from.x, dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const nx = -dy / length, ny = dx / length
  const cycles = Math.max(1, length / 26)
  let path = ''
  for (let index = 0; index <= 40; index++) {
    const t = index / 40
    const offset = 6 * Math.sin(Math.PI * t) * Math.sin(2 * Math.PI * cycles * t - phase)
    const x = from.x + dx * t + nx * offset, y = from.y + dy * t + ny * offset
    path += `${index === 0 ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return path
}
