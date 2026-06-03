import { Button } from '@/components/ui/button'
import { getAllCompaniesServer } from '@/lib/api'
import { cn } from '@/lib/utils'
// apps/web/src/app/(app)/admin/companies/page.tsx
import { Plus } from 'lucide-react'
import Link from 'next/link'

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'
const TD = 'border-b border-border px-4 py-[13px]'

export default async function AdminCompaniesPage() {
  const companies = await getAllCompaniesServer()

  return (
    <div>
      <div className="mb-[22px] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada
            {companies.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/companies/new">
            <Plus size={15} strokeWidth={1.5} className="mr-1.5" />
            Nova Empresa
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className={TH}>Razão Social</th>
              <th className={TH}>CNPJ</th>
              <th className={TH}>Cidade / UF</th>
              <th className={TH}>Criada em</th>
              <th className={cn(TH, 'w-24')} />
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Nenhuma empresa cadastrada.
                </td>
              </tr>
            )}
            {companies.map((company) => (
              <tr key={company.id}>
                <td className={cn(TD, 'font-semibold text-foreground')}>{company.name}</td>
                <td className={cn(TD, 'font-mono text-[13px] text-muted-foreground')}>
                  {company.cnpj}
                </td>
                <td className={cn(TD, 'text-muted-foreground')}>
                  {[company.city, company.state].filter(Boolean).join(' / ') || '—'}
                </td>
                <td className={cn(TD, 'font-mono text-[13px] text-muted-foreground')}>
                  {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className={cn(TD, 'text-right')}>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${company.cnpj}/dashboard`}>Acessar</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
