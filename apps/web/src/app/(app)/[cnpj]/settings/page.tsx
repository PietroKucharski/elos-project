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

  const cardClass = 'rounded-lg border border-border bg-card p-5 shadow-card'

  return (
    <div>
      {/* Page header */}
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-semibold text-foreground">Configurações da Empresa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dados cadastrais e identidade da empresa.
        </p>
      </div>

      {/* Two-column layout (identical to protótipo Settings page) */}
      <div className="grid grid-cols-[260px_1fr] items-start gap-5">
        {/* Left: Logo card */}
        <div className={cardClass}>
          <div className="mb-3.5 text-[15.5px] font-semibold text-foreground">Logo</div>
          <div className="flex flex-col items-center gap-3.5">
            {/* Avatar placeholder com inicial da empresa */}
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-primary-soft-border bg-primary-soft text-[34px] font-bold text-primary">
              {company?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <Upload size={14} strokeWidth={1.5} className="mr-1.5" />
              Enviar logo
            </Button>
            <p className="text-center text-[11.5px] leading-normal text-muted-foreground">
              PNG ou SVG, até 2 MB.
              <br />
              Recomendado 256×256px.
            </p>
          </div>
        </div>

        {/* Right: form card */}
        <div className={cardClass}>
          <div className="mb-[18px] flex items-center justify-between">
            <span className="text-[15.5px] font-semibold text-foreground">Dados cadastrais</span>
          </div>
          <CompanyForm mode="edit" cnpj={cnpj} defaultValues={defaults} />
        </div>
      </div>
    </div>
  )
}
