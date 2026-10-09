import { useMutation } from '@tanstack/react-query'
import { signUp } from '../services/signup-service'
import type { SignupValues } from '../schemas/signup-schema'

export function useSignup(destination: string) {
  return useMutation({ mutationFn: (values: SignupValues) => signUp(values, destination) })
}
