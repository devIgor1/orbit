import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(180, 'Use até 180 caracteres.'),
  description: z.string().trim().max(5000, 'Use até 5.000 caracteres.'),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  assignee_id: z.string(),
  due_date: z.string(),
})

export type TaskFormValues = z.infer<typeof taskSchema>

export const taskStatusLabels = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluído',
} as const

export const taskPriorityLabels = { low: 'Baixa', medium: 'Média', high: 'Alta' } as const

export const taskStatuses = ['todo', 'in_progress', 'review', 'done'] as const
