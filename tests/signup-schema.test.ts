import { describe, expect, it } from 'vitest'
import { signupSchema } from '@/features/auth/schemas/signup-schema'

function parsePassword(password: string) {
  return signupSchema.safeParse({
    fullName: 'Pessoa Teste',
    email: 'pessoa@example.test',
    password,
    confirmPassword: password,
  })
}

describe('Política de senha do cadastro', () => {
  it.each([
    ['Abcde1!', '8 caracteres'],
    ['abcdefgh1!', 'maiúscula'],
    ['ABCDEFGH1!', 'minúscula'],
    ['Abcdefgh!', 'número'],
    ['Abcdefgh1', 'especial'],
    ['Abcdefg1 ', 'especial'],
    ['Abcdefg1é', 'especial'],
    ['Abcdefg1🔒', 'especial'],
    ['A1!' + 'a'.repeat(70), '72 caracteres'],
  ])('recusa senha que não atende a %s', (password, message) => {
    const result = parsePassword(password)
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ['password'], message: expect.stringContaining(message) }),
      )
  })

  it.each(['Abcdef1!', 'A1!' + 'a'.repeat(69), '  Abcde1!  ', 'Abcdef1:', 'Abcdef1\\', 'Abcdef1~'])(
    'aceita senha válida sem alterar seu conteúdo',
    (password) => {
      const result = parsePassword(password)
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.password).toBe(password)
    },
  )
})
