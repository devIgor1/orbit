import { z } from 'zod'

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Informe seu nome completo.').max(100, 'Use até 100 caracteres.'),
    email: z.email('Informe um e-mail válido.').trim().toLowerCase().max(254),
    password: z.string().min(8, 'Use pelo menos 8 caracteres.').max(72, 'Use até 72 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas precisam ser iguais.',
    path: ['confirmPassword'],
  })
export type SignupValues = z.infer<typeof signupSchema>
