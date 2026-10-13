/** Isolates native drag feedback from ancestor scroll/compositing layers.
 * Only measured dimensions and pointer offsets are set here. Appearance belongs
 * to the source's semantic classes and .native-drag-preview in globals.css.
 * Keep the clone mounted until the browser captures dragstart, then remove it
 * before the next paint. The returned cleanup also handles cancellation/unmount.
 */
export function createNativeDragPreview(
  source: HTMLElement,
  transfer: DataTransfer,
  pointer: { clientX: number; clientY: number },
) {
  const bounds = source.getBoundingClientRect()
  const preview = source.cloneNode(true)
  if (!(preview instanceof HTMLElement)) return () => {}
  preview.classList.add('native-drag-preview')
  preview.removeAttribute('id')
  preview.removeAttribute('data-dragging')
  preview.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'))
  preview.draggable = false
  preview.inert = true
  preview.setAttribute('aria-hidden', 'true')
  preview.style.setProperty('--drag-preview-width', `${bounds.width}px`)
  preview.style.setProperty('--drag-preview-height', `${bounds.height}px`)
  source.ownerDocument.body.append(preview)
  transfer.setDragImage(
    preview,
    Math.max(0, Math.min(bounds.width, pointer.clientX - bounds.left)),
    Math.max(0, Math.min(bounds.height, pointer.clientY - bounds.top)),
  )
  const frame = requestAnimationFrame(() => preview.remove())
  return () => {
    cancelAnimationFrame(frame)
    preview.remove()
  }
}
