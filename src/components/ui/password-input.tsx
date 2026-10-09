import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & { visibilityLabel?: string }

export function PasswordInput({ id, disabled, visibilityLabel = 'senha', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const toggleLabel = `${visible ? 'Ocultar' : 'Mostrar'} ${visibilityLabel}`

  return (
    <div className="password-field">
      <Input {...props} id={id} disabled={disabled} type={visible ? 'text' : 'password'} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="password-toggle"
        aria-label={toggleLabel}
        title={toggleLabel}
        aria-controls={id}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  )
}
