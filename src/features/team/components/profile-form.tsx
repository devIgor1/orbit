import { useState } from 'react'
import { Check, LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { errorMessage } from '@/lib/errors/app-error'
import type { Profile } from '@/lib/supabase/database.types'
import { useUpdateProfile } from '../hooks/use-team'
import { profileSchema, type ProfileValues } from '../schemas/profile-schema'

export function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const mutation = useUpdateProfile()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema), defaultValues: { full_name: profile.full_name, job_title: profile.job_title ?? '' },
  })

  async function onSubmit(values: ProfileValues) {
    setSubmitError(null)
    try { await mutation.mutateAsync({ ...values, job_title: values.job_title || null }); onSaved() }
    catch (error) { setSubmitError(errorMessage(error)) }
  }

  return <form className="profile-form" onSubmit={handleSubmit(onSubmit)} noValidate>
    <div className="profile-form-intro"><Avatar name={profile.full_name} src={profile.avatar_url} /><div><strong>Seu perfil no Orbit</strong><p>É assim que você aparece para sua equipe.</p></div></div>
    <div className="form-field"><label htmlFor="profile-name">Nome completo</label><Input id="profile-name" autoComplete="name" aria-invalid={Boolean(errors.full_name)} aria-describedby={errors.full_name ? 'profile-name-error' : undefined} {...register('full_name')} />{errors.full_name && <p className="field-error" id="profile-name-error">{errors.full_name.message}</p>}</div>
    <div className="form-field"><label htmlFor="profile-title">Cargo <span className="field-optional">(opcional)</span></label><Input id="profile-title" autoComplete="organization-title" placeholder="Ex.: Designer de produto" aria-invalid={Boolean(errors.job_title)} aria-describedby={errors.job_title ? 'profile-title-error' : undefined} {...register('job_title')} />{errors.job_title && <p className="field-error" id="profile-title-error">{errors.job_title.message}</p>}</div>
    {submitError && <p className="form-error" role="alert">{submitError}</p>}
    <div className="form-actions"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="loading-spinner" /> : <Check />}{mutation.isPending ? 'Salvando…' : 'Salvar alterações'}</Button></div>
  </form>
}
