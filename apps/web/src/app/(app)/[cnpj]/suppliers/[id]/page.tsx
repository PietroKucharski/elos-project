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
    <div className="max-w-[960px]">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <h1 className="text-[22px] font-semibold text-foreground">{supplier.name}</h1>
            <SupplierStatusBadge status={supplier.status} />
          </div>
          <p className="text-[13px] text-muted-foreground">
            {supplier.type === 'PJ' ? `CNPJ: ${supplier.cnpj}` : `CPF: ${supplier.cpf}`}
            {supplier.email && ` · ${supplier.email}`}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/suppliers/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
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
          <div className="mt-4 rounded-lg border border-border bg-card p-6">
            <div className="grid grid-cols-2 gap-5">
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
    <div className={fullWidth ? 'col-span-2' : undefined}>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value ?? '—'}</p>
    </div>
  )
}
