import type { KeyboardEvent, PointerEvent } from 'react'
import type { CanvasPoint } from '@/lib/dom/canvas-coordinates'

export type Point = CanvasPoint
export type InputKind = 'briefing' | 'tasks' | 'team' | 'timeline'
export type DestinationId = 'board' | 'overview' | 'comments' | 'delivery'
export type NodeId = InputKind | DestinationId | 'target'
export type Positions = Record<NodeId, Point>
export type ConnectionHover = { kind: InputKind; valid: boolean } | null
export type CableDrag = Point & { kind: InputKind; moved: boolean }

export type WorkflowGeometry = {
  width: number
  height: number
  nodeWidth: number
  nodeHeight: number
  targetWidth: number
  targetHeight: number
  outputOffset: number
  inputOffset: number
  targetRow: number
  snap: number
  nudge: number
  initial: Positions
}

export type MoveHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerMove: (event: PointerEvent<HTMLElement>) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  onLostPointerCapture: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}
