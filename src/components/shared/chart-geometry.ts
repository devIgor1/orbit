import { useSyncExternalStore } from 'react'

// Recharts requires numeric axis dimensions and percentage radii as props. Read
// those design decisions from the central CSS tokens; library measurements and
// SVG coordinates remain inside the shared chart adapter.
const geometryTokens = ['--chart-axis-width', '--chart-tick-gap', '--chart-inner-radius', '--chart-outer-radius']

function readGeometry() {
  const styles = getComputedStyle(document.documentElement)
  return geometryTokens.map((token) => styles.getPropertyValue(token).trim()).join('|')
}

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange)
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
  return () => {
    window.removeEventListener('resize', onChange)
    observer.disconnect()
  }
}

export function useChartGeometry() {
  const snapshot = useSyncExternalStore(subscribe, readGeometry, () => '')
  const [axisWidth, tickGap, innerRadius, outerRadius] = snapshot.split('|')
  return { axisWidth: Number.parseFloat(axisWidth), tickGap: Number.parseFloat(tickGap), innerRadius, outerRadius }
}
