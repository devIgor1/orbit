import { z } from 'zod'

export const projectSchema = z.object({
  title: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(120, 'Use até 120 caracteres.'),
  description: z.string().trim().max(2000, 'Use até 2.000 caracteres.'),
  status: z.enum(['active', 'paused', 'completed', 'archived']),
  due_date: z.string(),
})

export type ProjectFormValues = z.infer<typeof projectSchema>
export const projectStatuses = ['active', 'paused', 'completed', 'archived'] as const

export const projectStatusLabels = {
  active: 'Em andamento',
  paused: 'Em pausa',
  completed: 'Concluído',
  archived: 'Arquivado',
} as const
