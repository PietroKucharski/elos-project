import { Button } from '@/components/ui/button'
import { getAllCompaniesServer } from '@/lib/api'
// apps/web/src/app/(app)/admin/companies/page.tsx
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function AdminCompaniesPage() {
  const companies = await getAllCompaniesServer()

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '0 16px 10px',
    fontSize: 11.5,
    fontWeight: 600,
    color: 'hsl(215 16% 47%)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid hsl(214 32% 91%)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '13px 16px',
    borderBottom: '1px solid hsl(214 32% 91%)',
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 22,
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>Empresas</h1>
          <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
            {companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada
            {companies.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/companies/new">
            <Plus size={15} strokeWidth={1.5} style={{ marginRight: 6 }} />
            Nova Empresa
          </Link>
        </Button>
      </div>

      <div
        style={{
          background: 'hsl(0 0% 100%)',
          border: '1px solid hsl(214 32% 91%)',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 hsl(222 47% 11% / 0.05)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr>
              <th style={thStyle}>Razão Social</th>
              <th style={thStyle}>CNPJ</th>
              <th style={thStyle}>Cidade / UF</th>
              <th style={thStyle}>Criada em</th>
              <th style={{ ...thStyle, width: 96 }} />
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: 'hsl(215 16% 47%)',
                    fontSize: 14,
                  }}
                >
                  Nenhuma empresa cadastrada.
                </td>
              </tr>
            )}
            {companies.map((company) => (
              <tr key={company.id}>
                <td style={{ ...tdStyle, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
                  {company.name}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: 'hsl(215 16% 47%)',
                  }}
                >
                  {company.cnpj}
                </td>
                <td style={{ ...tdStyle, color: 'hsl(215 16% 47%)' }}>
                  {[company.city, company.state].filter(Boolean).join(' / ') || '—'}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: 'hsl(215 16% 47%)',
                  }}
                >
                  {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
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
