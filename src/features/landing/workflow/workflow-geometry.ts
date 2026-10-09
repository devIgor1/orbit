import { readCanvasNumber } from '@/lib/dom/canvas-coordinates'
import { INPUTS } from './workflow-metadata'
import type { ConnectionHover, InputKind, NodeId, Point, WorkflowGeometry } from './workflow-types'

// Geometry and initial placement are derived from the licensed Inference canvas.
// CSS owns every design dimension; this module computes ports and hit testing.
export function readWorkflowGeometry(element: HTMLElement): WorkflowGeometry {
  const token = (name: string) => readCanvasNumber(element, `--workflow-${name}`)
  const width = token('stage-width')
  const nodeWidth = token('node-width')
  const targetWidth = token('target-width')
  const source = (name: InputKind) => ({ x: token(`${name}-x`), y: token(`${name}-y`) })
  const mirror = (point: Point) => ({ x: width - point.x - nodeWidth, y: point.y })
  const briefing = source('briefing'), tasks = source('tasks'), team = source('team'), timeline = source('timeline')
  return {
    width, nodeWidth, targetWidth, height: token('stage-height'), nodeHeight: token('node-height'),
    targetHeight: token('target-height'), outputOffset: token('output-offset'), inputOffset: token('input-offset'),
    targetRow: token('target-row'), snap: token('snap'), nudge: token('nudge'),
    initial: {
      briefing, tasks, team, timeline,
      target: { x: (width - targetWidth) / 2, y: token('target-y') },
      board: mirror(briefing), overview: mirror(team), comments: mirror(tasks), delivery: mirror(timeline),
    },
  }
}

export function clampPosition(id: NodeId, point: Point, geometry: WorkflowGeometry): Point {
  const width = id === 'target' ? geometry.targetWidth : geometry.nodeWidth
  const height = id === 'target' ? geometry.targetHeight : geometry.nodeHeight
  return { x: Math.min(Math.max(0, point.x), geometry.width - width), y: Math.min(Math.max(0, point.y), geometry.height - height) }
}

export function outputPoint(point: Point, geometry: WorkflowGeometry): Point {
  return { x: point.x + geometry.nodeWidth, y: point.y + geometry.outputOffset }
}

export function inputPoint(kind: InputKind, target: Point, geometry: WorkflowGeometry): Point {
  return { x: target.x, y: target.y + geometry.inputOffset + INPUTS.indexOf(kind) * geometry.targetRow }
}

export function destinationInput(point: Point, geometry: WorkflowGeometry): Point {
  return { x: point.x, y: point.y + geometry.outputOffset }
}

export function endpointOutput(index: number, target: Point, geometry: WorkflowGeometry): Point {
  return { x: target.x + geometry.targetWidth, y: target.y + geometry.inputOffset + index * geometry.targetRow }
}

export function findInput(point: Point, kind: InputKind, target: Point, geometry: WorkflowGeometry): ConnectionHover {
  const distance = (input: InputKind) => {
    const port = inputPoint(input, target, geometry)
    return Math.hypot(port.x - point.x, port.y - point.y)
  }
  const nearest = INPUTS.reduce((a, b) => distance(a) < distance(b) ? a : b)
  // Prefer the actual nearest port: dropping on a neighboring row must not connect silently.
  return distance(nearest) < geometry.snap ? { kind: nearest, valid: nearest === kind } : null
}

export function isWorkflowReady(connected: readonly InputKind[]) {
  return INPUTS.every((kind) => connected.includes(kind))
}
