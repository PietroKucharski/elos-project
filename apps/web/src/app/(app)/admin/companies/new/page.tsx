// apps/web/src/app/(app)/admin/companies/new/page.tsx
import { CompanyForm } from '@/components/domain/company-form'

export default function NewCompanyPage() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>Nova Empresa</h1>
        <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
          Cadastre um novo tenant na plataforma Elos.
        </p>
      </div>
      <div
        style={{
          background: 'hsl(0 0% 100%)',
          border: '1px solid hsl(214 32% 91%)',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 hsl(222 47% 11% / 0.05)',
          padding: 24,
        }}
      >
        <CompanyForm mode="create" />
      </div>
    </div>
  )
}
