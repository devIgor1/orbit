import { Orbit } from 'lucide-react'

interface ProductPreviewProps {
  src: string
  alt: string
  label: string
  priority?: boolean
}

export function ProductPreview({ src, alt, label, priority = false }: ProductPreviewProps) {
  return (
    <div className="product-preview">
      <div className="product-preview-toolbar" aria-hidden="true">
        <span className="product-preview-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="product-preview-location">
          <Orbit /> orbit <span>/</span> {label}
        </span>
        <span className="product-preview-tag">WORKSPACE</span>
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
