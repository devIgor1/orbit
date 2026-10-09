export interface LandingFeature {
  id: 'projects' | 'tasks' | 'team' | 'overview'
  label: string
  description: string
  card: { label: string; status: string; tone: 'success' | 'warning' | 'info'; title: string; meta: string }
  capabilities: readonly { label: string; detail: string }[]
}

// Product capabilities and process labels are presentation metadata, not records
// or statistics. Adapted from the original Aceternity Features card definitions.
export const landingFeatures: readonly LandingFeature[] = [
  {
    id: 'projects',
    label: 'Projetos',
    description:
      'Reúna o contexto e os prazos de cada projeto. Use a busca e os filtros para encontrar o trabalho que precisa de atenção.',
    card: {
      label: 'Organização de projetos',
      status: 'Workspace',
      tone: 'success',
      title: 'Ideias em ordem.',
      meta: 'Do briefing à entrega, tudo no mesmo lugar.',
    },
    capabilities: [
      { label: 'Contexto', detail: 'Título e descrição' },
      { label: 'Prazo', detail: 'Data de entrega' },
      { label: 'Andamento', detail: 'Status do projeto' },
      { label: 'Organização', detail: 'Busca e filtros' },
    ],
  },
  {
    id: 'tasks',
    label: 'Tarefas',
    description:
      'Organize as tarefas em Kanban ou lista. Defina responsáveis, prioridades e prazos; mantenha comentários e histórico junto do trabalho.',
    card: {
      label: 'Etapas do trabalho',
      status: 'Kanban',
      tone: 'warning',
      title: 'Do plano ao feito.',
      meta: 'Cada tarefa avança no seu próprio ritmo.',
    },
    capabilities: [
      { label: 'A fazer', detail: 'Planejar' },
      { label: 'Em andamento', detail: 'Criar' },
      { label: 'Em revisão', detail: 'Revisar' },
      { label: 'Concluído', detail: 'Entregar' },
    ],
  },
  {
    id: 'team',
    label: 'Equipe',
    description:
      'Encontre as pessoas do workspace e acompanhe suas tarefas atribuídas e concluídas. Atualize seu próprio perfil quando precisar.',
    card: {
      label: 'Pessoas e responsabilidades',
      status: 'Equipe',
      tone: 'info',
      title: 'Conexões claras.',
      meta: 'Saiba quem faz parte de cada próxima entrega.',
    },
    capabilities: [
      { label: 'Pessoas', detail: 'Diretório do workspace' },
      { label: 'Responsáveis', detail: 'Atribuição por tarefa' },
      { label: 'Seu perfil', detail: 'Nome, cargo e avatar' },
    ],
  },
  {
    id: 'overview',
    label: 'Visão geral',
    description:
      'Veja os projetos ativos, as pendências e a evolução das tarefas por período. Acompanhe também as atividades recentes do workspace.',
    card: {
      label: 'Panorama do workspace',
      status: 'Dashboard',
      tone: 'success',
      title: 'O todo, à vista.',
      meta: 'Indicadores do seu workspace, em uma visão.',
    },
    capabilities: [
      { label: 'Projetos', detail: 'Ativos e em progresso' },
      { label: 'Tarefas', detail: 'Pendências e conclusão' },
      { label: 'Atividade', detail: 'Atualizações recentes' },
    ],
  },
]
