import { useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { writeCanvasScale } from '@/lib/dom/canvas-coordinates'
import { clampPosition, findInput, isWorkflowReady, readWorkflowGeometry } from '../workflow/workflow-geometry'
import { DEFAULT_CONNECTED, INPUTS, INPUT_LABELS } from '../workflow/workflow-metadata'
import type { CableDrag, ConnectionHover, InputKind, MoveHandlers, NodeId, Point, Positions, WorkflowGeometry } from '../workflow/workflow-types'

export function useWorkflowCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const moveStart = useRef<{ id: NodeId; pointer: Point; node: Point } | null>(null)
  const dragStart = useRef<Point | null>(null)
  const [geometry, setGeometry] = useState<WorkflowGeometry | null>(null)
  const [positions, setPositions] = useState<Positions | null>(null)
  const [connected, setConnected] = useState<InputKind[]>(DEFAULT_CONNECTED)
  const [drag, setDrag] = useState<CableDrag | null>(null)
  const [hover, setHover] = useState<ConnectionHover>(null)
  const [armed, setArmed] = useState<InputKind | null>(null)
  const [moving, setMoving] = useState<NodeId | null>(null)
  const [pulse, setPulse] = useState<{ kind: InputKind; n: number } | null>(null)
  const [notice, setNotice] = useState('')
  const ready = isWorkflowReady(connected)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const measured = readWorkflowGeometry(wrap)
    setGeometry(measured)
    setPositions(measured.initial)
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width <= 0) return
      scaleRef.current = Math.min(1, entry.contentRect.width / measured.width)
      writeCanvasScale(wrap, scaleRef.current)
    })
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  function toStage(event: PointerEvent): Point {
    const rect = stageRef.current!.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / scaleRef.current, y: (event.clientY - rect.top) / scaleRef.current }
  }

  function finishMove() { moveStart.current = null; setMoving(null) }

  function moveHandlers(nodeId: NodeId): MoveHandlers {
    return {
      onPointerDown(event) {
        if (event.button !== 0 || !positions) return
        event.currentTarget.setPointerCapture(event.pointerId)
        moveStart.current = { id: nodeId, pointer: toStage(event), node: positions[nodeId] }
        setMoving(nodeId)
      },
      onPointerMove(event) {
        if (moveStart.current?.id !== nodeId || !geometry) return
        const point = toStage(event), { pointer, node } = moveStart.current
        const next = clampPosition(nodeId, { x: node.x + point.x - pointer.x, y: node.y + point.y - pointer.y }, geometry)
        setPositions((current) => current && ({ ...current, [nodeId]: next }))
      },
      onPointerUp: finishMove,
      onPointerCancel: finishMove,
      onLostPointerCapture: finishMove,
      onKeyDown(event) {
        if (!geometry) return
        const delta: Record<string, Point> = {
          ArrowUp: { x: 0, y: -geometry.nudge }, ArrowDown: { x: 0, y: geometry.nudge },
          ArrowLeft: { x: -geometry.nudge, y: 0 }, ArrowRight: { x: geometry.nudge, y: 0 },
        }
        const step = delta[event.key]
        if (!step) return
        event.preventDefault()
        setPositions((current) => current && ({ ...current, [nodeId]: clampPosition(nodeId, {
          x: current[nodeId].x + step.x, y: current[nodeId].y + step.y,
        }, geometry) }))
      },
    }
  }

  function connect(kind: InputKind) {
    setConnected((current) => current.includes(kind) ? current : [...current, kind])
    setPulse((current) => ({ kind, n: (current?.n ?? 0) + 1 }))
    setArmed(null); setNotice('')
  }

  function toggle(kind: InputKind) {
    if (connected.includes(kind)) {
      setConnected((current) => current.filter((value) => value !== kind))
      setArmed(null); setNotice('')
    } else connect(kind)
  }

  function cancelCable() { setDrag(null); setHover(null); dragStart.current = null }

  const portHandlers = (kind: InputKind) => ({
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      const point = toStage(event)
      dragStart.current = point
      setDrag({ kind, ...point, moved: false }); setNotice('')
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      if (!drag || !geometry || !positions || !dragStart.current) return
      const point = toStage(event)
      const moved = drag.moved || Math.hypot(point.x - dragStart.current.x, point.y - dragStart.current.y) > 3
      setDrag({ ...drag, ...point, moved })
      setHover(findInput(point, drag.kind, positions.target, geometry))
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      if (!drag || !geometry || !positions) return
      const hit = findInput(toStage(event), drag.kind, positions.target, geometry)
      if (hit?.valid) connect(drag.kind)
      else if (!drag.moved) setArmed((current) => current === kind ? null : kind)
      else if (hit) setNotice(`Conexão incompatível. Use a entrada ${INPUT_LABELS[drag.kind]}.`)
      cancelCable()
    },
    onPointerCancel: cancelCable,
    onLostPointerCapture: cancelCable,
    onClick(event: MouseEvent<HTMLButtonElement>) {
      if (event.detail === 0) { setArmed((current) => current === kind ? null : kind); setNotice('') }
    },
  })

  function inputClick(kind: InputKind) {
    if (armed === kind) connect(kind)
    else if (armed) setNotice(`Conexão incompatível. Use a entrada ${INPUT_LABELS[armed]}.`)
    else if (connected.includes(kind)) toggle(kind)
  }

  function reset() {
    setConnected(DEFAULT_CONNECTED); setPositions(geometry?.initial ?? null)
    setArmed(null); setPulse(null); setNotice(''); cancelCable(); finishMove()
  }

  function connectAll() { INPUTS.forEach(connect) }
  const status = notice || (armed
    ? `${INPUT_LABELS[armed]} selecionado. Ative a entrada ${INPUT_LABELS[armed]} no projeto para conectar. Escape cancela.`
    : `${connected.length} de 4 entradas conectadas. ${ready ? 'Fluxo completo. As quatro saídas estão ativas.' : 'Conecte as quatro entradas para ativar as saídas.'}`)

  return {
    wrapRef, stageRef, geometry, positions, connected, drag, hover, armed, moving, pulse, ready, status,
    moveHandlers, portHandlers, inputClick, toggle, reset, connectAll,
    cancel() { setArmed(null); setNotice(''); cancelCable(); finishMove() },
  }
}

export type WorkflowController = ReturnType<typeof useWorkflowCanvas>
