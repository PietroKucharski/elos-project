// apps/web/src/app/(app)/admin/companies/new/page.tsx
import { CompanyForm } from '@/components/domain/company-form'

export default function NewCompanyPage() {
  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-semibold text-foreground">Nova Empresa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre um novo tenant na plataforma Elos.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6 shadow-card">
        <CompanyForm mode="create" />
      </div>
    </div>
  )
}
