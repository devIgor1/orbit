import { CompanyForm } from '@/features/companies/components/company-form'
import { ErrorState } from '@/components/shared/query-state'
import { useCreateOnboardingCompany } from '../hooks/use-create-onboarding-company'

export function CompanyStep() {
  const create = useCreateOnboardingCompany()
  return (
    <>
      {create.isError && <ErrorState error={create.error} />}
      <CompanyForm busy={create.isPending} onCreate={async (name) => {
        try {
          await create.mutateAsync(name)
        } catch {
          // Keep the typed name; the mutation error is shown above.
        }
      }} />
    </>
  )
}
