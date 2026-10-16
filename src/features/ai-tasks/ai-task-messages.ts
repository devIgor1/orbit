import type { z } from 'zod'
import type { aiTaskClarificationReasonSchema, aiTaskRejectionReasonSchema } from './schemas/ai-task-schema.ts'

export const aiTaskRejectionMessages: Record<z.infer<typeof aiTaskRejectionReasonSchema>, string> = {
  out_of_scope: 'A IA do Orbit serve para cadastrar tarefas. Descreva um trabalho que precisa ser feito neste projeto.',
  unsupported_action: 'Este recurso cria uma tarefa por vez no projeto aberto. Use as outras ações do Orbit para consultar, editar ou excluir dados.',
  instruction_override: 'O pedido contém instruções incompatíveis com este recurso. Descreva apenas a tarefa que deseja cadastrar.',
}

export const aiTaskClarificationMessages: Record<z.infer<typeof aiTaskClarificationReasonSchema>, string> = {
  missing_task_details: 'Qual trabalho precisa ser feito? Descreva a ação e o resultado esperado.',
  multiple_tasks: 'Descreva uma única tarefa por pedido. Separe os trabalhos independentes.',
  ambiguous_assignee: 'Há mais de um membro com esse nome. Informe o nome completo do responsável.',
  unknown_assignee: 'O responsável informado não foi encontrado na equipe ativa. Confira o nome ou retire a atribuição.',
  ambiguous_date: 'Informe uma data de entrega sem ambiguidade, incluindo dia, mês e ano.',
}
