// apps/web/src/app/(app)/[cnpj]/suppliers/[id]/page.tsx
import { SupplierBankAccountsPanel } from '@/components/domain/supplier-bank-accounts-panel'
import { SupplierContactsPanel } from '@/components/domain/supplier-contacts-panel'
import { SupplierStatusBadge } from '@/components/domain/supplier-status-badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getMyCompaniesServer,
  getSupplierBankAccountsServer,
  getSupplierContactsServer,
  getSupplierServer,
} from '@/lib/api'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function SupplierDetailPage({ params }: Props) {
  const { cnpj, id } = await params

  const [supplier, contacts, bankAccounts, myCompanies] = await Promise.all([
    getSupplierServer(cnpj, id),
    getSupplierContactsServer(cnpj, id),
    getSupplierBankAccountsServer(cnpj, id),
    getMyCompaniesServer(),
  ])

  if (!supplier) notFound()

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? ''
  const canMutate = MUTATE_ROLES.includes(role)

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
              {supplier.name}
            </h1>
            <SupplierStatusBadge status={supplier.status} />
          </div>
          <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)' }}>
            {supplier.type === 'PJ' ? `CNPJ: ${supplier.cnpj}` : `CPF: ${supplier.cpf}`}
            {supplier.email && ` · ${supplier.email}`}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/suppliers/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil style={{ width: 14, height: 14, marginRight: 6 }} />
              Editar
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="bank-accounts">Contas Bancárias</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div
            style={{
              background: 'white',
              borderRadius: '0.5rem',
              border: '1px solid hsl(214 32% 91%)',
              padding: 24,
              marginTop: 16,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <InfoField label="Telefone" value={supplier.phone} />
              <InfoField label="Avaliação" value={supplier.rating ? `${supplier.rating}/5` : '—'} />
              {supplier.address && (
                <InfoField
                  label="Endereço"
                  value={[
                    `${supplier.address.street}, ${supplier.address.number}`,
                    supplier.address.complement,
                    `${supplier.address.city}/${supplier.address.state}`,
                    `CEP ${supplier.address.zipCode}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  fullWidth
                />
              )}
              {supplier.notes && <InfoField label="Observações" value={supplier.notes} fullWidth />}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <SupplierContactsPanel
            cnpj={cnpj}
            supplierId={id}
            initialContacts={contacts}
            canMutate={canMutate}
          />
        </TabsContent>

        <TabsContent value="bank-accounts">
          <SupplierBankAccountsPanel
            cnpj={cnpj}
            supplierId={id}
            initialAccounts={bankAccounts}
            canMutate={canMutate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoField({
  label,
  value,
  fullWidth,
}: {
  label: string
  value: string | null | undefined
  fullWidth?: boolean
}) {
  return (
    <div style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <p style={{ fontSize: 12, color: 'hsl(215 16% 47%)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, color: 'hsl(222 47% 11%)' }}>{value ?? '—'}</p>
    </div>
  )
}
