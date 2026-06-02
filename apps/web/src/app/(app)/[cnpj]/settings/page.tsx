import { CompanyForm } from '@/components/domain/company-form'
import { Button } from '@/components/ui/button'
import { getCompanyServer } from '@/lib/api'
// apps/web/src/app/(app)/[cnpj]/settings/page.tsx
import type { CreateCompanyDto } from '@elos/shared'
import { Upload } from 'lucide-react'

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function SettingsPage({ params }: Props) {
  const { cnpj } = await params
  const company = await getCompanyServer(cnpj)

  // A resposta da API traz campos `nullable`; o form espera `Partial<CreateCompanyDto>`
  // (opcionais como `string | undefined`), então convertemos null → undefined.
  const defaults: Partial<CreateCompanyDto> | undefined = company
    ? {
        name: company.name,
        tradeName: company.tradeName ?? undefined,
        email: company.email ?? undefined,
        phone: company.phone ?? undefined,
        street: company.street ?? undefined,
        number: company.number ?? undefined,
        complement: company.complement ?? undefined,
        city: company.city ?? undefined,
        state: company.state ?? undefined,
        zipCode: company.zipCode ?? undefined,
      }
    : undefined

  const cardStyle: React.CSSProperties = {
    background: 'hsl(0 0% 100%)',
    border: '1px solid hsl(214 32% 91%)',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px 0 hsl(222 47% 11% / 0.05)',
    padding: 20,
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
          Configurações da Empresa
        </h1>
        <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
          Dados cadastrais e identidade da empresa.
        </p>
      </div>

      {/* Two-column layout (identical to protótipo Settings page) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left: Logo card */}
        <div style={cardStyle}>
          <div
            style={{
              fontSize: 15.5,
              fontWeight: 600,
              marginBottom: 14,
              color: 'hsl(222 47% 11%)',
            }}
          >
            Logo
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {/* Avatar placeholder com inicial da empresa */}
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '0.75rem',
                background: 'hsl(243 75% 96%)',
                color: 'hsl(243 75% 59%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 34,
                fontWeight: 700,
                border: '1px solid hsl(243 60% 88%)',
              }}
            >
              {company?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <Upload size={14} strokeWidth={1.5} style={{ marginRight: 6 }} />
              Enviar logo
            </Button>
            <p
              style={{
                fontSize: 11.5,
                color: 'hsl(215 16% 47%)',
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              PNG ou SVG, até 2 MB.
              <br />
              Recomendado 256×256px.
            </p>
          </div>
        </div>

        {/* Right: form card */}
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <span style={{ fontSize: 15.5, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
              Dados cadastrais
            </span>
          </div>
          <CompanyForm mode="edit" cnpj={cnpj} defaultValues={defaults} />
        </div>
      </div>
    </div>
  )
}
