import { ProductPreview } from '@/components/shared/product-preview'
import { ProductPreviewZoom } from '@/components/shared/product-preview-zoom'

const preview = {
  src: '/product/board.png',
  alt: 'Quadro Kanban do Orbit com tarefas de demonstração organizadas por etapa, prioridade e responsável.',
}

export function LoginProductShowcase() {
  return (
    <figure className="login-product-showcase">
      <ProductPreview
        {...preview}
        label="kanban"
        priority
        actions={<ProductPreviewZoom {...preview} title="Conheça o Kanban do Orbit" />}
      />
      <figcaption>
        <span className="login-preview-caption">
          <span>Clareza para criar. Espaço para crescer.</span>
          <small>Dados de demonstração</small>
        </span>
      </figcaption>
    </figure>
  )
}
