// Matches Supabase Auth's lower_upper_letters_digits_symbols policy.
// Spaces and letters with accents alone do not satisfy the symbol requirement.
const specialCharacters = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~'

export const passwordRequirements = [
  {
    id: 'length',
    label: 'Pelo menos 8 caracteres',
    message: 'Use pelo menos 8 caracteres.',
    test: (value: string) => value.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Uma letra maiúscula (A–Z)',
    message: 'Inclua pelo menos uma letra maiúscula (A–Z).',
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: 'lowercase',
    label: 'Uma letra minúscula (a–z)',
    message: 'Inclua pelo menos uma letra minúscula (a–z).',
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: 'number',
    label: 'Um número (0–9)',
    message: 'Inclua pelo menos um número (0–9).',
    test: (value: string) => /[0-9]/.test(value),
  },
  {
    id: 'symbol',
    label: 'Um caractere especial, como ! @ #',
    message: 'Inclua pelo menos um caractere especial, como !, @ ou #.',
    test: (value: string) => [...value].some((character) => specialCharacters.includes(character)),
  },
] as const

export const passwordPolicyMessage =
  'Use pelo menos 8 caracteres, com uma letra maiúscula, uma minúscula, um número e um caractere especial.'
