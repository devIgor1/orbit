import { z } from 'zod'
import { passwordRequirements } from './password-policy'

export const registrationEmailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email('Informe um e-mail válido.'))

const passwordSchema = z
  .string()
  .max(72, 'Use até 72 caracteres.')
  .superRefine((value, context) => {
    for (const requirement of passwordRequirements) {
      if (!requirement.test(value)) context.addIssue({ code: 'custom', message: requirement.message })
    }
  })

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Informe seu nome completo.').max(100, 'Use até 100 caracteres.'),
    email: registrationEmailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas precisam ser iguais.',
    path: ['confirmPassword'],
  })
export type SignupValues = z.infer<typeof signupSchema>
