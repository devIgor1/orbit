import { Overlay, type OverlayProps } from './overlay'
export function Dialog(props: OverlayProps) {
  return <Overlay variant="dialog" {...props} />
}
