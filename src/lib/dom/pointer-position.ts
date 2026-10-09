/** Measured pointer coordinates only. The reveal size, mask, colors and easing live in globals.css. */
export function writePointerPosition(element: HTMLElement, x: number, y: number) {
  element.style.setProperty('--pointer-x', `${x}px`)
  element.style.setProperty('--pointer-y', `${y}px`)
}
