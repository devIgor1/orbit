import * as DismissableLayer from '@radix-ui/react-dismissable-layer'
import { FocusScope } from '@radix-ui/react-focus-scope'
import type { ReactNode } from 'react'

/** Registers Base UI's popup in the existing Radix Dialog/Popover layer stack.
 * Base UI owns selection and focus; Radix pauses the enclosing focus scope and
 * treats the popup as its top layer, so Escape never closes a parent overlay.
 */
export function SelectLayer({ children }: { children: ReactNode }) {
  return (
    <FocusScope
      asChild
      onMountAutoFocus={(event) => event.preventDefault()}
      onUnmountAutoFocus={(event) => event.preventDefault()}
    >
      <DismissableLayer.Root asChild>{children}</DismissableLayer.Root>
    </FocusScope>
  )
}
