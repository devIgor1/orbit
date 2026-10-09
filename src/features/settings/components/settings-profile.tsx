import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ProfileForm } from '@/features/team/components/profile-form'
import type { Profile } from '@/lib/supabase/database.types'
import { SettingsSection } from './settings-section'

export function SettingsProfile({ profile, email }: { profile: Profile; email?: string }) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <SettingsSection title="Meu perfil" description="Como sua equipe encontra você no Orbit.">
      <div className="settings-identity">
        <Avatar name={profile.full_name} src={profile.avatar_url} />
        <div className="settings-identity-copy">
          <h3 title={profile.full_name}>{profile.full_name}</h3>
          <p>{profile.job_title || 'Adicione seu cargo ao perfil'}</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (next) setSaved(false)
          }}
          title="Editar meu perfil"
          description="Seu nome e cargo aparecem para as equipes das suas empresas."
          trigger={
            <Button variant="outline">
              <Pencil /> Editar perfil
            </Button>
          }
        >
          <ProfileForm
            profile={profile}
            onSaved={() => {
              setOpen(false)
              setSaved(true)
            }}
          />
        </Dialog>
      </div>
      {email && (
        <dl className="settings-account-email">
          <dt>E-mail de acesso</dt>
          <dd>{email}</dd>
        </dl>
      )}
      {saved && (
        <p role="status" className="success-notice">
          Seu perfil foi atualizado.
        </p>
      )}
    </SettingsSection>
  )
}
