import { Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

interface ProductPreviewZoomProps {
  src: string
  alt: string
  title: string
}

export function ProductPreviewZoom({ src, alt, title }: ProductPreviewZoomProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title={title}
      description="Interface real do Orbit com dados de demonstração."
      trigger={
        <Button variant="ghost" size="sm" className="product-preview-zoom-trigger">
          <Maximize2 aria-hidden="true" /> <span>Ampliar prévia</span>
        </Button>
      }
    >
      <div className="product-preview-expanded" role="region" aria-label={title} tabIndex={0}>
        <img src={src} alt={alt} width="1440" height="1050" />
      </div>
    </Dialog>
  )
}
