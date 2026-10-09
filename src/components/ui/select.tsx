import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="ui-select-wrap">
      <select className={cn('ui-select', className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  )
}
