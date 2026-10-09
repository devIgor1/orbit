import { CalendarDays, CheckCheck, ChartNoAxesCombined, FileText, ListTodo, MessagesSquare, PanelsTopLeft, Users } from 'lucide-react'
import type { InputKind } from './workflow-types'

// Educational interface metadata only. These are not project or workspace records.
export const INPUTS: InputKind[] = ['briefing', 'tasks', 'team', 'timeline']
export const DEFAULT_CONNECTED: InputKind[] = ['briefing']
export const INPUT_LABELS: Record<InputKind, string> = {
  briefing: 'Briefing', tasks: 'Tarefas', team: 'Equipe', timeline: 'Prazos',
}
export const SOURCES = [
  { kind: 'briefing', title: 'Briefing', icon: FileText, primary: 'Objetivo e contexto', secondary: 'Uma direção para começar' },
  { kind: 'tasks', title: 'Tarefas', icon: ListTodo, primary: 'Etapas e prioridades', secondary: 'Cada próximo passo visível' },
  { kind: 'team', title: 'Equipe', icon: Users, primary: 'Pessoas e responsabilidades', secondary: 'Criação · revisão · aprovação' },
  { kind: 'timeline', title: 'Prazos', icon: CalendarDays, primary: 'Do início à entrega', secondary: 'Tempo para criar, revisar e concluir' },
] as const
export const DESTINATIONS = [
  { id: 'board', title: 'Quadro', icon: PanelsTopLeft, primary: 'Trabalho em movimento', secondary: 'Etapas conectadas' },
  { id: 'overview', title: 'Visão geral', icon: ChartNoAxesCombined, primary: 'Uma visão do progresso', secondary: 'Contexto para decidir' },
  { id: 'comments', title: 'Conversas', icon: MessagesSquare, primary: 'Feedback no contexto', secondary: 'A equipe em sintonia' },
  { id: 'delivery', title: 'Entrega', icon: CheckCheck, primary: 'Do plano ao resultado', secondary: 'Um caminho compartilhado' },
] as const
