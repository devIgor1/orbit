import { Orbit } from 'lucide-react'
import type { ReactNode } from 'react'

interface ProductPreviewProps {
  src: string
  alt: string
  label: string
  priority?: boolean
  actions?: ReactNode
}

export function ProductPreview({ src, alt, label, priority = false, actions }: ProductPreviewProps) {
  return (
    <div className="product-preview">
      <div className="product-preview-toolbar">
        <span className="product-preview-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="product-preview-location" aria-hidden="true">
          <Orbit /> orbit <span>/</span> {label}
        </span>
        {actions ?? <span className="product-preview-tag" aria-hidden="true">WORKSPACE</span>}
      </div>
      <img
        src={src}
        alt={alt}
        width="1440"
        height="1050"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </div>
  )
}
