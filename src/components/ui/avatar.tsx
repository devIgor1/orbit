import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { initials } from '@/lib/format'
export function Avatar({ name, src }: { name: string; src?: string | null }) {
  return (
    <AvatarPrimitive.Root className="ui-avatar">
      <AvatarPrimitive.Image className="ui-avatar-image" src={src ?? undefined} alt={name} />
      <AvatarPrimitive.Fallback className="ui-avatar-fallback" aria-label={name}>
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
