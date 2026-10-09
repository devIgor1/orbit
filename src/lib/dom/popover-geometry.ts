import { useSyncExternalStore } from 'react'

// Radix and Base UI require pixel numbers for collision calculations. Appearance and spacing
// remain in globals.css; this adapter only resolves those tokens for its API.
function readGeometry() {
  const style = getComputedStyle(document.documentElement)
  return ['--popover-gap', '--popover-edge'].map((token) => style.getPropertyValue(token).trim()).join('|')
}

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

export function usePopoverGeometry() {
  const values = useSyncExternalStore(subscribe, readGeometry, () => '').split('|')
  return { sideOffset: Number.parseFloat(values[0]) || 0, collisionPadding: Number.parseFloat(values[1]) || 0 }
}
