import { Check, Circle } from 'lucide-react'
import { passwordRequirements } from '../schemas/password-policy'

export function PasswordRequirements({ id, value }: { id: string; value: string }) {
  return (
    <ul id={id} className="password-requirements" aria-label="Requisitos da senha">
      {passwordRequirements.map((requirement) => {
        const met = requirement.test(value)
        return (
          <li key={requirement.id} data-met={met}>
            {met ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
            <span>
              {requirement.label}
              <span className="sr-only">: {met ? 'atendido' : 'pendente'}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
